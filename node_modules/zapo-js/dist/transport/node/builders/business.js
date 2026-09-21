"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WA_BUSINESS_PROFILE_VERSION = void 0;
exports.buildGetBusinessProfileIq = buildGetBusinessProfileIq;
exports.buildEditBusinessProfileIq = buildEditBusinessProfileIq;
exports.buildGetVerifiedNameIq = buildGetVerifiedNameIq;
exports.buildGetBusinessUsyncQueryNode = buildGetBusinessUsyncQueryNode;
exports.buildCoverPhotoIq = buildCoverPhotoIq;
const constants_1 = require("../../../protocol/constants");
const notification_1 = require("../../../protocol/notification");
const query_1 = require("../../node/query");
exports.WA_BUSINESS_PROFILE_VERSION = 116;
function buildGetBusinessProfileIq(jids, version = exports.WA_BUSINESS_PROFILE_VERSION) {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.BUSINESS, [
        {
            tag: 'business_profile',
            attrs: { v: `${version}` },
            content: jids.map((jid) => ({
                tag: 'profile',
                attrs: { jid }
            }))
        }
    ]);
}
function buildEditBusinessProfileIq(input) {
    const children = [];
    if (input.address !== undefined) {
        children.push({ tag: 'address', attrs: {}, content: input.address });
    }
    if (input.description !== undefined) {
        children.push({ tag: 'description', attrs: {}, content: input.description });
    }
    if (input.email !== undefined) {
        children.push({ tag: 'email', attrs: {}, content: input.email });
    }
    if (input.latitude !== undefined) {
        children.push({ tag: 'latitude', attrs: {}, content: `${input.latitude}` });
    }
    if (input.longitude !== undefined) {
        children.push({ tag: 'longitude', attrs: {}, content: `${input.longitude}` });
    }
    if (input.websites !== undefined) {
        if (input.websites.length > 2) {
            throw new Error('business profile supports at most 2 websites');
        }
        if (input.websites.length === 0) {
            children.push({ tag: 'website', attrs: {} });
        }
        else {
            children.push({ tag: 'website', attrs: {}, content: input.websites[0].url });
            if (input.websites.length > 1) {
                children.push({ tag: 'website', attrs: {}, content: input.websites[1].url });
            }
        }
    }
    if (input.categories !== undefined) {
        children.push({
            tag: 'categories',
            attrs: {},
            content: input.categories.map((cat) => ({
                tag: 'category',
                attrs: { id: cat.id }
            }))
        });
    }
    if (input.businessHours !== undefined) {
        children.push(buildBusinessHoursNode(input.businessHours));
    }
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.BUSINESS, [
        {
            tag: 'business_profile',
            attrs: { v: '3', mutation_type: 'delta' },
            content: children
        }
    ]);
}
const VALID_BUSINESS_HOURS_MODES = new Set(Object.values(constants_1.WA_BUSINESS_HOURS_MODES));
function buildBusinessHoursNode(hours) {
    const configNodes = new Array(hours.config.length);
    for (let i = 0; i < hours.config.length; i += 1) {
        const entry = hours.config[i];
        if (!VALID_BUSINESS_HOURS_MODES.has(entry.mode)) {
            throw new Error(`invalid business hours mode '${entry.mode}' (expected one of ${Object.values(constants_1.WA_BUSINESS_HOURS_MODES).join(', ')}; closed days must be omitted)`);
        }
        const attrs = {
            day_of_week: entry.dayOfWeek,
            mode: entry.mode
        };
        // open_time / close_time only apply to specific_hours; the server drops
        // them for open_24h / appointment_only.
        if (entry.mode === constants_1.WA_BUSINESS_HOURS_MODES.SPECIFIC_HOURS) {
            if (entry.openTime !== undefined) {
                attrs.open_time = `${entry.openTime}`;
            }
            if (entry.closeTime !== undefined) {
                attrs.close_time = `${entry.closeTime}`;
            }
        }
        configNodes[i] = { tag: 'business_hours_config', attrs };
    }
    const hoursAttrs = {};
    if (hours.timezone) {
        hoursAttrs.timezone = hours.timezone;
    }
    return {
        tag: 'business_hours',
        attrs: hoursAttrs,
        content: configNodes
    };
}
function buildGetVerifiedNameIq(jid) {
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.GET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.BUSINESS, [
        {
            tag: 'verified_name',
            attrs: { jid }
        }
    ]);
}
function buildGetBusinessUsyncQueryNode() {
    return {
        tag: constants_1.WA_NODE_TAGS.BUSINESS,
        attrs: {},
        content: [{ tag: notification_1.WA_BUSINESS_NOTIFICATION_TAGS.VERIFIED_NAME, attrs: {} }]
    };
}
function buildCoverPhotoIq(input) {
    const attrs = input.op === 'update'
        ? { op: 'update', id: input.id, ts: input.timestamp, token: input.token }
        : { op: 'delete', id: input.id };
    return (0, query_1.buildIqNode)(constants_1.WA_IQ_TYPES.SET, constants_1.WA_DEFAULTS.HOST_DOMAIN, constants_1.WA_XMLNS.BUSINESS, [
        {
            tag: 'business_profile',
            attrs: { v: '3', mutation_type: 'delta' },
            content: [{ tag: 'cover_photo', attrs }]
        }
    ]);
}
