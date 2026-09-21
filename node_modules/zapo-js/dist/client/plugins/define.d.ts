import type { WaClientPluginContext, WaClientPluginDefinition } from '../plugins/types';
import type { WaClient } from '../WaClient';
interface WaClientBehaviorPluginInput {
    readonly id: string;
    readonly setup: (ctx: WaClientPluginContext) => void;
    readonly dispose?: (ctx: WaClientPluginContext) => void | Promise<void>;
}
interface WaClientExposePluginInput<K extends string, T> {
    readonly id: string;
    readonly exposeAs: K;
    readonly setup: (ctx: WaClientPluginContext) => T;
    readonly dispose?: (instance: T, ctx: WaClientPluginContext) => void | Promise<void>;
}
/** Type-safe helper for authoring {@link WaClientPluginDefinition} values. */
export declare function defineWaClientPlugin(input: WaClientBehaviorPluginInput): WaClientPluginDefinition;
export declare function defineWaClientPlugin<K extends string, T, E = {}>(input: WaClientExposePluginInput<K, T> & {
    readonly exposeAs: K extends keyof WaClient ? never : K;
}): WaClientPluginDefinition & {
    readonly exposeAs: K;
    readonly setup: (ctx: WaClientPluginContext) => T;
    readonly __pluginEvents?: E;
};
export {};
