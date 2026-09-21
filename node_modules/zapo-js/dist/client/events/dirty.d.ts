import type { WaAuthCredentials } from '../../auth/types';
import { type WaBlocklistResult } from '../events/privacy';
import type { Logger } from '../../infra/log/types';
import type { BinaryNode } from '../../transport/types';
export interface WaDirtyBit {
    readonly type: string;
    readonly timestamp: number;
    readonly protocols: readonly string[];
}
interface WaDirtySyncRuntime {
    readonly logger: Logger;
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>, options?: {
        readonly useSystemId?: boolean;
    }) => Promise<BinaryNode>;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
    readonly syncAppState: () => Promise<void>;
    readonly generateUsyncSid: () => Promise<string>;
    readonly syncAccountPrivacy: () => Promise<void>;
    readonly emitBlocklist: (blocklist: WaBlocklistResult) => void;
    readonly newsletterListSubscribed?: () => Promise<unknown>;
}
export declare function parseDirtyBits(nodes: readonly BinaryNode[], logger: Logger): readonly WaDirtyBit[];
export declare function handleDirtyBits(runtime: WaDirtySyncRuntime, dirtyBits: readonly WaDirtyBit[]): Promise<void>;
export {};
