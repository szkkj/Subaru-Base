import type { WaAbPropName } from '../../abprops-spec';
import type { Logger } from '../../infra/log/types';
import type { WaMexOperationResponses, WaMexOperationVariables } from '../../mex';
import { type WaMexOpKey, type WaMexQuerySocket } from '../../transport/node/mex/client';
import type { BinaryNode } from '../../transport/types';
export type WaNewsletterTosKind = 'creation' | 'consumer' | 'admin_invite';
export interface WaNewsletterMexDeps {
    readonly mexSocket: WaMexQuerySocket;
    readonly queryWithContext?: (context: string, node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    readonly getAbPropString?: (name: WaAbPropName) => string;
    readonly logger: Logger;
}
export declare function runMex<K extends WaMexOpKey>(deps: WaNewsletterMexDeps, opKey: K, variables: WaMexOperationVariables[K]): Promise<WaMexOperationResponses[K] | null>;
export declare function ensureTosAccepted(deps: WaNewsletterMexDeps, kind: WaNewsletterTosKind): Promise<void>;
