import http from 'node:http';
import https from 'node:https';
import { DEFAULT_MEDIA_HOSTS } from '../constants.js';
import { WaMediaCrypto } from '../crypto/WaMediaCrypto.js';
import { WA_DEFAULTS } from '../../protocol/constants.js';
import { EMPTY_BYTES, readAllBytes } from '../../util/bytes.js';
import { toError } from '../../util/primitives.js';
function normalizeHeaderRecord(headers) {
    if (!headers) {
        return {};
    }
    const normalized = {};
    for (const key in headers) {
        normalized[key.toLowerCase()] = headers[key];
    }
    return normalized;
}
/**
 * Streaming media uploader/downloader. Handles host failover, encryption
 * (`WaMediaCrypto`), and MAC verification. Used internally by the message
 * coordinator and exposed for direct media transfer use cases.
 */
export class WaMediaTransferClient {
    constructor(options = {}) {
        this.logger = options.logger;
        this.defaultHosts = options.defaultHosts ?? DEFAULT_MEDIA_HOSTS;
        this.defaultTimeoutMs = options.defaultTimeoutMs ?? WA_DEFAULTS.MEDIA_TIMEOUT_MS;
        this.defaultMaxReadBytes = options.defaultMaxReadBytes;
        this.defaultHeaders = normalizeHeaderRecord(options.defaultHeaders);
        this.defaultUploadAgent = options.defaultUploadAgent;
        this.defaultDownloadAgent = options.defaultDownloadAgent;
        this.skipMacVerification = options.skipMacVerification === true;
    }
    /**
     * Streams an encrypted media payload from the first responsive media host.
     * Returns the raw transfer response – caller is responsible for piping the body.
     */
    async downloadStream(request) {
        const { urls, headers, timeoutMs } = this.resolveTransferRequest(request);
        const agent = request.agent ?? this.defaultDownloadAgent;
        this.logger?.debug('media download stream start', {
            urls: urls.length,
            timeoutMs
        });
        const result = await this.fetchWithFallback(urls, timeoutMs, request.signal, (url, signal) => this.httpRequest(url, { method: 'GET', headers, signal }, agent));
        this.logger?.trace('media download stream response', {
            url: result.url,
            status: result.status
        });
        return result;
    }
    /** Convenience wrapper: downloads the encrypted body and returns it as a Uint8Array. */
    async downloadBytes(request) {
        const response = await this.downloadStream(request);
        await this.assertSuccessfulResponse(response);
        if (!response.body) {
            return EMPTY_BYTES;
        }
        return readAllBytes(response.body, {
            maxBytes: request.maxBytes ?? this.defaultMaxReadBytes
        });
    }
    /**
     * Uploads a raw (already-encrypted or plaintext) body to the requested
     * media URL. Returns the server's transfer response unchanged.
     */
    async uploadStream(request) {
        const bodyIsBytes = request.body instanceof Uint8Array;
        const { urls, headers, timeoutMs } = this.resolveTransferRequest(request, {
            'content-type': request.contentType,
            'content-length': request.contentLength !== null && request.contentLength !== undefined
                ? String(request.contentLength)
                : undefined
        });
        const agent = request.agent ?? this.defaultUploadAgent;
        const uploadUrls = bodyIsBytes ? urls : urls.slice(0, 1);
        if (!bodyIsBytes && urls.length > 1) {
            this.logger?.warn('upload stream fallback disabled for non-replayable body', {
                attemptedHosts: urls.length
            });
        }
        const method = request.method ?? 'POST';
        this.logger?.debug('media upload stream start', {
            urls: uploadUrls.length,
            timeoutMs,
            method
        });
        const result = await this.fetchWithFallback(uploadUrls, timeoutMs, request.signal, (url, signal) => this.httpRequest(url, { method, headers, signal, body: request.body }, agent));
        this.logger?.trace('media upload stream response', {
            url: result.url,
            status: result.status
        });
        return result;
    }
    /**
     * Encrypts the plaintext body with the per-`mediaType` HKDF keys (a new
     * media key is generated when none is supplied) and uploads it. Returns
     * the upload response plus the derived key/hashes for the message stanza.
     */
    async uploadEncrypted(request) {
        this.logger?.info('media encrypted upload start', {
            mediaType: request.mediaType
        });
        const mediaKey = request.mediaKey ?? (await WaMediaCrypto.generateMediaKey());
        const prepared = await this.prepareEncryptedUpload(request, mediaKey);
        let transfer;
        try {
            transfer = await this.uploadStream({
                url: request.url,
                directPath: request.directPath,
                hosts: request.hosts,
                headers: request.headers,
                agent: request.agent,
                timeoutMs: request.timeoutMs,
                signal: request.signal,
                method: request.method,
                body: prepared.body,
                contentLength: prepared.contentLength,
                contentType: request.contentType
            });
        }
        catch (error) {
            await prepared.cleanup(toError(error));
            throw error;
        }
        const metadata = await prepared.metadata;
        this.logger?.info('media encrypted upload completed', {
            status: transfer.status
        });
        return {
            transfer,
            mediaKey,
            fileSha256: metadata.fileSha256,
            fileEncSha256: metadata.fileEncSha256,
            plaintextLength: metadata.plaintextLength
        };
    }
    /**
     * Downloads an encrypted media payload, decrypts it, and verifies the MAC
     * + file SHA-256s. Returns the decrypted bytes.
     */
    async downloadAndDecrypt(request) {
        this.logger?.info('media encrypted download start', {
            mediaType: request.mediaType
        });
        const decrypted = await this.downloadAndDecryptStream(request);
        try {
            const [plaintext] = await Promise.all([
                readAllBytes(decrypted.plaintext, {
                    maxBytes: request.maxBytes ?? this.defaultMaxReadBytes
                }),
                decrypted.metadata
            ]);
            this.logger?.info('media encrypted download completed', {
                byteLength: plaintext.byteLength
            });
            return plaintext;
        }
        catch (error) {
            decrypted.plaintext.destroy(toError(error));
            throw error;
        }
    }
    /**
     * Streaming variant of {@link downloadAndDecrypt}: returns a `plaintext`
     * Readable plus a `metadata` promise that resolves after the stream ends
     * with the verified hashes (or rejects on MAC/size failure).
     */
    async downloadAndDecryptStream(request) {
        const response = await this.downloadStream(request);
        await this.assertSuccessfulResponse(response);
        const body = this.requireResponseBody(response);
        const decrypted = await WaMediaCrypto.decryptReadable(body, {
            mediaType: request.mediaType,
            mediaKey: request.mediaKey,
            expectedFileSha256: request.fileSha256,
            expectedFileEncSha256: request.fileEncSha256,
            skipMacVerification: this.skipMacVerification
        });
        decrypted.metadata.catch(() => undefined);
        this.logger?.debug('media encrypted download stream ready', {
            mediaType: request.mediaType
        });
        return {
            plaintext: decrypted.plaintext,
            metadata: decrypted.metadata
        };
    }
    /** Drains a streaming response body to a Uint8Array (respects `maxBytes`). */
    async readResponseBytes(response, maxBytes) {
        if (!response.body) {
            return EMPTY_BYTES;
        }
        return readAllBytes(response.body, { maxBytes: maxBytes ?? this.defaultMaxReadBytes });
    }
    async httpRequest(url, init, agent) {
        const parsed = new URL(url);
        const transport = parsed.protocol === 'https:' ? https : http;
        return new Promise((resolve, reject) => {
            const req = transport.request(url, {
                method: init.method ?? 'GET',
                headers: init.headers,
                signal: init.signal ?? undefined,
                agent: agent ?? undefined
            }, (res) => {
                const status = res.statusCode ?? 500;
                const headers = {};
                for (const key in res.headers) {
                    const value = res.headers[key];
                    if (typeof value === 'string') {
                        headers[key] = value;
                    }
                    else if (Array.isArray(value)) {
                        headers[key] = value.join(', ');
                    }
                }
                resolve({
                    status,
                    ok: status >= 200 && status < 300,
                    headers,
                    body: res,
                    // eslint-disable-next-line @typescript-eslint/require-await
                    cancel: async () => {
                        res.destroy();
                    }
                });
            });
            req.on('error', (error) => reject(toError(error)));
            const body = init.body;
            if (body instanceof Uint8Array) {
                req.end(body);
            }
            else if (body) {
                body.on('error', (err) => req.destroy(toError(err)));
                body.pipe(req);
            }
            else {
                req.end();
            }
        });
    }
    resolveTransferRequest(request, extraHeaders) {
        const headers = { ...this.defaultHeaders };
        if (request.headers) {
            for (const key in request.headers) {
                headers[key.toLowerCase()] = request.headers[key];
            }
        }
        if (extraHeaders) {
            for (const key in extraHeaders) {
                const value = extraHeaders[key];
                if (value !== undefined) {
                    headers[key.toLowerCase()] = value;
                }
            }
        }
        return {
            urls: this.resolveUrls(request.url, request.directPath, request.hosts),
            headers,
            timeoutMs: request.timeoutMs ?? this.defaultTimeoutMs
        };
    }
    async prepareEncryptedUpload(request, mediaKey) {
        if (request.plaintext instanceof Uint8Array) {
            const encrypted = await WaMediaCrypto.encryptBytes(request.mediaType, mediaKey, request.plaintext);
            return {
                body: encrypted.ciphertextHmac,
                contentLength: encrypted.ciphertextHmac.byteLength,
                metadata: Promise.resolve({
                    fileSha256: encrypted.fileSha256,
                    fileEncSha256: encrypted.fileEncSha256,
                    plaintextLength: request.plaintext.byteLength
                }),
                // eslint-disable-next-line @typescript-eslint/require-await
                cleanup: async () => undefined
            };
        }
        const prepared = await WaMediaCrypto.encryptReadable(request.mediaType, mediaKey, request.plaintext, { expectedFileSize: request.contentLength ?? undefined });
        return {
            body: prepared.encrypted,
            contentLength: request.contentLength !== null && request.contentLength !== undefined
                ? WaMediaCrypto.encryptedLength(request.contentLength)
                : undefined,
            metadata: prepared.metadata,
            cleanup: async (error) => {
                prepared.encrypted.destroy(error);
                await prepared.metadata.catch(() => undefined);
            }
        };
    }
    async assertSuccessfulResponse(response) {
        if (response.ok) {
            return;
        }
        await this.drainBody(response.body);
        throw new Error(`download failed with status ${response.status} for ${response.url}`);
    }
    requireResponseBody(response) {
        if (response.body) {
            return response.body;
        }
        throw new Error(`download response body is empty for ${response.url}`);
    }
    resolveUrls(url, directPath, hosts) {
        const resolved = [];
        if (url && resolved.indexOf(url) === -1)
            resolved.push(url);
        if (directPath) {
            if (directPath.startsWith('https://') || directPath.startsWith('http://')) {
                if (resolved.indexOf(directPath) === -1)
                    resolved.push(directPath);
            }
            else {
                const normalizedPath = directPath.startsWith('/') ? directPath : `/${directPath}`;
                for (const host of hosts ?? this.defaultHosts) {
                    const candidate = `https://${host}${normalizedPath}`;
                    if (resolved.indexOf(candidate) === -1)
                        resolved.push(candidate);
                }
            }
        }
        if (resolved.length === 0) {
            throw new Error('missing transfer url/directPath');
        }
        return resolved;
    }
    async fetchWithFallback(urls, timeoutMs, signal, send) {
        let lastError = null;
        for (let index = 0; index < urls.length; index += 1) {
            const url = urls[index];
            const abort = this.createAbortContext(timeoutMs, signal);
            try {
                const response = await send(url, abort.signal);
                const shouldFallback = response.status >= 500 && index < urls.length - 1;
                if (!shouldFallback) {
                    return {
                        url,
                        status: response.status,
                        ok: response.ok,
                        headers: response.headers,
                        body: response.body
                    };
                }
                await response.cancel();
                this.logger?.warn('transfer fallback to next host', {
                    url,
                    status: response.status
                });
            }
            catch (error) {
                const normalized = toError(error);
                lastError = normalized;
                if (abort.signal.aborted && signal?.aborted) {
                    throw normalized;
                }
                if (index === urls.length - 1) {
                    throw normalized;
                }
                this.logger?.warn('transfer host failed, trying next host', {
                    url,
                    message: normalized.message
                });
            }
            finally {
                abort.cleanup();
            }
        }
        throw lastError ?? new Error('transfer failed');
    }
    createAbortContext(timeoutMs, externalSignal) {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            controller.abort(new Error(`transfer timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        timer.unref?.();
        let onExternalAbort = null;
        if (externalSignal) {
            onExternalAbort = () => controller.abort(externalSignal.reason);
            if (externalSignal.aborted) {
                onExternalAbort();
            }
            else {
                externalSignal.addEventListener('abort', onExternalAbort, { once: true });
            }
        }
        return {
            signal: controller.signal,
            cleanup: () => {
                clearTimeout(timer);
                if (externalSignal && onExternalAbort) {
                    externalSignal.removeEventListener('abort', onExternalAbort);
                }
            }
        };
    }
    async drainBody(body) {
        if (!body) {
            return;
        }
        try {
            for await (const chunk of body) {
                void chunk;
            }
        }
        catch {
            // ignore drain errors
        }
    }
}
