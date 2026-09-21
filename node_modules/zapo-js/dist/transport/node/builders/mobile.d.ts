import type { BinaryNode } from '../../types';
/**
 * `ClientPairingProps` the primary declares in the `<client-props>` pair-device
 * element. A LID-native account must send `isChatDbLidMigrated: true` (with
 * `isSyncdPureLidSession`) so the companion runs `setIsLidMigrated` before
 * fetching its LID-addressed blocklist; without it the companion self-removes
 * with `lid_blocklist_chat_db_unmigrated`.
 */
export interface ClientPairingProps {
    readonly isChatDbLidMigrated: boolean;
    readonly isSyncdPureLidSession: boolean;
    readonly isSyncdSnapshotRecoveryEnabled: boolean;
}
export interface PairDeviceIqInput {
    readonly ref: string;
    readonly companionNoisePublicKey: Uint8Array;
    readonly deviceIdentityBytes: Uint8Array;
    readonly keyIndexListBytes: Uint8Array;
    readonly keyIndexListTimestampSeconds: number;
    readonly clientProps?: ClientPairingProps;
    readonly pem?: {
        readonly aesGcmKeyBytes: Uint8Array;
        readonly ttlSeconds: number;
    };
}
/**
 * Builds the primary's `<iq type="set" xmlns="md">` carrying `<pair-device>`
 * with `ref`, `pub-key`, `device-identity`, `key-index-list`, and optional
 * `client-props`/`pem` children. The `id` is assigned by the send path.
 */
export declare function buildPairDeviceIq(input: PairDeviceIqInput): BinaryNode;
/**
 * Builds the standalone key-index-list publish `<iq>` the primary sends when its
 * companion set changes.
 */
export declare function buildKeyIndexListPublishIq(input: {
    readonly keyIndexListBytes: Uint8Array;
    readonly timestampSeconds: number;
}): BinaryNode;
/**
 * Builds the `remove-companion-device` IQ that unlinks a companion from the
 * account. The device is identified by its full device jid; `reason` is a
 * free-form label the server records.
 */
export declare function buildRemoveCompanionDeviceIq(input: {
    readonly deviceJid: string;
    readonly reason: string;
}): BinaryNode;
/**
 * Builds the `remove-companion-device` IQ that unlinks EVERY companion in one
 * stanza: `all="true"` (no `jid`), mirroring the phone's "log out all companion
 * devices". `excludeHostedCompanion` adds `exclude_hosted_companion="true"` to
 * spare companions this account itself hosts.
 */
export declare function buildRemoveAllCompanionDevicesIq(input: {
    readonly reason: string;
    readonly excludeHostedCompanion?: boolean;
}): BinaryNode;
/**
 * Builds the `primary_hello` IQ the primary sends to drive a link-code (pairing
 * code) handshake: the code-wrapped primary ephemeral, the primary ADV identity
 * public key, and the companion's pairing ref.
 */
export declare function buildPrimaryHelloIq(input: {
    readonly ref: string;
    readonly wrappedPrimaryEphemeralPub: Uint8Array;
    readonly primaryIdentityPub: Uint8Array;
}): BinaryNode;
