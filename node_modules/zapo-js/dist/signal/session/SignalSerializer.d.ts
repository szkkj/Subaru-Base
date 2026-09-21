import type { ParsedPreKeySignalMessage, ParsedSignalMessage, PreKeyRecord, SignedPreKeyRecord } from '../types';
import type { WaPreKeyStore } from '../../store/contracts/pre-key.store';
import type { WaSignalStore } from '../../store/contracts/signal.store';
export declare function deserializeMsg(versionContentMac: Uint8Array): ParsedSignalMessage;
export declare function deserializePkMsg(versionContent: Uint8Array): ParsedPreKeySignalMessage;
export declare function requireSignedPreKey(store: WaSignalStore, id: number): Promise<SignedPreKeyRecord>;
export declare function requirePreKey(store: WaPreKeyStore, id: number): Promise<PreKeyRecord>;
