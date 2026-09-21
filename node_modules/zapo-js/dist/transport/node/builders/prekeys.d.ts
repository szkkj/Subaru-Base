import type { SignalMissingPreKeysTarget } from '../../../signal/api/SignalMissingPreKeysSyncApi';
import type { PreKeyRecord, RegistrationInfo, SignedPreKeyRecord } from '../../../signal/types';
import type { BinaryNode } from '../../types';
export declare function buildPreKeyUploadIq(registrationInfo: RegistrationInfo, signedPreKey: SignedPreKeyRecord, preKeys: readonly PreKeyRecord[]): BinaryNode;
export declare function buildSignedPreKeyRotateIq(signedPreKey: SignedPreKeyRecord): BinaryNode;
export declare function buildMissingPreKeysFetchIq(users: readonly SignalMissingPreKeysTarget[]): BinaryNode;
