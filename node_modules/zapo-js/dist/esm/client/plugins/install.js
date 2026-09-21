import { isWaClientExposePluginDefinition } from '../plugins/types.js';
import { toError } from '../../util/primitives.js';
const PLUGIN_REGISTRY = Symbol('waClientPluginRegistry');
/**
 * Per-client store for exposed-plugin state that must survive a
 * disconnect/connect cycle. Each `exposeAs` property is defined on the client
 * exactly once (a non-configurable getter reading `instances`); reinstalls
 * only repopulate the slot, so plugins can be torn down on disconnect and
 * rebuilt on the next connect without redefining reserved members.
 */
function getPluginRegistry(client) {
    const holder = client;
    const existing = holder[PLUGIN_REGISTRY];
    if (existing) {
        return existing;
    }
    const registry = { instances: new Map(), exposedDefined: new Set() };
    Object.defineProperty(client, PLUGIN_REGISTRY, {
        value: registry,
        enumerable: false,
        configurable: false,
        writable: false
    });
    return registry;
}
/**
 * Installs {@link WaClientOptions.plugins} on `client`. Returns a dispose
 * function invoked by {@link WaClient.disconnect}. Safe to call again after a
 * dispose to reinstall the same plugins on reconnect.
 */
export function installWaClientPlugins(client, input, plugins) {
    const registry = getPluginRegistry(client);
    const seenIds = new Set();
    const seenExposeAs = new Set();
    const disposeCallbacks = [];
    const registerDispose = (fn) => {
        disposeCallbacks[disposeCallbacks.length] = fn;
    };
    const baseCtx = {
        client,
        options: input.options,
        logger: input.logger,
        stores: input.stores,
        deps: input.deps,
        emit: client.emit.bind(client),
        on: client.on.bind(client),
        off: client.off.bind(client),
        once: client.once.bind(client),
        queryWithContext: input.queryWithContext,
        registerIncomingHandler: (registration) => input.deps.lowLevelCoordinator.registerIncomingHandler(registration),
        registerIncomingStanzaFilter: (filter) => input.deps.lowLevelCoordinator.registerIncomingStanzaFilter(filter),
        registerDispose
    };
    for (let index = 0; index < plugins.length; index += 1) {
        const plugin = plugins[index];
        if (seenIds.has(plugin.id)) {
            throw new Error(`duplicate wa client plugin id: ${plugin.id}`);
        }
        seenIds.add(plugin.id);
        const pluginCtx = {
            ...baseCtx,
            logger: input.logger.child({ plugin: plugin.id })
        };
        if (isWaClientExposePluginDefinition(plugin)) {
            const exposeAs = plugin.exposeAs;
            if (seenExposeAs.has(exposeAs)) {
                throw new Error(`duplicate wa client plugin exposeAs: ${exposeAs}`);
            }
            seenExposeAs.add(exposeAs);
            if (!registry.exposedDefined.has(exposeAs)) {
                if (exposeAs in client) {
                    throw new Error(`wa client plugin exposeAs "${exposeAs}" collides with a reserved client member`);
                }
                registry.exposedDefined.add(exposeAs);
                Object.defineProperty(client, exposeAs, {
                    get: () => registry.instances.get(exposeAs),
                    enumerable: true,
                    configurable: false
                });
            }
            const instance = plugin.setup(pluginCtx);
            registry.instances.set(exposeAs, instance);
            registerDispose(() => {
                registry.instances.delete(exposeAs);
            });
            if (plugin.dispose) {
                const dispose = plugin.dispose;
                registerDispose(() => dispose(instance, pluginCtx));
            }
            pluginCtx.logger.debug('wa client plugin installed', { exposeAs });
        }
        else {
            plugin.setup(pluginCtx);
            if (plugin.dispose) {
                const dispose = plugin.dispose;
                registerDispose(() => dispose(undefined, pluginCtx));
            }
            pluginCtx.logger.debug('wa client plugin installed');
        }
    }
    return async () => {
        for (let index = disposeCallbacks.length - 1; index >= 0; index -= 1) {
            try {
                await disposeCallbacks[index]();
            }
            catch (error) {
                input.logger.warn('wa client plugin dispose failed', {
                    message: toError(error).message
                });
            }
        }
    };
}
