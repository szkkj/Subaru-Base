"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaNoiseSession = void 0;
const _crypto_1 = require("../../crypto");
const ConsoleLogger_1 = require("../../infra/log/ConsoleLogger");
const _proto_1 = require("../../proto");
const constants_1 = require("../../protocol/constants");
const constants_2 = require("../noise/constants");
const WaClientPayload_1 = require("../noise/WaClientPayload");
const WaFrameCodec_1 = require("../noise/WaFrameCodec");
const WaNoiseCert_1 = require("../noise/WaNoiseCert");
const WaNoiseHandshake_1 = require("../noise/WaNoiseHandshake");
const bytes_1 = require("../../util/bytes");
const primitives_1 = require("../../util/primitives");
function resolvePayload(payload) {
    if (payload instanceof Uint8Array) {
        return Promise.resolve(payload);
    }
    return Promise.resolve(payload());
}
async function resolveHandshakePayload(config) {
    if (config.isRegistered) {
        if (config.loginPayload) {
            return resolvePayload(config.loginPayload);
        }
        if (config.loginPayloadConfig) {
            return (0, WaClientPayload_1.buildLoginPayload)(config.loginPayloadConfig);
        }
        throw new Error('noise login payload is missing');
    }
    if (config.registrationPayload) {
        return resolvePayload(config.registrationPayload);
    }
    if (config.registrationPayloadConfig) {
        return (0, WaClientPayload_1.buildRegistrationPayload)(config.registrationPayloadConfig);
    }
    throw new Error('noise registration payload is missing');
}
function buildRoutingInfoPrefix(routingInfo) {
    const prefix = new Uint8Array(2 + 2 + 1 + 2 + routingInfo.length);
    prefix[0] = 0x45; // E
    prefix[1] = 0x44; // D
    prefix[2] = 0x00;
    prefix[3] = 0x01;
    prefix[4] = (routingInfo.length >> 16) & 0xff;
    prefix[5] = (routingInfo.length >> 8) & 0xff;
    prefix[6] = routingInfo.length & 0xff;
    prefix.set(routingInfo, 7);
    return prefix;
}
class WaNoiseSession {
    constructor(sendWire, logger = new ConsoleLogger_1.ConsoleLogger('info')) {
        this.writeChain = Promise.resolve();
        this.frameCodec = null;
        this.handshakeInbox = [];
        this.handshakeInboxHead = 0;
        this.handshakeWaiter = null;
        this.handshakeRejecter = null;
        this.pendingDecryptedFrames = [];
        this.closedError = null;
        this.noiseSocket = null;
        this.serverStaticKey = null;
        this.trustedRootCa = undefined;
        this.handshakeFrameTimeoutMs = constants_1.WA_DEFAULTS.CONNECT_TIMEOUT_MS;
        this.sendWire = sendWire;
        this.logger = logger;
    }
    async start(config) {
        this.reset();
        this.logger.debug('noise session start', {
            isRegistered: config.isRegistered,
            hasServerStaticKey: !!config.serverStaticKey
        });
        const protocolHeader = config.protocolHeader ?? constants_2.WA_PROTO_HEADER;
        const introFrame = config.routingInfo && config.routingInfo.length > 0
            ? (0, bytes_1.concatBytes)([buildRoutingInfoPrefix(config.routingInfo), protocolHeader])
            : protocolHeader;
        this.frameCodec = new WaFrameCodec_1.WaFrameCodec(introFrame);
        const [ephemeralKeyPair, payload] = await Promise.all([
            _crypto_1.X25519.generateKeyPair(),
            resolveHandshakePayload(config)
        ]);
        const verifyCertificates = config.verifyCertificateChain !== false;
        this.trustedRootCa = config.trustedRootCa;
        if (config.serverStaticKey && config.serverStaticKey.length === 32) {
            this.logger.debug('noise session attempting resume handshake (IK)');
            this.noiseSocket = await this.resumeHandshake(config.serverStaticKey, config.clientStaticKeyPair, ephemeralKeyPair, payload, protocolHeader, verifyCertificates);
            await this.decodeBufferedPostHandshakeFrames();
            this.logger.info('noise session established', { mode: 'resume_or_fallback' });
            return;
        }
        this.logger.debug('noise session starting full handshake (XX)');
        this.noiseSocket = await this.fullHandshake(config.clientStaticKeyPair, ephemeralKeyPair, payload, protocolHeader, verifyCertificates);
        await this.decodeBufferedPostHandshakeFrames();
        this.logger.info('noise session established', { mode: 'full' });
    }
    encryptFrame(frame) {
        const socket = this.noiseSocket;
        const codec = this.frameCodec;
        if (!socket || !codec) {
            return Promise.reject(new Error('noise session is not established'));
        }
        const result = this.writeChain.then(() => codec.encodeFrame(socket.encrypt(frame)));
        this.writeChain = result.then(() => { }, () => { });
        return result;
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async pushWireChunk(chunk) {
        const codec = this.frameCodec;
        if (!codec) {
            return [];
        }
        const out = [];
        if (this.pendingDecryptedFrames.length > 0) {
            for (let i = 0; i < this.pendingDecryptedFrames.length; i += 1) {
                out.push(this.pendingDecryptedFrames[i]);
            }
            this.pendingDecryptedFrames = [];
        }
        const frames = codec.pushWireChunk(chunk);
        if (!this.noiseSocket) {
            for (const frame of frames) {
                const waiter = this.handshakeWaiter;
                const rejecter = this.handshakeRejecter;
                if (waiter && rejecter) {
                    this.handshakeWaiter = null;
                    this.handshakeRejecter = null;
                    waiter(frame);
                    continue;
                }
                this.handshakeInbox.push(frame);
            }
            return out;
        }
        if (frames.length > 0) {
            const decrypted = this.decryptFramesBatch(this.noiseSocket, frames);
            for (let i = 0; i < decrypted.length; i++) {
                out.push(decrypted[i]);
            }
        }
        return out;
    }
    onSocketClosed(error) {
        const closeError = error ?? new Error('noise session socket closed');
        this.logger.debug('noise session socket closed', { message: closeError.message });
        this.closedError = closeError;
        const rejecter = this.handshakeRejecter;
        if (rejecter) {
            this.handshakeRejecter = null;
            this.handshakeWaiter = null;
            rejecter(closeError);
        }
    }
    decryptFramesBatch(socket, frames) {
        const out = new Array(frames.length);
        for (let i = 0; i < frames.length; i++) {
            out[i] = socket.decrypt(frames[i]);
        }
        return out;
    }
    reset() {
        this.logger.trace('noise session reset');
        this.frameCodec = null;
        this.handshakeInbox.length = this.handshakeInboxHead = 0;
        this.handshakeWaiter = null;
        this.handshakeRejecter = null;
        this.pendingDecryptedFrames = [];
        this.closedError = null;
        this.noiseSocket = null;
        this.serverStaticKey = null;
        this.trustedRootCa = undefined;
        this.writeChain = Promise.resolve();
    }
    getServerStaticKey() {
        return this.serverStaticKey;
    }
    async fullHandshake(clientStaticKeyPair, ephemeralKeyPair, payload, protocolHeader, verifyCertificates) {
        this.logger.trace('noise full handshake: send client hello');
        const handshake = new WaNoiseHandshake_1.WaNoiseHandshake();
        handshake.start(constants_2.NOISE_XX_NAME, protocolHeader);
        handshake.authenticate(ephemeralKeyPair.pubKey);
        const clientHello = _proto_1.proto.HandshakeMessage.encode({
            clientHello: {
                ephemeral: ephemeralKeyPair.pubKey
            }
        }).finish();
        const serverHello = await this.sendAndReceiveHandshakeFrame(clientHello);
        return this.continueFullHandshake(handshake, serverHello, clientStaticKeyPair, ephemeralKeyPair, payload, verifyCertificates);
    }
    async resumeHandshake(serverStaticKey, clientStaticKeyPair, ephemeralKeyPair, payload, protocolHeader, verifyCertificates) {
        const resumeResult = await this.tryResumeHandshakeWithIk(serverStaticKey, clientStaticKeyPair, ephemeralKeyPair, payload, protocolHeader);
        if (resumeResult.socket) {
            return resumeResult.socket;
        }
        this.logger.debug('noise resume handshake fallback to XX');
        return this.resumeHandshakeWithFallback(clientStaticKeyPair, ephemeralKeyPair, payload, protocolHeader, resumeResult.serverHelloFrame, verifyCertificates);
    }
    async tryResumeHandshakeWithIk(serverStaticKey, clientStaticKeyPair, ephemeralKeyPair, payload, protocolHeader) {
        this.logger.trace('noise resume handshake: send IK client hello');
        const handshake = new WaNoiseHandshake_1.WaNoiseHandshake();
        handshake.start(constants_2.NOISE_IK_NAME, protocolHeader);
        handshake.authenticate(serverStaticKey);
        handshake.authenticate(ephemeralKeyPair.pubKey);
        const [agreement1, agreement2] = await Promise.all([
            _crypto_1.X25519.scalarMult(ephemeralKeyPair.privKey, serverStaticKey),
            _crypto_1.X25519.scalarMult(clientStaticKeyPair.privKey, serverStaticKey)
        ]);
        handshake.mixIntoKey(agreement1);
        const encryptedClientStatic = handshake.encrypt(clientStaticKeyPair.pubKey);
        handshake.mixIntoKey(agreement2);
        const encryptedPayload = handshake.encrypt(payload);
        const clientHello = _proto_1.proto.HandshakeMessage.encode({
            clientHello: {
                ephemeral: ephemeralKeyPair.pubKey,
                payload: encryptedPayload,
                static: encryptedClientStatic
            }
        }).finish();
        const serverHelloFrame = await this.sendAndReceiveHandshakeFrame(clientHello);
        const parsed = _proto_1.proto.HandshakeMessage.decode(serverHelloFrame);
        const serverHello = parsed.serverHello;
        if (!serverHello) {
            throw new Error('noise resume handshake missing serverHello');
        }
        if (serverHello.static) {
            return { socket: null, serverHelloFrame };
        }
        if (!serverHello.ephemeral) {
            throw new Error('noise resume handshake missing server ephemeral');
        }
        if (!serverHello.payload) {
            throw new Error('noise resume handshake missing certificate payload');
        }
        const serverEphemeral = serverHello.ephemeral;
        handshake.authenticate(serverEphemeral);
        const [dh1, dh2] = await Promise.all([
            _crypto_1.X25519.scalarMult(ephemeralKeyPair.privKey, serverEphemeral),
            _crypto_1.X25519.scalarMult(clientStaticKeyPair.privKey, serverEphemeral)
        ]);
        handshake.mixIntoKey(dh1);
        handshake.mixIntoKey(dh2);
        handshake.decrypt(serverHello.payload);
        this.serverStaticKey = serverStaticKey;
        this.logger.debug('noise resume handshake successful without fallback');
        return { socket: handshake.finish(), serverHelloFrame: null };
    }
    async resumeHandshakeWithFallback(clientStaticKeyPair, ephemeralKeyPair, payload, protocolHeader, serverHelloFrame, verifyCertificates) {
        const fallback = new WaNoiseHandshake_1.WaNoiseHandshake();
        fallback.start(constants_2.NOISE_XX_FALLBACK_NAME, protocolHeader);
        fallback.authenticate(ephemeralKeyPair.pubKey);
        return this.continueFullHandshake(fallback, serverHelloFrame, clientStaticKeyPair, ephemeralKeyPair, payload, verifyCertificates);
    }
    async continueFullHandshake(handshake, serverHelloFrame, clientStaticKeyPair, ephemeralKeyPair, payload, verifyCertificates) {
        this.logger.trace('noise continue full handshake');
        const parsed = _proto_1.proto.HandshakeMessage.decode(serverHelloFrame);
        const serverHello = parsed.serverHello;
        if (!serverHello?.ephemeral || !serverHello.static || !serverHello.payload) {
            throw new Error('noise full handshake missing server hello fields');
        }
        const serverEphemeral = serverHello.ephemeral;
        handshake.authenticate(serverEphemeral);
        handshake.mixIntoKey(await _crypto_1.X25519.scalarMult(ephemeralKeyPair.privKey, serverEphemeral));
        const serverStatic = handshake.decrypt(serverHello.static);
        handshake.mixIntoKey(await _crypto_1.X25519.scalarMult(ephemeralKeyPair.privKey, serverStatic));
        const certificate = handshake.decrypt(serverHello.payload);
        if (verifyCertificates) {
            await (0, WaNoiseCert_1.verifyNoiseCertificateChain)(certificate, serverStatic, this.trustedRootCa);
            this.logger.trace('noise certificate chain verified');
        }
        this.serverStaticKey = serverStatic;
        const encryptedClientStatic = handshake.encrypt(clientStaticKeyPair.pubKey);
        handshake.mixIntoKey(await _crypto_1.X25519.scalarMult(clientStaticKeyPair.privKey, serverEphemeral));
        const encryptedPayload = handshake.encrypt(payload);
        const clientFinish = _proto_1.proto.HandshakeMessage.encode({
            clientFinish: {
                static: encryptedClientStatic,
                payload: encryptedPayload
            }
        }).finish();
        await this.sendHandshakeFrame(clientFinish);
        this.logger.trace('noise full handshake client finish sent');
        return handshake.finish();
    }
    async sendHandshakeFrame(frame) {
        const codec = this.frameCodec;
        if (!codec) {
            throw new Error('noise frame codec is not initialized');
        }
        this.logger.trace('noise send handshake frame', { byteLength: frame.byteLength });
        await this.sendWire(codec.encodeFrame(frame));
    }
    async sendAndReceiveHandshakeFrame(frame) {
        await this.sendHandshakeFrame(frame);
        return this.waitHandshakeFrame();
    }
    async waitHandshakeFrame() {
        if (this.closedError) {
            throw this.closedError;
        }
        const queued = this.handshakeInboxHead < this.handshakeInbox.length
            ? this.handshakeInbox[this.handshakeInboxHead++]
            : undefined;
        if (queued) {
            if (this.handshakeInboxHead === this.handshakeInbox.length) {
                this.handshakeInbox.length = this.handshakeInboxHead = 0;
            }
            this.logger.trace('noise handshake frame consumed from queue');
            return queued;
        }
        this.logger.trace('noise waiting handshake frame');
        return new Promise((resolve, reject) => {
            if (this.closedError) {
                reject(this.closedError);
                return;
            }
            const timeout = setTimeout(() => {
                if (this.handshakeWaiter === resolve) {
                    this.handshakeWaiter = null;
                    this.handshakeRejecter = null;
                }
                reject(new Error(`noise handshake frame timeout after ${this.handshakeFrameTimeoutMs}ms`));
            }, this.handshakeFrameTimeoutMs);
            timeout.unref?.();
            this.handshakeWaiter = (frame) => {
                clearTimeout(timeout);
                resolve(frame);
            };
            this.handshakeRejecter = (error) => {
                clearTimeout(timeout);
                reject(error);
            };
        }).catch((error) => {
            throw (0, primitives_1.toError)(error);
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async decodeBufferedPostHandshakeFrames() {
        if (!this.noiseSocket || this.handshakeInboxHead >= this.handshakeInbox.length) {
            return;
        }
        this.logger.debug('decoding buffered post-handshake frames', {
            count: this.handshakeInbox.length - this.handshakeInboxHead
        });
        const start = this.handshakeInboxHead;
        const frames = this.handshakeInbox.slice(start);
        if (frames.length > 0) {
            const decrypted = this.decryptFramesBatch(this.noiseSocket, frames);
            for (let i = 0; i < decrypted.length; i++) {
                this.pendingDecryptedFrames.push(decrypted[i]);
            }
        }
        this.handshakeInbox.length = this.handshakeInboxHead = 0;
    }
}
exports.WaNoiseSession = WaNoiseSession;
