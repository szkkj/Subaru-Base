import { WA_DEFAULTS } from '../../../protocol/defaults.js';
import { WA_EDIT_ATTRS } from '../../../protocol/message.js';
import { WA_IQ_TYPES, WA_NODE_TAGS, WA_XMLNS } from '../../../protocol/nodes.js';
import { buildIqNode } from '../../node/query.js';
function plaintextChild(plaintext, mediaType) {
    return {
        tag: WA_NODE_TAGS.PLAINTEXT,
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
export function buildNewsletterMessageNode(input) {
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
            attrs.edit = WA_EDIT_ATTRS.NEWSLETTER_EDIT;
            content = [plaintextChild(input.plaintext)];
            break;
        case 'edit-media':
            attrs.id = input.parentMessageId;
            attrs.type = 'media';
            attrs.edit = WA_EDIT_ATTRS.NEWSLETTER_EDIT;
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
            attrs.edit = WA_EDIT_ATTRS.SENDER_REVOKE;
            content = [{ tag: 'reaction', attrs: {} }];
            break;
        case 'revoke':
            attrs.id = input.originalMessageId;
            attrs.type = 'text';
            attrs.edit = WA_EDIT_ATTRS.ADMIN_REVOKE;
            content = [{ tag: WA_NODE_TAGS.PLAINTEXT, attrs: {} }];
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
export function buildNewsletterViewReceiptNode(input) {
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
export function buildNewsletterSubscribeLiveUpdatesIq(newsletterJid) {
    return buildIqNode(WA_IQ_TYPES.SET, newsletterJid, WA_XMLNS.NEWSLETTER, [
        {
            tag: 'live_updates',
            attrs: {}
        }
    ]);
}
export function buildNewsletterMessagesIq(input) {
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
    return buildIqNode(WA_IQ_TYPES.GET, WA_DEFAULTS.HOST_DOMAIN, WA_XMLNS.NEWSLETTER, [
        {
            tag: 'messages',
            attrs
        }
    ]);
}
export function buildNewsletterMessageUpdatesIq(input) {
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
    return buildIqNode(WA_IQ_TYPES.GET, input.newsletterJid, WA_XMLNS.NEWSLETTER, [
        {
            tag: 'message_updates',
            attrs
        }
    ]);
}
