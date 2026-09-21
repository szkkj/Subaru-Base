import { isGroupOrBroadcastJid, toUserJid } from '../protocol/jid.js';
import { longToNumber } from '../util/primitives.js';
export function buildContextInfoProto(input) {
    const ctx = {};
    if (input.quotedMessageId !== undefined)
        ctx.stanzaId = input.quotedMessageId;
    if (input.quotedParticipant !== undefined)
        ctx.participant = input.quotedParticipant;
    if (input.quotedRemoteJid !== undefined)
        ctx.remoteJid = input.quotedRemoteJid;
    if (input.quotedMessage !== undefined)
        ctx.quotedMessage = input.quotedMessage;
    if (input.isForwarded !== undefined)
        ctx.isForwarded = input.isForwarded;
    if (input.forwardingScore !== undefined)
        ctx.forwardingScore = input.forwardingScore;
    if (input.mentionedJids && input.mentionedJids.length > 0) {
        ctx.mentionedJid = [...input.mentionedJids];
    }
    if (input.isSpoiler !== undefined)
        ctx.isSpoiler = input.isSpoiler;
    if (input.expirationSeconds !== undefined)
        ctx.expiration = input.expirationSeconds;
    if (input.ephemeralSettingTimestamp !== undefined) {
        ctx.ephemeralSettingTimestamp = input.ephemeralSettingTimestamp;
    }
    if (input.disappearingModeInitiator !== undefined ||
        input.disappearingModeTrigger !== undefined) {
        ctx.disappearingMode = {
            ...(input.disappearingModeInitiator !== undefined
                ? { initiator: input.disappearingModeInitiator }
                : {}),
            ...(input.disappearingModeTrigger !== undefined
                ? { trigger: input.disappearingModeTrigger }
                : {})
        };
    }
    if (input.groupSubject !== undefined)
        ctx.groupSubject = input.groupSubject;
    if (input.parentGroupJid !== undefined)
        ctx.parentGroupJid = input.parentGroupJid;
    if (input.raw) {
        Object.assign(ctx, input.raw);
    }
    return ctx;
}
export function applyContextInfo(message, ctx) {
    if (!ctx)
        return message;
    const proto = buildContextInfoProto(ctx);
    if (!hasAnyKey(proto))
        return message;
    const next = { ...message };
    if (typeof next.conversation === 'string' && !next.extendedTextMessage) {
        next.extendedTextMessage = { text: next.conversation };
        delete next.conversation;
    }
    if (!hasAnyKey(next)) {
        next.extendedTextMessage = {};
    }
    const target = pickContextInfoTarget(next);
    if (!target) {
        throw new Error('cannot apply contextInfo: no compatible submessage found');
    }
    target.contextInfo = { ...target.contextInfo, ...proto };
    return next;
}
/**
 * Reads the disappearing-message TTL (`contextInfo.expiration`) from the first
 * submessage that carries it. Unwraps `ephemeralMessage` if present. Returns
 * `undefined` when no submessage has an `expiration` set.
 */
export function pickIncomingExpirationSeconds(message) {
    if (!message)
        return undefined;
    const inner = message.ephemeralMessage?.message ?? message;
    for (const key of Object.keys(inner)) {
        const value = inner[key];
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !(value instanceof Uint8Array)) {
            const ctx = value.contextInfo;
            if (ctx?.expiration !== undefined && ctx.expiration !== null) {
                return ctx.expiration;
            }
        }
    }
    return undefined;
}
/**
 * Reads `contextInfo.ephemeralSettingTimestamp` (Unix seconds) from the first
 * submessage that carries it. Peers stamp it on every message in a disappearing
 * chat, which makes it the only continuously-refreshed source for the setting -
 * history sync and `EPHEMERAL_SETTING` are point-in-time.
 */
export function pickIncomingEphemeralSettingTimestamp(message) {
    if (!message)
        return undefined;
    const inner = message.ephemeralMessage?.message ?? message;
    for (const key of Object.keys(inner)) {
        const value = inner[key];
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !(value instanceof Uint8Array)) {
            const stamp = value.contextInfo?.ephemeralSettingTimestamp;
            if (stamp !== undefined && stamp !== null) {
                return longToNumber(stamp);
            }
        }
    }
    return undefined;
}
function pickContextInfoTarget(message) {
    for (const key of Object.keys(message)) {
        const value = message[key];
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !(value instanceof Uint8Array)) {
            return value;
        }
    }
    return null;
}
/** Reads the `contextInfo` off a message's first content submessage (null when absent). */
export function getContextInfo(message) {
    return pickContextInfoTarget(message)?.contextInfo ?? null;
}
export function resolveSendContextInfo(input) {
    const ctx = {
        ...(input.contentLevel ?? {}),
        ...(input.optionsLevel ?? {})
    };
    if (input.quote) {
        const q = input.quote;
        ctx.quotedMessageId = q.id ?? q.key?.id ?? ctx.quotedMessageId;
        const explicit = q.participant ?? q.key?.participant;
        const quotedRemote = q.remoteJid ?? q.key?.remoteJid;
        const quotedFromMe = q.fromMe ?? q.key?.fromMe;
        const dmFallback = explicit === undefined && quotedRemote && !isGroupOrBroadcastJid(quotedRemote)
            ? quotedFromMe
                ? input.meLid
                : quotedRemote
            : undefined;
        ctx.quotedParticipant = explicit ?? dmFallback ?? ctx.quotedParticipant;
        const crossChat = quotedRemote !== undefined &&
            (input.targetJid === undefined || !isSameChatJid(quotedRemote, input.targetJid));
        if (quotedRemote !== undefined) {
            if (crossChat) {
                ctx.quotedRemoteJid = quotedRemote;
            }
            else {
                delete ctx.quotedRemoteJid;
            }
        }
        ctx.quotedMessage = q.message ?? ctx.quotedMessage;
    }
    if (input.forward) {
        const explicit = typeof input.forward === 'object' ? input.forward.score : undefined;
        const base = ctx.forwardingScore ?? 0;
        ctx.isForwarded = true;
        ctx.forwardingScore = explicit ?? (base > 0 ? base + 1 : 1);
    }
    if (input.mentions?.length) {
        ctx.mentionedJids = input.mentions;
    }
    return hasAnyKey(ctx) ? ctx : null;
}
function hasAnyKey(value) {
    for (const _ in value) {
        return true;
    }
    return false;
}
function isSameChatJid(a, b) {
    return toUserJid(a) === toUserJid(b);
}
