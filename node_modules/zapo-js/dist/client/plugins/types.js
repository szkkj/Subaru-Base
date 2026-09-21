"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWaClientExposePluginDefinition = isWaClientExposePluginDefinition;
function isWaClientExposePluginDefinition(plugin) {
    return plugin.exposeAs !== undefined && plugin.exposeAs.length > 0;
}
