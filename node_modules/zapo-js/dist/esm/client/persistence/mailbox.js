import { needsSecretPersistence } from '../../message/encode/content.js';
import { proto } from '../../proto.js';
import { isLidJid, isUserJid, toUserJid } from '../../protocol/jid.js';
import { toError } from '../../util/primitives.js';
function pairLidPn(a, b) {
    if (!a || !b)
        return null;
    if (isLidJid(a) && isUserJid(b))
        return [a, b];
    if (isLidJid(b) && isUserJid(a))
        return [b, a];
    return null;
}
/**
 * Returns the LID-canonical contact record for a primary jid and (optionally)
 * its alternate addressing. When both forms are known, the row carries
 * `jid=<lid>, phoneNumber=<pn>` so lookups by either form converge on a
 * single row via the contact store's PN-fallback path. When only one form is
 * known, the row falls back to that jid as canonical.
 */
function canonicalContact(primary, alt, nowMs) {
    const pair = pairLidPn(primary, alt);
    if (pair) {
        const [lid, pn] = pair;
        return { jid: lid, phoneNumber: pn, lastUpdatedMs: nowMs };
    }
    return { jid: primary, lastUpdatedMs: nowMs };
}
function persistContacts(writeBehind, event, nowMs) {
    const rawParticipant = event.rawNode.attrs.participant;
    const participantJid = rawParticipant ? toUserJid(rawParticipant) : undefined;
    const senderPrimary = event.key.participant ?? rawParticipant ?? event.key.remoteJid;
    if (!senderPrimary && !participantJid) {
        return;
    }
    const written = new Set();
    if (senderPrimary) {
        // For 1:1 chats the sender is the same person as remoteJid, so its
        // cross-ref pair info lives in remoteJidAlt rather than participantAlt.
        let alt = event.key.participantAlt;
        if (!alt && !event.key.isGroup && senderPrimary === event.key.remoteJid) {
            alt = event.key.remoteJidAlt;
        }
        const record = canonicalContact(senderPrimary, alt, nowMs);
        writeBehind.persistContact(record);
        written.add(record.jid);
        if (record.phoneNumber) {
            written.add(record.phoneNumber);
        }
    }
    if (participantJid && !written.has(participantJid)) {
        writeBehind.persistContact({ jid: participantJid, lastUpdatedMs: nowMs });
    }
}
export function persistIncomingMailboxEntities(options) {
    const { logger, writeBehind, messageSecretStore, persistAllSecrets, event } = options;
    const stanzaId = event.key.id;
    const chatJid = event.key.remoteJid;
    if (!stanzaId || !chatJid) {
        return;
    }
    const nowMs = Date.now();
    try {
        const messageBytes = event.message
            ? proto.Message.encode(event.message).finish()
            : undefined;
        writeBehind.persistMessage({
            id: stanzaId,
            threadJid: chatJid,
            senderJid: event.key.participant ?? event.rawNode.attrs.participant ?? event.key.remoteJid,
            participantJid: event.rawNode.attrs.participant,
            fromMe: event.key.fromMe,
            timestampMs: event.timestampSeconds === undefined ? undefined : event.timestampSeconds * 1000,
            messageBytes
        });
        persistContacts(writeBehind, event, nowMs);
        const rawSecret = event.message?.messageContextInfo?.messageSecret;
        if (rawSecret &&
            rawSecret.length > 0 &&
            event.message &&
            (persistAllSecrets || needsSecretPersistence(event.message))) {
            const rawSender = event.key.participant ?? event.rawNode.attrs.participant ?? event.key.remoteJid;
            const senderJid = rawSender ? toUserJid(rawSender) : '';
            void messageSecretStore
                .set(stanzaId, { secret: rawSecret, senderJid })
                .catch((error) => {
                logger.warn('failed to persist message secret', {
                    id: stanzaId,
                    message: toError(error).message
                });
            });
        }
    }
    catch (error) {
        logger.warn('failed to persist incoming mailbox entities', {
            id: stanzaId,
            from: chatJid,
            message: toError(error).message
        });
    }
}
