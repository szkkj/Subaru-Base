import { type WaClientPluginContext, type WaClientPluginDefinition } from '../plugins/types';
import type { WaClientOptions } from '../types';
import type { WaClient } from '../WaClient';
import type { WaClientDependencies } from '../WaClientFactory';
import type { Logger } from '../../infra/log/types';
import type { WaStore } from '../../store/types';
export interface WaClientPluginInstallInput {
    readonly options: Readonly<WaClientOptions>;
    readonly logger: Logger;
    readonly stores: ReturnType<WaStore['session']>;
    readonly deps: WaClientDependencies;
    readonly queryWithContext: WaClientPluginContext['queryWithContext'];
}
/**
 * Installs {@link WaClientOptions.plugins} on `client`. Returns a dispose
 * function invoked by {@link WaClient.disconnect}. Safe to call again after a
 * dispose to reinstall the same plugins on reconnect.
 */
export declare function installWaClientPlugins(client: WaClient, input: WaClientPluginInstallInput, plugins: readonly WaClientPluginDefinition[]): () => Promise<void>;
