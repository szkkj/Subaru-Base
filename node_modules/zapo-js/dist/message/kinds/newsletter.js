"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNewsletterLiveUpdates = processNewsletterLiveUpdates;
exports.processIncomingNewsletterMessage = processIncomingNewsletterMessage;
const context_info_1 = require("../context-info");
const _proto_1 = require("../../proto");
const constants_1 = require("../../protocol/constants");
const message_1 = require("../../protocol/message");
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
function processNewsletterLiveUpdates(notification, options) {
    const liveUpdates = (0, helpers_1.findNodeChild)(notification, 'live_updates');
    if (!liveUpdates)
        return;
    const messagesNode = (0, helpers_1.findNodeChild)(liveUpdates, 'messages');
    if (!messagesNode || !Array.isArray(messagesNode.content))
        return;
    const from = notification.attrs.from;
    const outerId = notification.attrs.id;
    const messagesT = messagesNode.attrs.t ?? notification.attrs.t;
    for (const inner of messagesNode.content) {
        if (inner.tag !== 'message')
            continue;
        if (!Array.isArray(inner.content) || inner.content.length === 0) {
            continue;
        }
        const synth = {
            tag: 'message',
            attrs: {
                ...(from ? { from } : {}),
                ...(outerId ? { id: outerId } : {}),
                ...(messagesT ? { t: messagesT } : {}),
                ...inner.attrs
            },
            content: inner.content
        };
        processIncomingNewsletterMessage(synth, options);
    }
}
function processIncomingNewsletterMessage(node, options) {
    const messageType = node.attrs.type;
    const editAttr = node.attrs.edit;
    let emittedAggregate = false;
    const reactionsEnvelope = (0, helpers_1.findNodeChild)(node, 'reactions');
    if (reactionsEnvelope) {
        const reactions = parseReactionAggregate(reactionsEnvelope);
        if (reactions === null) {
            emitUnhandled(node, options, 'newsletter.invalid_reactions');
            return;
        }
        emitUpdate(node, options, {
            kind: 'reaction',
            isSender: node.attrs.is_sender === 'true',
            revoked: false,
            reactions
        });
        emittedAggregate = true;
    }
    else {
        const reactionNode = (0, helpers_1.findNodeChild)(node, 'reaction');
        if (reactionNode) {
            const revoked = editAttr === message_1.WA_EDIT_ATTRS.SENDER_REVOKE || messageType === 'reaction_revoke';
            emitUpdate(node, options, {
                kind: 'reaction',
                isSender: node.attrs.is_sender === 'true',
                revoked,
                reactions: [reactionNode.attrs.code ? { code: reactionNode.attrs.code } : {}]
            });
            emittedAggregate = true;
        }
    }
    const votesNode = (0, helpers_1.findNodeChild)(node, 'votes');
    if (votesNode) {
        const votes = parsePollVotes(votesNode);
        if (votes === null) {
            emitUnhandled(node, options, 'newsletter.invalid_votes');
            return;
        }
        emitUpdate(node, options, {
            kind: 'poll_vote',
            isSender: node.attrs.is_sender === 'true',
            votes
        });
        emittedAggregate = true;
    }
    const counters = parseCounters(node);
    if (counters) {
        emitUpdate(node, options, counters);
        emittedAggregate = true;
    }
    if (emittedAggregate)
        return;
    if (editAttr === message_1.WA_EDIT_ATTRS.ADMIN_REVOKE) {
        emitUpdate(node, options, { kind: 'revoke' });
        return;
    }
    if (editAttr === message_1.WA_EDIT_ATTRS.NEWSLETTER_EDIT) {
        const decoded = decodePlaintext(node, options);
        if (decoded === null) {
            return;
        }
        emitUpdate(node, options, {
            kind: 'edit',
            plaintext: decoded.plaintext,
            message: decoded.message
        });
        return;
    }
    const decoded = decodePlaintext(node, options);
    if (decoded === null) {
        return;
    }
    const chatJid = node.attrs.from;
    const serverId = (0, primitives_1.parseOptionalInt)(node.attrs.server_id);
    const expirationSeconds = (0, context_info_1.pickIncomingExpirationSeconds)(decoded.message);
    options.emitIncomingMessage?.({
        rawNode: node,
        key: {
            remoteJid: chatJid ?? '',
            id: node.attrs.id ?? '',
            fromMe: node.attrs.is_sender === 'true',
            isGroup: false,
            isBroadcast: false,
            isNewsletter: true,
            senderDevice: 0,
            ...(serverId !== undefined ? { serverId } : {})
        },
        stanzaType: messageType,
        offline: node.attrs.offline !== undefined,
        timestampSeconds: (0, primitives_1.parseOptionalInt)(node.attrs.t),
        ...(expirationSeconds !== undefined ? { expirationSeconds } : {}),
        message: decoded.message
    });
}
function emitUpdate(node, options, update) {
    options.emitNewsletterMessageUpdate?.({
        rawNode: node,
        stanzaId: node.attrs.id,
        chatJid: node.attrs.from,
        stanzaType: node.attrs.type,
        offline: node.attrs.offline !== undefined,
        timestampSeconds: (0, primitives_1.parseOptionalInt)(node.attrs.t),
        parentMessageServerId: (0, primitives_1.parseOptionalInt)(node.attrs.server_id),
        update
    });
}
function emitUnhandled(node, options, reason) {
    options.emitUnhandledStanza?.({
        rawNode: node,
        stanzaId: node.attrs.id,
        chatJid: node.attrs.from,
        stanzaType: node.attrs.type,
        offline: node.attrs.offline !== undefined,
        reason
    });
}
function decodePlaintext(node, options) {
    const plaintextNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.PLAINTEXT);
    if (!plaintextNode) {
        emitUnhandled(node, options, 'newsletter.missing_plaintext');
        return null;
    }
    try {
        const plaintext = (0, helpers_1.decodeNodeContentBase64OrBytes)(plaintextNode.content, 'newsletter.plaintext');
        const message = _proto_1.proto.Message.decode(plaintext);
        return { plaintext, message };
    }
    catch (error) {
        options.logger.warn('failed to decode newsletter plaintext message', {
            id: node.attrs.id,
            from: node.attrs.from,
            type: node.attrs.type,
            message: (0, primitives_1.toError)(error).message
        });
        emitUnhandled(node, options, 'newsletter.decode_failed');
        return null;
    }
}
function parsePollVotes(votesNode) {
    if (!Array.isArray(votesNode.content)) {
        return null;
    }
    const entries = [];
    let withCount = 0;
    let withoutCount = 0;
    for (const child of votesNode.content) {
        if (child.tag !== 'vote')
            continue;
        if (!(child.content instanceof Uint8Array) || child.content.byteLength !== 32) {
            return null;
        }
        if (child.attrs.count === undefined) {
            entries.push({ optionHash: child.content });
            withoutCount += 1;
            continue;
        }
        const count = (0, primitives_1.parseOptionalInt)(child.attrs.count);
        if (count === undefined || count < 1) {
            return null;
        }
        entries.push({ optionHash: child.content, count });
        withCount += 1;
    }
    if (withCount > 0 && withoutCount > 0) {
        return null;
    }
    if (entries.length === 0) {
        return null;
    }
    return entries;
}
function parseCounters(node) {
    const views = parseCounterAttr((0, helpers_1.findNodeChild)(node, 'views_count'));
    const forwards = parseCounterAttr((0, helpers_1.findNodeChild)(node, 'forwards_count'));
    const responses = parseCounterAttr((0, helpers_1.findNodeChild)(node, 'responses_count'));
    if (views === undefined && forwards === undefined && responses === undefined)
        return null;
    return {
        kind: 'counters',
        ...(views !== undefined ? { views } : {}),
        ...(forwards !== undefined ? { forwards } : {}),
        ...(responses !== undefined ? { responses } : {})
    };
}
function parseCounterAttr(node) {
    if (!node)
        return undefined;
    return (0, primitives_1.parseOptionalInt)(node.attrs.count);
}
function parseReactionAggregate(envelope) {
    if (!Array.isArray(envelope.content))
        return null;
    const out = [];
    for (const child of envelope.content) {
        if (child.tag !== 'reaction')
            continue;
        const code = child.attrs.code;
        if (typeof code !== 'string' || code.length === 0)
            return null;
        const count = (0, primitives_1.parseOptionalInt)(child.attrs.count);
        if (count === undefined || count < 1)
            return null;
        out.push({ code, count });
    }
    if (out.length === 0)
        return null;
    return out;
}
