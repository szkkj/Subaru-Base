"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineWaClientPlugin = defineWaClientPlugin;
function defineWaClientPlugin(input) {
    if ('exposeAs' in input && input.exposeAs !== undefined) {
        const exposeInput = input;
        return {
            id: exposeInput.id,
            exposeAs: exposeInput.exposeAs,
            setup: exposeInput.setup,
            dispose: exposeInput.dispose
                ? (instance, ctx) => exposeInput.dispose(instance, ctx)
                : undefined
        };
    }
    const behaviorInput = input;
    return {
        id: behaviorInput.id,
        setup: behaviorInput.setup,
        dispose: behaviorInput.dispose ? (_instance, ctx) => behaviorInput.dispose(ctx) : undefined
    };
}
