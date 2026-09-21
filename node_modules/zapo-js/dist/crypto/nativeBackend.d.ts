export interface NativeCryptoModule {
    readonly x25519ScalarMult?: (privateKey: Uint8Array, publicKey: Uint8Array) => Uint8Array;
    readonly xeddsaSign?: (privateKey: Uint8Array, message: Uint8Array) => Uint8Array;
    readonly xeddsaVerify?: (publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array) => boolean;
}
declare const ABSENCE_TOKENS: {
    readonly napi: readonly ["'@zapo-js/native'", "binding.js", "Cannot find native binding"];
    readonly wasm: readonly ["'@zapo-js/native'", "zapo_native_wasm.js"];
};
export type NativeBackendKind = keyof typeof ABSENCE_TOKENS;
/**
 * Classifies a backend load failure: `true` means the backend is simply not
 * available on this install (missing optional package, entry file absent,
 * no prebuilt binary, ESM build without `require`) and the fallback should
 * stay silent; `false` means the backend is present but broken and the
 * degradation deserves a process warning.
 */
export declare function isBackendAbsence(backend: NativeBackendKind, error: unknown): boolean;
export declare function resolveNativeCryptoBackend(): NativeCryptoModule | null;
export {};
