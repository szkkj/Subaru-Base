export function isWaClientExposePluginDefinition(plugin) {
    return plugin.exposeAs !== undefined && plugin.exposeAs.length > 0;
}
