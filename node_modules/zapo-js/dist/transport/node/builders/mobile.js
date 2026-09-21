"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPairDeviceIq = buildPairDeviceIq;
exports.buildKeyIndexListPublishIq = buildKeyIndexListPublishIq;
exports.buildRemoveCompanionDeviceIq = buildRemoveCompanionDeviceIq;
exports.buildRemoveAllCompanionDevicesIq = buildRemoveAllCompanionDevicesIq;
exports.buildPrimaryHelloIq = buildPrimaryHelloIq;
const _proto_1 = require("../../../proto");
const defaults_1 = require("../../../protocol/defaults");
const nodes_1 = require("../../../protocol/nodes");
const query_1 = require("../../node/query");
/**
 * Builds the primary's `<iq type="set" xmlns="md">` carrying `<pair-device>`
 * with `ref`, `pub-key`, `device-identity`, `key-index-list`, and optional
 * `client-props`/`pem` children. The `id` is assigned by the send path.
 */
function buildPairDeviceIq(input) {
    const children = [
        { tag: nodes_1.WA_NODE_TAGS.REF, attrs: {}, content: input.ref },
        { tag: nodes_1.WA_NODE_TAGS.PUB_KEY, attrs: {}, content: input.companionNoisePublicKey },
        { tag: nodes_1.WA_NODE_TAGS.DEVICE_IDENTITY, attrs: {}, content: input.deviceIdentityBytes },
        {
            tag: nodes_1.WA_NODE_TAGS.KEY_INDEX_LIST,
            attrs: { ts: String(input.keyIndexListTimestampSeconds) },
            content: input.keyIndexListBytes
        }
    ];
    if (input.clientProps) {
        children.push({
            tag: nodes_1.WA_NODE_TAGS.CLIENT_PROPS,
            attrs: {},
            content: _proto_1.proto.ClientPairingProps.encode({
                isChatDbLidMigrated: input.clientProps.isChatDbLidMigrated,
                isSyncdPureLidSession: input.clientProps.isSyncdPureLidSession,
                isSyncdSnapshotRecoveryEnabled: input.clientProps.isSyncdSnapshotRecoveryEnabled
            }).finish()
        });
    }
    if (input.pem) {
        children.push({
            tag: nodes_1.WA_NODE_TAGS.PEM,
            attrs: { version: '1', algorithm: 'rsa2048' },
            content: [
                { tag: nodes_1.WA_NODE_TAGS.PEM, attrs: {}, content: input.pem.aesGcmKeyBytes },
                { tag: nodes_1.WA_NODE_TAGS.TTL, attrs: { ts_s: String(input.pem.ttlSeconds) } },
                { tag: nodes_1.WA_NODE_TAGS.KEY_ID, attrs: {}, content: '1' }
            ]
        });
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.MD, [
        { tag: nodes_1.WA_NODE_TAGS.PAIR_DEVICE, attrs: {}, content: children }
    ]);
}
/**
 * Builds the standalone key-index-list publish `<iq>` the primary sends when its
 * companion set changes.
 */
function buildKeyIndexListPublishIq(input) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.MD, [
        {
            tag: nodes_1.WA_NODE_TAGS.KEY_INDEX_LIST,
            attrs: { ts: String(input.timestampSeconds) },
            content: input.keyIndexListBytes
        }
    ]);
}
/**
 * Builds the `remove-companion-device` IQ that unlinks a companion from the
 * account. The device is identified by its full device jid; `reason` is a
 * free-form label the server records.
 */
function buildRemoveCompanionDeviceIq(input) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.MD, [
        {
            tag: nodes_1.WA_NODE_TAGS.REMOVE_COMPANION_DEVICE,
            attrs: { jid: input.deviceJid, reason: input.reason }
        }
    ]);
}
/**
 * Builds the `remove-companion-device` IQ that unlinks EVERY companion in one
 * stanza: `all="true"` (no `jid`), mirroring the phone's "log out all companion
 * devices". `excludeHostedCompanion` adds `exclude_hosted_companion="true"` to
 * spare companions this account itself hosts.
 */
function buildRemoveAllCompanionDevicesIq(input) {
    const attrs = { all: 'true', reason: input.reason };
    if (input.excludeHostedCompanion) {
        attrs.exclude_hosted_companion = 'true';
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.MD, [
        { tag: nodes_1.WA_NODE_TAGS.REMOVE_COMPANION_DEVICE, attrs }
    ]);
}
/**
 * Builds the `primary_hello` IQ the primary sends to drive a link-code (pairing
 * code) handshake: the code-wrapped primary ephemeral, the primary ADV identity
 * public key, and the companion's pairing ref.
 */
function buildPrimaryHelloIq(input) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.MD, [
        {
            tag: nodes_1.WA_NODE_TAGS.LINK_CODE_COMPANION_REG,
            attrs: { stage: 'primary_hello' },
            content: [
                {
                    tag: nodes_1.WA_NODE_TAGS.LINK_CODE_PAIRING_WRAPPED_PRIMARY_EPHEMERAL_PUB,
                    attrs: {},
                    content: input.wrappedPrimaryEphemeralPub
                },
                {
                    tag: nodes_1.WA_NODE_TAGS.PRIMARY_IDENTITY_PUB,
                    attrs: {},
                    content: input.primaryIdentityPub
                },
                { tag: nodes_1.WA_NODE_TAGS.LINK_CODE_PAIRING_REF, attrs: {}, content: input.ref }
            ]
        }
    ]);
}
