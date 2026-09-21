import type { BinaryNode } from '../../transport/types';
interface IdentityChangeNotification {
    readonly fromJid: string;
    readonly stanzaId: string;
    readonly displayName: string | undefined;
    readonly lid: string | undefined;
    readonly offline: string | undefined;
}
export declare function parseIdentityChangeNotification(node: BinaryNode): IdentityChangeNotification | null;
export {};
