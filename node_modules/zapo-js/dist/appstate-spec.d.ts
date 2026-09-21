import { proto, type Proto } from './proto';
import { WA_APPSTATE_SCHEMAS as RAW_WA_APPSTATE_SCHEMAS, type WaAppstateActionKey, type WaAppstateSchema, type WaAppstateValueEnumFields } from '../spec/appstate';
export { WA_APPSTATE_COLLECTIONS, WA_APPSTATE_SCHEMAS } from '../spec/appstate';
export type { WaAppstateActionKey, WaAppstateCollection, WaAppstateIndexArgs, WaAppstateIndexPart, WaAppstateIndexValueOf, WaAppstateSchema, WaAppstateScope, WaAppstateValueEnumFields } from '../spec/appstate';
export type GetByPath<T, P extends string> = P extends `${infer Head}.${infer Tail}` ? Head extends keyof T ? GetByPath<T[Head], Tail> : never : P extends keyof T ? T[P] : never;
export type EnumNamesAt<P extends string> = keyof GetByPath<typeof proto.SyncActionValue, P> & string;
type EnumValueFor<P extends string, Original> = Original extends ReadonlyArray<unknown> | null | undefined ? ReadonlyArray<EnumNamesAt<P>> | null | undefined : EnumNamesAt<P> | null | undefined;
type WithEnumStrings<Data, Fields extends WaAppstateValueEnumFields | null> = Fields extends WaAppstateValueEnumFields ? {
    [K in keyof Data]: K extends keyof Fields ? Fields[K] extends string ? EnumValueFor<Fields[K], Data[K]> : Data[K] : Data[K];
} : Data;
export type ValueForSchema<S extends WaAppstateSchema> = S['valueField'] extends keyof Proto.ISyncActionValue ? Pick<Proto.ISyncActionValue, S['valueField'] & keyof Proto.ISyncActionValue> : Proto.ISyncActionValue;
export type ValueForKey<K extends WaAppstateActionKey> = ValueForSchema<(typeof RAW_WA_APPSTATE_SCHEMAS)[K]>;
type BaseDataForSchema<S extends WaAppstateSchema> = S['valueField'] extends keyof Proto.ISyncActionValue ? NonNullable<Proto.ISyncActionValue[S['valueField'] & keyof Proto.ISyncActionValue]> : Proto.ISyncActionValue;
export type DataForSchema<S extends WaAppstateSchema> = WithEnumStrings<BaseDataForSchema<S>, S['valueEnumFields']>;
export type DataForKey<K extends WaAppstateActionKey> = DataForSchema<(typeof RAW_WA_APPSTATE_SCHEMAS)[K]>;
export declare const WA_APPSTATE_SCHEMA_BY_ACTION_NAME: Readonly<Record<string, WaAppstateActionKey>>;
export declare function getAppstateSchemaByActionName(actionName: string): {
    readonly key: WaAppstateActionKey;
    readonly schema: WaAppstateSchema;
} | null;
export declare function resolveEnumObject(protoEnumPath: string): Record<string, number | string> | null;
export declare function encodeEnumValue(protoEnumPath: string, name: string): number | null;
export declare function decodeEnumValue(protoEnumPath: string, value: number): string | null;
export declare function decodeIndexArgsFromSchema(schema: WaAppstateSchema, parts: readonly string[]): Readonly<Record<string, string | boolean | null>> | null;
