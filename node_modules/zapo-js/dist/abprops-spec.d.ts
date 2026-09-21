import { type WaAbPropName } from '../spec/abprops';
export { WA_ABPROPS, WA_ABPROPS_BY_CODE, WA_ABPROPS_SPECIAL_EARLY, WA_ABPROPS_USED_BEFORE_INIT, WA_GROUP_ABPROPS, WA_GROUP_ABPROPS_BY_CODE } from '../spec/abprops';
export type { WaAbProp, WaAbPropName, WaAbPropType, WaAbPropValue, WaAbPropValueByName, WaAbPropValueOf, WaGroupAbPropName, WaGroupAbPropValueByName } from '../spec/abprops';
/**
 * Resolves the client-side prop name for a wire config code.
 *
 * Returns `undefined` for codes this build does not know about - the server
 * advertises props from newer bundles, and WA Web drops those rows too.
 */
export declare function resolveAbPropNameByCode(configCode: number): WaAbPropName | undefined;
