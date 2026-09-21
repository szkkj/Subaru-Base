import type { BinaryNode } from '../../transport/types';
interface AbPropResponseEntry {
    readonly configCode: number;
    readonly configValue: string | null;
}
export interface AbPropSyncResult {
    readonly abKey: string | null;
    readonly hash: string | null;
    readonly refresh: number | null;
    readonly refreshId: number | null;
    readonly isDeltaUpdate: boolean;
    readonly props: readonly AbPropResponseEntry[];
}
export declare function parseAbPropsIqResult(node: BinaryNode): AbPropSyncResult;
export {};
