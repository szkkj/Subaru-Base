"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVerifiedNameNode = parseVerifiedNameNode;
exports.parseBusinessProfileNode = parseBusinessProfileNode;
exports.parseBusinessNotificationEvents = parseBusinessNotificationEvents;
const incoming_1 = require("../events/incoming");
const _proto_1 = require("../../proto");
const constants_1 = require("../../protocol/constants");
const nodes_1 = require("../../protocol/nodes");
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
const VN_ISSUER_API = 'ent:wa';
const VN_ISSUER_SMB = 'smb:wa';
function parseCertificateContent(contentBytes) {
    try {
        const cert = _proto_1.proto.VerifiedNameCertificate.decode(contentBytes);
        if (!cert.details)
            return null;
        const details = _proto_1.proto.VerifiedNameCertificate.Details.decode(cert.details);
        return {
            name: details.verifiedName ?? undefined,
            serial: details.serial !== null && details.serial !== undefined
                ? details.serial.toString()
                : undefined,
            isApi: details.issuer === VN_ISSUER_API,
            isSmb: details.issuer === VN_ISSUER_SMB
        };
    }
    catch {
        return null;
    }
}
function parseVerifiedNameNode(node) {
    if (node.tag !== constants_1.WA_BUSINESS_NOTIFICATION_TAGS.VERIFIED_NAME)
        return null;
    const level = node.attrs.verified_level;
    const attrSerial = node.attrs.serial;
    const contentBytes = (0, helpers_1.getNodeBytesContent)(node);
    const certData = contentBytes !== undefined ? parseCertificateContent(contentBytes) : null;
    const entry = {
        name: certData?.name,
        level,
        serial: attrSerial ?? certData?.serial,
        isApi: certData?.isApi === true,
        isSmb: certData?.isSmb === true
    };
    const actualActors = node.attrs.actual_actors;
    const hostStorage = node.attrs.host_storage;
    const privacyModeTs = node.attrs.privacy_mode_ts;
    if (actualActors !== undefined && hostStorage !== undefined && privacyModeTs !== undefined) {
        entry.privacyMode = {
            actualActors: Number.parseInt(actualActors, 10),
            hostStorage: Number.parseInt(hostStorage, 10),
            privacyModeTs: Number.parseInt(privacyModeTs, 10)
        };
    }
    return entry;
}
function parseBusinessCategories(node) {
    const children = (0, helpers_1.getNodeChildren)(node);
    const categories = new Array(children.length);
    let count = 0;
    for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (child.tag !== 'category')
            continue;
        const id = child.attrs.id;
        if (!id)
            continue;
        categories[count] = { id, name: (0, helpers_1.getNodeTextContent)(child) ?? '' };
        count += 1;
    }
    categories.length = count;
    return categories;
}
function parseBusinessHoursNode(node) {
    const timezone = node.attrs.timezone;
    const children = (0, helpers_1.getNodeChildren)(node);
    const config = new Array(children.length);
    let count = 0;
    for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (child.tag !== 'business_hours_config')
            continue;
        const dayOfWeek = child.attrs.day_of_week;
        const mode = child.attrs.mode;
        if (!dayOfWeek || !mode)
            continue;
        const entry = { dayOfWeek, mode };
        const openTime = child.attrs.open_time;
        const closeTime = child.attrs.close_time;
        if (openTime)
            entry.openTime = Number.parseInt(openTime, 10);
        if (closeTime)
            entry.closeTime = Number.parseInt(closeTime, 10);
        config[count] = entry;
        count += 1;
    }
    config.length = count;
    return { timezone, config };
}
function parseProfileOptions(node) {
    const children = (0, helpers_1.getNodeChildren)(node);
    const options = {};
    for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        const text = (0, helpers_1.getNodeTextContent)(child);
        if (text !== undefined) {
            options[child.tag] = text;
        }
    }
    return options;
}
function parseBusinessProfileNode(node) {
    if (node.tag !== constants_1.WA_BUSINESS_NOTIFICATION_TAGS.PROFILE)
        return null;
    const jid = node.attrs.jid;
    if (!jid)
        return null;
    const entry = { jid };
    const tag = node.attrs.tag;
    if (tag)
        entry.tag = tag;
    const children = node.content;
    if (!Array.isArray(children)) {
        return entry;
    }
    const websites = [];
    for (let j = 0; j < children.length; j += 1) {
        const child = children[j];
        const text = (0, helpers_1.getNodeTextContent)(child);
        switch (child.tag) {
            case 'description':
                if (text !== undefined)
                    entry.description = text;
                break;
            case 'address':
                if (text !== undefined)
                    entry.address = text;
                break;
            case 'email':
                if (text !== undefined)
                    entry.email = text;
                break;
            case 'website':
                if (text !== undefined)
                    websites.push({ url: text });
                break;
            case 'latitude':
                if (text !== undefined) {
                    const val = Number.parseFloat(text);
                    if (!Number.isNaN(val))
                        entry.latitude = val;
                }
                break;
            case 'longitude':
                if (text !== undefined) {
                    const val = Number.parseFloat(text);
                    if (!Number.isNaN(val))
                        entry.longitude = val;
                }
                break;
            case 'categories':
                entry.categories = parseBusinessCategories(child);
                break;
            case 'business_hours':
                entry.businessHours = parseBusinessHoursNode(child);
                break;
            case 'profile_options':
                entry.profileOptions = parseProfileOptions(child);
                break;
        }
    }
    if (websites.length > 0)
        entry.websites = websites;
    return entry;
}
function parseSubscriptionsList(node) {
    const subs = [];
    for (const sub of (0, helpers_1.getNodeChildrenByTag)(node, 'subscription')) {
        const id = sub.attrs.id;
        const status = sub.attrs.status;
        if (!id || !status)
            continue;
        subs.push({
            id,
            status,
            tier: (0, primitives_1.parseOptionalInt)(sub.attrs.subscription_tier),
            source: sub.attrs.source,
            startTime: (0, primitives_1.parseOptionalInt)(sub.attrs.subscription_start_time),
            creationTime: (0, primitives_1.parseOptionalInt)(sub.attrs.subscription_creation_time),
            expirationDate: (0, primitives_1.parseOptionalInt)(sub.attrs.subscription_end_time)
        });
    }
    return subs;
}
function parseFeatureFlagsList(node) {
    const flags = [];
    for (const flag of (0, helpers_1.getNodeChildrenByTag)(node, 'feature_flag')) {
        const name = flag.attrs.name;
        if (!name)
            continue;
        const enabled = (flag.attrs.enabled ?? '').toLowerCase() === 'true';
        flags.push({
            name,
            enabled,
            expirationTime: (0, primitives_1.parseOptionalInt)(flag.attrs.expiration_time),
            limit: (0, primitives_1.parseOptionalInt)(flag.attrs.limit)
        });
    }
    return flags;
}
function parseProductIds(catalogNode) {
    const ids = [];
    for (const product of (0, helpers_1.getNodeChildrenByTag)(catalogNode, 'product')) {
        const idNode = (0, helpers_1.findNodeChild)(product, nodes_1.WA_NODE_TAGS.ID);
        if (!idNode)
            continue;
        const text = (0, helpers_1.getNodeTextContent)(idNode);
        if (text)
            ids.push(text);
    }
    return ids;
}
function parseCollectionUpdates(catalogNode) {
    const collections = [];
    for (const collection of (0, helpers_1.getNodeChildrenByTag)(catalogNode, 'collection')) {
        const id = collection.attrs.id;
        if (!id)
            continue;
        const entry = { id };
        const statusInfo = (0, helpers_1.findNodeChild)(collection, 'status_info');
        if (statusInfo) {
            const statusNode = (0, helpers_1.findNodeChild)(statusInfo, nodes_1.WA_NODE_TAGS.STATUS);
            if (statusNode) {
                const text = (0, helpers_1.getNodeTextContent)(statusNode);
                if (text)
                    entry.reviewStatus = text;
            }
            const rejectNode = (0, helpers_1.findNodeChild)(statusInfo, 'reject_reason');
            if (rejectNode) {
                const text = (0, helpers_1.getNodeTextContent)(rejectNode);
                if (text)
                    entry.rejectReason = text;
            }
            const commerceNode = (0, helpers_1.findNodeChild)(statusInfo, 'commerce_url');
            if (commerceNode) {
                const text = (0, helpers_1.getNodeTextContent)(commerceNode);
                if (text)
                    entry.commerceUrl = text;
            }
        }
        collections.push(entry);
    }
    return collections;
}
function createBaseBusinessEvent(notificationNode) {
    return {
        rawNode: notificationNode,
        stanzaId: notificationNode.attrs.id,
        chatJid: notificationNode.attrs.from,
        stanzaType: notificationNode.attrs.type,
        offline: notificationNode.attrs.offline !== undefined,
        timestampSeconds: (0, primitives_1.parseOptionalInt)(notificationNode.attrs.t)
    };
}
function parseSingleBusinessEvent(notificationNode) {
    const base = createBaseBusinessEvent(notificationNode);
    const verifiedName = (0, helpers_1.findNodeChild)(notificationNode, constants_1.WA_BUSINESS_NOTIFICATION_TAGS.VERIFIED_NAME);
    if (verifiedName) {
        const vnJid = verifiedName.attrs.jid;
        if (vnJid) {
            const parsed = parseVerifiedNameNode(verifiedName);
            if (!parsed)
                return null;
            return {
                ...base,
                action: 'verified_name_update',
                bizJid: vnJid,
                verifiedName: parsed
            };
        }
        const vnHash = verifiedName.attrs.hash;
        if (vnHash) {
            return {
                ...base,
                action: 'verified_name_stale',
                bizHash: vnHash
            };
        }
        return null;
    }
    const remove = (0, helpers_1.findNodeChild)(notificationNode, constants_1.WA_BUSINESS_NOTIFICATION_TAGS.REMOVE);
    if (remove) {
        const rmJid = remove.attrs.jid;
        if (rmJid) {
            return { ...base, action: 'business_removed', bizJid: rmJid };
        }
        const rmHash = remove.attrs.hash;
        if (rmHash) {
            return { ...base, action: 'business_removed', bizHash: rmHash };
        }
        return null;
    }
    const profile = (0, helpers_1.findNodeChild)(notificationNode, constants_1.WA_BUSINESS_NOTIFICATION_TAGS.PROFILE);
    if (profile) {
        const hash = profile.attrs.hash;
        if (hash) {
            return { ...base, action: 'profile_update', bizHash: hash };
        }
        const fromJid = notificationNode.attrs.from;
        return { ...base, action: 'profile_update', bizJid: fromJid };
    }
    const catalog = (0, helpers_1.findNodeChild)(notificationNode, constants_1.WA_BUSINESS_NOTIFICATION_TAGS.PRODUCT_CATALOG);
    if (catalog) {
        const fromJid = notificationNode.attrs.from;
        if ((0, helpers_1.findNodeChild)(catalog, 'product')) {
            return {
                ...base,
                action: 'product_update',
                bizJid: fromJid,
                productIds: parseProductIds(catalog)
            };
        }
        if ((0, helpers_1.findNodeChild)(catalog, 'collection')) {
            return {
                ...base,
                action: 'collection_update',
                bizJid: fromJid,
                collections: parseCollectionUpdates(catalog)
            };
        }
        return null;
    }
    const subscriptions = (0, helpers_1.findNodeChild)(notificationNode, constants_1.WA_BUSINESS_NOTIFICATION_TAGS.SUBSCRIPTIONS);
    const featureFlags = (0, helpers_1.findNodeChild)(notificationNode, constants_1.WA_BUSINESS_NOTIFICATION_TAGS.FEATURE_FLAGS);
    if (subscriptions || featureFlags) {
        return {
            ...base,
            action: 'subscriptions_update',
            bizJid: notificationNode.attrs.from,
            subscriptions: subscriptions ? parseSubscriptionsList(subscriptions) : [],
            featureFlags: featureFlags ? parseFeatureFlagsList(featureFlags) : []
        };
    }
    return null;
}
function parseBusinessNotificationEvents(notificationNode) {
    if (notificationNode.tag !== nodes_1.WA_NODE_TAGS.NOTIFICATION ||
        notificationNode.attrs.type !== constants_1.WA_NOTIFICATION_TYPES.BUSINESS) {
        return { events: [], unhandled: [] };
    }
    try {
        const event = parseSingleBusinessEvent(notificationNode);
        if (event) {
            return { events: [event], unhandled: [] };
        }
        const firstChild = (0, helpers_1.getNodeChildren)(notificationNode)[0];
        const childTag = firstChild?.tag ?? 'empty';
        return {
            events: [],
            unhandled: [
                (0, incoming_1.createUnhandledIncomingNodeEvent)(notificationNode, `notification.${constants_1.WA_NOTIFICATION_TYPES.BUSINESS}.${childTag}.not_supported`)
            ]
        };
    }
    catch {
        return {
            events: [],
            unhandled: [
                (0, incoming_1.createUnhandledIncomingNodeEvent)(notificationNode, `notification.${constants_1.WA_NOTIFICATION_TYPES.BUSINESS}.parse_failed`)
            ]
        };
    }
}
