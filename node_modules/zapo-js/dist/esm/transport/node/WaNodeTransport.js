import { EventEmitter } from 'node:events';
import { ConsoleLogger } from '../../infra/log/ConsoleLogger.js';
import { decodeBinaryNodeStanza, encodeBinaryNodeStanza } from '../binary/index.js';
import { formatBinaryNodeAsXml } from '../node/xml.js';
import { toError } from '../../util/primitives.js';
/**
 * Bridges encoded binary stanzas to/from {@link WaComms}: encodes outbound
 * {@link BinaryNode}s into framed bytes, decodes incoming frames back into
 * nodes, and re-emits `node_in`/`node_out`/`frame_in`/`frame_out`/
 * `decode_error` events for debug observers.
 */
export class WaNodeTransport extends EventEmitter {
    constructor(logger = new ConsoleLogger('info')) {
        super();
        this.logger = logger;
        this.comms = null;
    }
    /** Attaches (or detaches with `null`) the {@link WaComms} instance used to write frames. */
    bindComms(comms) {
        this.comms = comms;
        this.logger.debug('node transport bindComms', { connected: comms !== null });
    }
    /** Encodes `node` as a stanza frame and writes it through the bound comms. Throws when not connected. */
    async sendNode(node) {
        const comms = this.comms;
        if (!comms) {
            throw new Error('comms is not connected');
        }
        this.logger.trace('node transport send node', {
            tag: node.tag,
            id: node.attrs.id,
            type: node.attrs.type,
            xml: this.shouldIncludeTraceXml() ? formatBinaryNodeAsXml(node) : undefined
        });
        const frame = encodeBinaryNodeStanza(node);
        this.emit('node_out', node, frame);
        this.emit('frame_out', frame);
        await comms.sendFrame(frame);
    }
    /**
     * Decodes an incoming frame and forwards the resulting {@link BinaryNode}
     * to `onNode`. Stream-end frames are silently dropped; decode errors are
     * logged and surfaced via the `decode_error` event without throwing.
     */
    async dispatchIncomingFrame(frame, onNode) {
        this.emit('frame_in', frame);
        let node;
        try {
            node = await decodeBinaryNodeStanza(frame);
        }
        catch (error) {
            const normalized = toError(error);
            if (normalized.message === 'stream end stanza is not a binary node') {
                return;
            }
            this.logger.warn('failed to decode binary node frame', {
                message: normalized.message
            });
            this.emit('decode_error', normalized, frame);
            return;
        }
        this.emit('node_in', node, frame);
        this.logger.trace('node transport node in', {
            tag: node.tag,
            id: node.attrs.id,
            type: node.attrs.type,
            xml: this.shouldIncludeTraceXml() ? formatBinaryNodeAsXml(node) : undefined
        });
        await onNode(node);
    }
    shouldIncludeTraceXml() {
        return this.logger.level === 'trace';
    }
}
