import type { Logger } from '../../infra/log/types';
import type { WaUsyncResultEnvelope } from './builders/usync';
export type WaUsyncSidGenerator = () => Promise<string>;
export declare function createUsyncSidGenerator(): WaUsyncSidGenerator;
export declare function logUsyncProtocolErrors(envelope: WaUsyncResultEnvelope, logger: Logger, context: string): void;
