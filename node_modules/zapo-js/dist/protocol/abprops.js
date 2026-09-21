"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AB_PROP_CONFIGS = exports.WA_ABPROPS_REFRESH_BOUNDS = exports.WA_ABPROPS_PROTOCOL_VERSION = void 0;
const _abprops_spec_1 = require("../abprops-spec");
exports.WA_ABPROPS_PROTOCOL_VERSION = '1';
exports.WA_ABPROPS_REFRESH_BOUNDS = Object.freeze({
    MIN_S: 600,
    MAX_S: 604800,
    DEFAULT_S: 86400
});
/**
 * @deprecated Use `WA_ABPROPS`.
 *
 * Covers every user prop rather than the curated subset it replaced, with a
 * handful of config codes corrected. Group props stay in `WA_GROUP_ABPROPS`.
 */
exports.AB_PROP_CONFIGS = buildLegacyConfigView();
function buildLegacyConfigView() {
    const view = {};
    for (const [name, entry] of Object.entries(_abprops_spec_1.WA_ABPROPS)) {
        view[name] = Object.freeze({
            configCode: entry.code,
            type: entry.type,
            defaultValue: entry.defaultValue
        });
    }
    return Object.freeze(view);
}
