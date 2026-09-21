import { WA_ABPROPS, type WaAbPropName, type WaAbPropType, type WaAbPropValue } from '../abprops-spec';
export declare const WA_ABPROPS_PROTOCOL_VERSION = "1";
export declare const WA_ABPROPS_REFRESH_BOUNDS: Readonly<{
    readonly MIN_S: 600;
    readonly MAX_S: 604800;
    readonly DEFAULT_S: 86400;
}>;
/** @deprecated Use `WaAbPropType`. Now also covers `'float'`. */
export type AbPropType = WaAbPropType;
/** @deprecated Use `WaAbPropValue`. */
export type AbPropValue = WaAbPropValue;
/** @deprecated Use `WaAbPropName`. Now covers the whole WA Web catalogue. */
export type AbPropName = WaAbPropName;
/**
 * @deprecated Use `WaAbProp`, which names the wire id `code` and also carries
 * `debugDefaultValue`.
 */
export interface AbPropConfigEntry {
    readonly configCode: number;
    readonly type: AbPropType;
    readonly defaultValue: AbPropValue;
}
/** `WA_ABPROPS` with `code` renamed to `configCode`, literal types preserved. */
type LegacyAbPropConfigView = {
    readonly [K in AbPropName]: {
        readonly configCode: (typeof WA_ABPROPS)[K]['code'];
        readonly type: (typeof WA_ABPROPS)[K]['type'];
        readonly defaultValue: (typeof WA_ABPROPS)[K]['defaultValue'];
    };
};
/**
 * @deprecated Use `WA_ABPROPS`.
 *
 * Covers every user prop rather than the curated subset it replaced, with a
 * handful of config codes corrected. Group props stay in `WA_GROUP_ABPROPS`.
 */
export declare const AB_PROP_CONFIGS: LegacyAbPropConfigView;
export {};
