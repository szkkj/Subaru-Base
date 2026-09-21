import type { BinaryNode } from '../../transport/types';
interface ReceiptTarget {
    readonly chatJid: string;
    readonly id: string;
    readonly senderJid?: string;
    readonly isGroupChat?: boolean;
    readonly isBroadcastChat?: boolean;
}
interface AggregatedReceiptGroup {
    readonly jid: string;
    readonly ids: readonly string[];
    readonly participant?: string;
}
export declare function aggregateReceiptTargets(targets: readonly ReceiptTarget[]): readonly AggregatedReceiptGroup[];
/**
 * Resolves every message id a `<receipt>` acknowledges, mirroring WhatsApp
 * Web's `externalIds`. A batch receipt carries the extra ids in a
 * `<list><item id=.../>` block; the top-level `attrs.id` is just one of them.
 *
 * - `<list><item>` ids come first. For `type="view"` receipts the item key is
 *   `server_id` (not `id`), and the top-level id is NOT appended.
 * - Otherwise the top-level `attrs.id` is appended last.
 * - Aggregated receipts (carrying a `<participants>` child) are out of scope:
 *   their ids live in `<user>` children, so this falls back to the single
 *   top-level id for them.
 *
 * No dedup: matches wa-web, which pushes the top id without checking the list.
 */
export declare function extractReceiptIds(node: BinaryNode): readonly string[];
export {};
