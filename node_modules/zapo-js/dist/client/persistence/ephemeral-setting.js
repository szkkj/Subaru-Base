"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistIncomingEphemeralSetting = persistIncomingEphemeralSetting;
exports.createEphemeralObserver = createEphemeralObserver;
const PromiseDedup_1 = require("../../infra/perf/PromiseDedup");
const context_info_1 = require("../../message/context-info");
const jid_1 = require("../../protocol/jid");
const message_1 = require("../../protocol/message");
const primitives_1 = require("../../util/primitives");
/**
 * Persists a 1:1 `EPHEMERAL_SETTING` protocol message so outgoing sends pick up
 * the peer's change without waiting for history sync. Groups are skipped –
 * their timer comes from group notifications, not protocol messages.
 */
function persistIncomingEphemeralSetting(options) {
    const { logger, writeBehind, event, protocolMessage, chatMetadataStore } = options;
    const chatJid = event.key.remoteJid;
    if (!chatJid || event.key.isGroup || (0, jid_1.isGroupJid)(chatJid)) {
        return;
    }
    const expiration = protocolMessage.ephemeralExpiration ?? 0;
    const rawTimestamp = protocolMessage.ephemeralSettingTimestamp !== undefined &&
        protocolMessage.ephemeralSettingTimestamp !== null
        ? (0, primitives_1.longToNumber)(protocolMessage.ephemeralSettingTimestamp)
        : event.timestampSeconds;
    const settingTimestamp = rawTimestamp !== undefined ? (0, message_1.normalizeEphemeralSettingSeconds)(rawTimestamp) : undefined;
    void chatMetadataStore
        .upsertChatMetadata({
        chatJid,
        ephemeralExpiration: expiration,
        ...(settingTimestamp !== undefined
            ? { ephemeralSettingTimestamp: settingTimestamp }
            : {}),
        updatedAtMs: Date.now()
    })
        .catch((error) => {
        logger.debug('failed to cache incoming ephemeral setting', {
            jid: chatJid,
            message: (0, primitives_1.toError)(error).message
        });
    });
    try {
        writeBehind.persistThread({
            jid: chatJid,
            ephemeralExpiration: expiration,
            ...(settingTimestamp !== undefined
                ? { ephemeralSettingTimestamp: settingTimestamp }
                : {})
        });
    }
    catch (error) {
        logger.warn('failed to persist incoming ephemeral setting', {
            jid: chatJid,
            expiration,
            message: (0, primitives_1.toError)(error).message
        });
    }
}
/**
 * Builds the inbound observer that refreshes the chat-metadata cache from
 * ordinary traffic. A peer stamps `contextInfo.ephemeralSettingTimestamp` on
 * every message in a disappearing chat, making it the only continuously
 * refreshed source - history sync and `EPHEMERAL_SETTING` are point-in-time.
 *
 * Never blocks and never rejects: the store round-trip is fire-and-forget.
 * Messages repeating a value share one round-trip, so the batch an offline
 * resume delivers costs a single read instead of one per message, while a
 * message carrying a *different* value still gets its own round-trip rather
 * than being swallowed by the one in flight.
 *
 * A write skips a setting older than the cached one, mirroring how the peer
 * resolves it: highest timestamp wins. That check is not atomic with the
 * write, so two round-trips that both read a cold cache can still land out of
 * order and leave the older value behind. The next message from the chat
 * corrects it, and a stale-but-older stamp loses to the peer's own value
 * anyway, so this is not worth serializing the receive path over.
 */
function createEphemeralObserver(options) {
    const { logger, chatMetadataStore } = options;
    const dedup = new PromiseDedup_1.PromiseDedup();
    return (event) => {
        const expiration = event.expirationSeconds;
        if (expiration === undefined || expiration <= 0) {
            return;
        }
        const chatJid = event.key.remoteJid;
        if (!chatJid || event.key.isGroup || event.key.isNewsletter || (0, jid_1.isGroupJid)(chatJid)) {
            return;
        }
        const raw = (0, context_info_1.pickIncomingEphemeralSettingTimestamp)(event.message);
        if (raw === undefined) {
            return;
        }
        const settingTimestamp = (0, message_1.normalizeEphemeralSettingSeconds)(raw);
        void dedup
            .run(`observe:${chatJid}:${expiration}:${settingTimestamp}`, async () => {
            const cached = await chatMetadataStore.getChatMetadata(chatJid);
            if (cached?.ephemeralSettingTimestamp === settingTimestamp &&
                cached.ephemeralExpiration === expiration) {
                return;
            }
            if (cached?.ephemeralSettingTimestamp !== undefined &&
                cached.ephemeralSettingTimestamp > settingTimestamp) {
                return;
            }
            await chatMetadataStore.upsertChatMetadata({
                chatJid,
                ephemeralExpiration: expiration,
                ephemeralSettingTimestamp: settingTimestamp,
                updatedAtMs: Date.now()
            });
        })
            .catch((error) => {
            logger.debug('failed to cache observed ephemeral setting', {
                jid: chatJid,
                message: (0, primitives_1.toError)(error).message
            });
        });
    };
}
