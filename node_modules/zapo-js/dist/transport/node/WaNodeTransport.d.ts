import { EventEmitter } from 'node:events';
import type { Logger } from '../../infra/log/types';
import type { BinaryNode } from '../types';
import type { WaComms } from '../WaComms';
/**
 * Bridges encoded binary stanzas to/from {@link WaComms}: encodes outbound
 * {@link BinaryNode}s into framed bytes, decodes incoming frames back into
 * nodes, and re-emits `node_in`/`node_out`/`frame_in`/`frame_out`/
 * `decode_error` events for debug observers.
 */
export declare class WaNodeTransport extends EventEmitter {
    private readonly logger;
    private comms;
    constructor(logger?: Logger);
    /** Attaches (or detaches with `null`) the {@link WaComms} instance used to write frames. */
    bindComms(comms: WaComms | null): void;
    /** Encodes `node` as a stanza frame and writes it through the bound comms. Throws when not connected. */
    sendNode(node: BinaryNode): Promise<void>;
    /**
     * Decodes an incoming frame and forwards the resulting {@link BinaryNode}
     * to `onNode`. Stream-end frames are silently dropped; decode errors are
     * logged and surfaced via the `decode_error` event without throwing.
     */
    dispatchIncomingFrame(frame: Uint8Array, onNode: (node: BinaryNode) => Promise<void> | void): Promise<void>;
    private shouldIncludeTraceXml;
}
