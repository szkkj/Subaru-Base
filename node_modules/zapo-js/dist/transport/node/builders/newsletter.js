"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNewsletterMessageNode = buildNewsletterMessageNode;
exports.buildNewsletterViewReceiptNode = buildNewsletterViewReceiptNode;
exports.buildNewsletterSubscribeLiveUpdatesIq = buildNewsletterSubscribeLiveUpdatesIq;
exports.buildNewsletterMessagesIq = buildNewsletterMessagesIq;
exports.buildNewsletterMessageUpdatesIq = buildNewsletterMessageUpdatesIq;
const defaults_1 = require("../../../protocol/defaults");
const message_1 = require("../../../protocol/message");
const nodes_1 = require("../../../protocol/nodes");
const query_1 = require("../../node/query");
function plaintextChild(plaintext, mediaType) {
    return {
        tag: nodes_1.WA_NODE_TAGS.PLAINTEXT,
        attrs: mediaType ? { mediatype: mediaType } : {},
        content: plaintext
    };
}
function pollMetaChild(polltype, contentType) {
    const attrs = { polltype };
    if (contentType) {
        attrs.contenttype = contentType;
    }
    return { tag: 'meta', attrs };
}
function buildNewsletterMessageNode(input) {
    const attrs = { to: input.to };
    let content;
    switch (input.kind) {
        case 'text':
            attrs.id = input.id;
            attrs.type = 'text';
            content = [plaintextChild(input.plaintext)];
            break;
        case 'media':
            attrs.id = input.id;
            attrs.type = 'media';
            if (input.mediaHandle) {
                attrs.media_id = input.mediaHandle;
            }
            content = [plaintextChild(input.plaintext, input.mediaType)];
            break;
        case 'edit-text':
            attrs.id = input.parentMessageId;
            attrs.type = 'text';
            attrs.edit = message_1.WA_EDIT_ATTRS.NEWSLETTER_EDIT;
            content = [plaintextChild(input.plaintext)];
            break;
        case 'edit-media':
            attrs.id = input.parentMessageId;
            attrs.type = 'media';
            attrs.edit = message_1.WA_EDIT_ATTRS.NEWSLETTER_EDIT;
            content = [plaintextChild(input.plaintext, input.mediaType)];
            break;
        case 'reaction':
            attrs.id = input.id;
            attrs.server_id = String(input.parentMessageServerId);
            attrs.type = 'reaction';
            content = [{ tag: 'reaction', attrs: { code: input.reactionCode } }];
            break;
        case 'reaction-revoke':
            attrs.id = input.id;
            attrs.server_id = String(input.parentMessageServerId);
            attrs.type = 'reaction';
            attrs.edit = message_1.WA_EDIT_ATTRS.SENDER_REVOKE;
            content = [{ tag: 'reaction', attrs: {} }];
            break;
        case 'revoke':
            attrs.id = input.originalMessageId;
            attrs.type = 'text';
            attrs.edit = message_1.WA_EDIT_ATTRS.ADMIN_REVOKE;
            content = [{ tag: nodes_1.WA_NODE_TAGS.PLAINTEXT, attrs: {} }];
            break;
        case 'poll-creation':
            attrs.id = input.id;
            attrs.type = 'poll';
            content = [
                plaintextChild(input.plaintext),
                pollMetaChild('creation', input.contentType)
            ];
            break;
        case 'poll-vote':
            if (input.votes.length === 0) {
                throw new Error('newsletter poll vote requires at least one vote payload');
            }
            attrs.id = input.id;
            attrs.server_id = String(input.parentMessageServerId);
            attrs.type = 'poll';
            content = [
                {
                    tag: 'votes',
                    attrs: {},
                    content: input.votes.map((vote) => ({
                        tag: 'vote',
                        attrs: {},
                        content: vote
                    }))
                },
                pollMetaChild('vote', input.contentType)
            ];
            break;
    }
    if (input.additionalAttributes) {
        Object.assign(attrs, input.additionalAttributes);
    }
    return content === undefined ? { tag: 'message', attrs } : { tag: 'message', attrs, content };
}
function buildNewsletterViewReceiptNode(input) {
    if (input.itemServerIds.length === 0) {
        throw new Error('newsletter view receipt requires at least one item');
    }
    return {
        tag: 'receipt',
        attrs: {
            to: input.to,
            id: input.id,
            type: 'view'
        },
        content: [
            {
                tag: 'list',
                attrs: {},
                content: input.itemServerIds.map((serverId) => ({
                    tag: 'item',
                    attrs: { server_id: String(serverId) }
                }))
            }
        ]
    };
}
function buildNewsletterSubscribeLiveUpdatesIq(newsletterJid) {
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.SET, newsletterJid, nodes_1.WA_XMLNS.NEWSLETTER, [
        {
            tag: 'live_updates',
            attrs: {}
        }
    ]);
}
function buildNewsletterMessagesIq(input) {
    const attrs = {
        type: 'jid',
        jid: input.newsletterJid,
        count: String(input.count)
    };
    if (input.before !== undefined) {
        attrs.before = String(input.before);
    }
    else if (input.after !== undefined) {
        attrs.after = String(input.after);
    }
    if (input.viewRole) {
        attrs.view_role = input.viewRole;
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, defaults_1.WA_DEFAULTS.HOST_DOMAIN, nodes_1.WA_XMLNS.NEWSLETTER, [
        {
            tag: 'messages',
            attrs
        }
    ]);
}
function buildNewsletterMessageUpdatesIq(input) {
    if (input.before === undefined && input.after === undefined) {
        throw new Error('newsletter message updates require before or after');
    }
    const attrs = {
        count: String(input.count)
    };
    if (input.since !== undefined) {
        attrs.since = String(input.since);
    }
    if (input.before !== undefined) {
        attrs.before = String(input.before);
    }
    else if (input.after !== undefined) {
        attrs.after = String(input.after);
    }
    return (0, query_1.buildIqNode)(nodes_1.WA_IQ_TYPES.GET, input.newsletterJid, nodes_1.WA_XMLNS.NEWSLETTER, [
        {
            tag: 'message_updates',
            attrs
        }
    ]);
}
