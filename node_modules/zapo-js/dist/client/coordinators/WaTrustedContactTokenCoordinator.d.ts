import type { WaAuthCredentials } from '../../auth/types';
import type { ParsedPrivacyToken } from '../events/privacy-token';
import type { WaClientEventMap } from '../types';
import type { Logger } from '../../infra/log/types';
import type { WaPrivacyTokenStore } from '../../store/contracts/privacy-token.store';
import type { BinaryNode } from '../../transport/types';
import type { ServerClock } from '../../util/clock';
type WaTrustedContactTokenRuntime = {
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>) => Promise<BinaryNode>;
    readonly emitEvent: <K extends keyof WaClientEventMap>(event: K, ...args: Parameters<WaClientEventMap[K]>) => void;
    readonly getCurrentCredentials: () => WaAuthCredentials | null;
};
interface WaTrustedContactTokenConfig {
    readonly durationS: number;
    readonly numBuckets: number;
    readonly senderDurationS: number;
    readonly senderNumBuckets: number;
    readonly maxDurationS: number;
}
export declare class WaTrustedContactTokenCoordinator {
    private readonly logger;
    private readonly store;
    private readonly runtime;
    private readonly serverClock;
    private readonly baseConfig;
    private readonly getConfigOverrides;
    private readonly csTokenGenerator;
    private readonly senderTokenDedup;
    private cachedNctSalt;
    private nctSaltHydrated;
    constructor(options: {
        readonly logger: Logger;
        readonly store: WaPrivacyTokenStore;
        readonly runtime: WaTrustedContactTokenRuntime;
        readonly serverClock: ServerClock;
        readonly durationS?: number;
        readonly numBuckets?: number;
        readonly senderDurationS?: number;
        readonly senderNumBuckets?: number;
        readonly maxDurationS?: number;
        readonly getConfigOverrides?: () => Partial<WaTrustedContactTokenConfig>;
    });
    private resolveConfig;
    /**
     * Resolves the receiver-mode `<tctoken>` node to echo back on outbound
     * queries against a contact's privacy-gated data (presence subscribe,
     * profile-picture get, about/status usync). Returns the token only when a
     * non-expired receiver token exists for `jid`; unlike
     * {@link resolveTokenForMessage} it does **not** fall back to a `<cstoken>`
     * (the gated query flows attach the trusted-contact token only).
     */
    resolveReceiverTokenNode(jid: string): Promise<BinaryNode | null>;
    resolveTokenForMessage(recipientJid: string): Promise<BinaryNode | null>;
    handleIncomingToken(fromJid: string, tokens: readonly ParsedPrivacyToken[]): Promise<void>;
    maybeIssueSenderToken(recipientJid: string): Promise<void>;
    reissueOnIdentityChange(jid: string): Promise<void>;
    hydrateFromHistorySync(conversations: readonly {
        readonly jid: string;
        readonly tcToken?: Uint8Array | null;
        readonly tcTokenTimestamp?: number | null;
        readonly tcTokenSenderTimestamp?: number | null;
    }[]): Promise<void>;
    handleNctSaltSync(salt: Uint8Array | null): Promise<void>;
    hydrateNctSaltFromHistorySync(salt: Uint8Array): Promise<void>;
    private getNctSalt;
    private issuePrivacyToken;
}
export {};
