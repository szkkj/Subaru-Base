"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_GROUP_ABPROPS_BY_CODE = exports.WA_GROUP_ABPROPS = exports.WA_ABPROPS_USED_BEFORE_INIT = exports.WA_ABPROPS_SPECIAL_EARLY = exports.WA_ABPROPS_BY_CODE = exports.WA_ABPROPS = void 0;
exports.resolveAbPropNameByCode = resolveAbPropNameByCode;
const abprops_1 = require("../spec/abprops");
var abprops_2 = require("../spec/abprops");
Object.defineProperty(exports, "WA_ABPROPS", { enumerable: true, get: function () { return abprops_2.WA_ABPROPS; } });
Object.defineProperty(exports, "WA_ABPROPS_BY_CODE", { enumerable: true, get: function () { return abprops_2.WA_ABPROPS_BY_CODE; } });
Object.defineProperty(exports, "WA_ABPROPS_SPECIAL_EARLY", { enumerable: true, get: function () { return abprops_2.WA_ABPROPS_SPECIAL_EARLY; } });
Object.defineProperty(exports, "WA_ABPROPS_USED_BEFORE_INIT", { enumerable: true, get: function () { return abprops_2.WA_ABPROPS_USED_BEFORE_INIT; } });
Object.defineProperty(exports, "WA_GROUP_ABPROPS", { enumerable: true, get: function () { return abprops_2.WA_GROUP_ABPROPS; } });
Object.defineProperty(exports, "WA_GROUP_ABPROPS_BY_CODE", { enumerable: true, get: function () { return abprops_2.WA_GROUP_ABPROPS_BY_CODE; } });
// The reverse map is emitted with numeric literal keys, so it cannot be indexed
// with a plain `number`. Widening it keeps the lookup a single property read and
// avoids allocating a parallel Map with 2000+ entries at module init.
const AB_PROP_NAME_BY_CODE = abprops_1.WA_ABPROPS_BY_CODE;
/**
 * Resolves the client-side prop name for a wire config code.
 *
 * Returns `undefined` for codes this build does not know about - the server
 * advertises props from newer bundles, and WA Web drops those rows too.
 */
function resolveAbPropNameByCode(configCode) {
    return AB_PROP_NAME_BY_CODE[configCode];
}
