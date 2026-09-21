import type { WaMediaConn } from '../types';
import type { BinaryNode } from '../../transport/types';
/**
 * Parses a `media_conn` IQ response into a {@link WaMediaConn} (auth token,
 * absolute expiry, and host list). Throws on missing auth/ttl/hosts.
 */
export declare function parseMediaConnResponse(node: BinaryNode, nowMs: number): WaMediaConn;
