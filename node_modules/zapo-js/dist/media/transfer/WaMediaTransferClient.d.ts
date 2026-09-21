import type { Readable } from 'node:stream';
import type { MediaCryptoType, WaMediaReadableDecryptionResult, WaMediaTransferClientOptions } from '../types';
interface StreamDownloadRequest {
    readonly url?: string;
    readonly directPath?: string;
    readonly hosts?: readonly string[];
    readonly headers?: Readonly<Record<string, string>>;
    readonly agent?: WaMediaTransferClientOptions['defaultDownloadAgent'];
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
    readonly maxBytes?: number;
}
interface StreamUploadRequest extends StreamDownloadRequest {
    readonly method?: 'POST' | 'PUT';
    readonly body: Uint8Array | Readable;
    readonly contentLength?: number;
    readonly contentType?: string;
}
interface StreamTransferResponse {
    readonly url: string;
    readonly status: number;
    readonly ok: boolean;
    readonly headers: Readonly<Record<string, string>>;
    readonly body: Readable | null;
}
interface EncryptedUploadRequest extends StreamDownloadRequest {
    readonly mediaType: MediaCryptoType;
    readonly method?: 'POST' | 'PUT';
    readonly plaintext: Uint8Array | Readable;
    readonly mediaKey?: Uint8Array;
    readonly contentLength?: number;
    readonly contentType?: string;
}
interface EncryptedUploadResult {
    readonly transfer: StreamTransferResponse;
    readonly mediaKey: Uint8Array;
    readonly fileSha256: Uint8Array;
    readonly fileEncSha256: Uint8Array;
    readonly plaintextLength: number;
}
interface EncryptedDownloadRequest extends StreamDownloadRequest {
    readonly mediaType: MediaCryptoType;
    readonly mediaKey: Uint8Array;
    readonly fileSha256?: Uint8Array;
    readonly fileEncSha256?: Uint8Array;
}
/**
 * Streaming media uploader/downloader. Handles host failover, encryption
 * (`WaMediaCrypto`), and MAC verification. Used internally by the message
 * coordinator and exposed for direct media transfer use cases.
 */
export declare class WaMediaTransferClient {
    private readonly logger?;
    private readonly defaultHosts;
    private readonly defaultTimeoutMs;
    private readonly defaultMaxReadBytes;
    private readonly defaultHeaders;
    private readonly defaultUploadAgent;
    private readonly defaultDownloadAgent;
    private readonly skipMacVerification;
    constructor(options?: WaMediaTransferClientOptions);
    /**
     * Streams an encrypted media payload from the first responsive media host.
     * Returns the raw transfer response – caller is responsible for piping the body.
     */
    downloadStream(request: StreamDownloadRequest): Promise<StreamTransferResponse>;
    /** Convenience wrapper: downloads the encrypted body and returns it as a Uint8Array. */
    downloadBytes(request: StreamDownloadRequest): Promise<Uint8Array>;
    /**
     * Uploads a raw (already-encrypted or plaintext) body to the requested
     * media URL. Returns the server's transfer response unchanged.
     */
    uploadStream(request: StreamUploadRequest): Promise<StreamTransferResponse>;
    /**
     * Encrypts the plaintext body with the per-`mediaType` HKDF keys (a new
     * media key is generated when none is supplied) and uploads it. Returns
     * the upload response plus the derived key/hashes for the message stanza.
     */
    uploadEncrypted(request: EncryptedUploadRequest): Promise<EncryptedUploadResult>;
    /**
     * Downloads an encrypted media payload, decrypts it, and verifies the MAC
     * + file SHA-256s. Returns the decrypted bytes.
     */
    downloadAndDecrypt(request: EncryptedDownloadRequest): Promise<Uint8Array>;
    /**
     * Streaming variant of {@link downloadAndDecrypt}: returns a `plaintext`
     * Readable plus a `metadata` promise that resolves after the stream ends
     * with the verified hashes (or rejects on MAC/size failure).
     */
    downloadAndDecryptStream(request: EncryptedDownloadRequest): Promise<WaMediaReadableDecryptionResult>;
    /** Drains a streaming response body to a Uint8Array (respects `maxBytes`). */
    readResponseBytes(response: StreamTransferResponse, maxBytes?: number): Promise<Uint8Array>;
    private httpRequest;
    private resolveTransferRequest;
    private prepareEncryptedUpload;
    private assertSuccessfulResponse;
    private requireResponseBody;
    private resolveUrls;
    private fetchWithFallback;
    private createAbortContext;
    private drainBody;
}
export {};
