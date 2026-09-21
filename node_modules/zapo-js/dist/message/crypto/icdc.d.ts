import type { Proto } from '../../proto';
import type { SignalAddress } from '../../signal/types';
import type { WaIdentityStore } from '../../store/contracts/identity.store';
export interface IcdcMeta {
    readonly keyHash: Uint8Array;
    readonly timestamp: number | undefined;
}
export declare function computeDeviceKeyHash(identityKeys: readonly Uint8Array[], hashLength?: number): Uint8Array;
export declare function resolveIcdcMeta(deviceJids: readonly string[], identityStore: WaIdentityStore, updatedAtMs: number | undefined, localIdentity?: {
    readonly address: SignalAddress;
    readonly pubKey: Uint8Array;
}, hashLength?: number): Promise<IcdcMeta | null>;
export declare function injectDeviceListMetadata(message: Proto.IMessage, senderIcdc: IcdcMeta | null, recipientIcdc: IcdcMeta | null): Proto.IMessage;
