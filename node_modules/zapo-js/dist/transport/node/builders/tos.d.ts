import type { BinaryNode } from '../../types';
export declare function buildTosQueryIq(noticeIds: readonly string[]): BinaryNode;
export declare function buildTosUpdateIq(noticeIds: readonly string[]): BinaryNode;
export interface WaTosNoticeState {
    readonly id: string;
    readonly accepted: boolean;
}
export interface WaTosQueryResult {
    readonly refreshSeconds: number;
    readonly notices: readonly WaTosNoticeState[];
}
export declare function parseTosQueryResponse(node: BinaryNode): WaTosQueryResult;
