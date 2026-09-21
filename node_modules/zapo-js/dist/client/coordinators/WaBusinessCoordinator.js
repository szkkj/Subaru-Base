"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBusinessCoordinator = createBusinessCoordinator;
const business_1 = require("../events/business");
const media_1 = require("../media");
const constants_1 = require("../../media/constants");
const nodes_1 = require("../../protocol/nodes");
const notification_1 = require("../../protocol/notification");
const business_2 = require("../../transport/node/builders/business");
const usync_1 = require("../../transport/node/builders/usync");
const helpers_1 = require("../../transport/node/helpers");
const query_1 = require("../../transport/node/query");
const usync_2 = require("../../transport/node/usync");
function parseBusinessProfiles(result) {
    const bizNode = (0, helpers_1.findNodeChild)(result, 'business_profile');
    if (!bizNode) {
        return [];
    }
    const profileNodes = (0, helpers_1.getNodeChildren)(bizNode);
    const results = new Array(profileNodes.length);
    let count = 0;
    for (let i = 0; i < profileNodes.length; i += 1) {
        const parsed = (0, business_1.parseBusinessProfileNode)(profileNodes[i]);
        if (!parsed)
            continue;
        results[count] = parsed;
        count += 1;
    }
    results.length = count;
    return results;
}
function parseVerifiedName(result) {
    const vnNode = (0, helpers_1.findNodeChild)(result, notification_1.WA_BUSINESS_NOTIFICATION_TAGS.VERIFIED_NAME);
    if (!vnNode)
        return null;
    return (0, business_1.parseVerifiedNameNode)(vnNode);
}
function parseUsyncVerifiedNames(result) {
    const userNodes = (0, usync_1.iterateUsyncUsers)(result) ?? [];
    const out = new Array(userNodes.length);
    let count = 0;
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const jid = userNode.attrs.jid;
        if (!jid)
            continue;
        const businessNode = (0, helpers_1.findNodeChild)(userNode, nodes_1.WA_NODE_TAGS.BUSINESS);
        const errorNode = businessNode ? (0, helpers_1.findNodeChild)(businessNode, nodes_1.WA_NODE_TAGS.ERROR) : undefined;
        const vnNode = businessNode && !errorNode
            ? (0, helpers_1.findNodeChild)(businessNode, notification_1.WA_BUSINESS_NOTIFICATION_TAGS.VERIFIED_NAME)
            : undefined;
        out[count] = {
            jid,
            verifiedName: vnNode ? (0, business_1.parseVerifiedNameNode)(vnNode) : null
        };
        count += 1;
    }
    out.length = count;
    return out;
}
/** Builds a {@link WaBusinessCoordinator} from its IQ/media dependencies. */
function createBusinessCoordinator(options) {
    const { queryWithContext, mediaTransfer, getMediaConn, logger, generateSid } = options;
    return {
        getBusinessProfile: async (jids) => {
            if (jids.length === 0)
                return [];
            const node = (0, business_2.buildGetBusinessProfileIq)(jids);
            const result = await queryWithContext('business.getProfile', node, undefined, {
                count: jids.length
            });
            (0, query_1.assertIqResult)(result, 'business.getProfile');
            return parseBusinessProfiles(result);
        },
        editBusinessProfile: async (input) => {
            const node = (0, business_2.buildEditBusinessProfileIq)(input);
            const result = await queryWithContext('business.editProfile', node);
            (0, query_1.assertIqResult)(result, 'business.editProfile');
        },
        getVerifiedName: async (jid) => {
            const node = (0, business_2.buildGetVerifiedNameIq)(jid);
            const result = await queryWithContext('business.getVerifiedName', node, undefined, {
                jid
            });
            (0, query_1.assertIqResult)(result, 'business.getVerifiedName');
            return parseVerifiedName(result);
        },
        getVerifiedNames: async (jids) => {
            if (jids.length === 0)
                return [];
            const sid = await generateSid();
            const usyncNode = (0, usync_1.buildUsyncIq)({
                sid,
                queryProtocolNodes: [(0, business_2.buildGetBusinessUsyncQueryNode)()],
                users: jids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('business.getVerifiedNames', usyncNode, undefined, { count: jids.length });
            (0, query_1.assertIqResult)(result, 'business.getVerifiedNames');
            (0, usync_2.logUsyncProtocolErrors)((0, usync_1.parseUsyncResultEnvelope)(result), logger, 'business.getVerifiedNames');
            return parseUsyncVerifiedNames(result);
        },
        updateCoverPhoto: async (media) => {
            const mediaConn = await getMediaConn();
            const upload = await (0, media_1.performPlaintextMediaUpload)({ mediaTransfer, mediaConn, logger }, {
                source: media,
                path: constants_1.PPS_UPLOAD_PATHS['biz-cover-photo'],
                logLabel: 'sending business cover photo upload'
            });
            (0, media_1.assertMediaUploadStatus)(upload.status, 'business cover photo upload');
            const parsed = (0, media_1.parseMediaUploadJsonBody)(upload.responseBytes, 'business cover photo upload');
            if (parsed.fbid === undefined ||
                parsed.fbid === null ||
                parsed.fbid === '' ||
                parsed.ts === undefined ||
                parsed.ts === null ||
                parsed.ts === '' ||
                !parsed.meta_hmac) {
                throw new Error('business cover photo upload response missing fbid/ts/meta_hmac');
            }
            const id = String(parsed.fbid);
            const ts = String(parsed.ts);
            const node = (0, business_2.buildCoverPhotoIq)({
                op: 'update',
                id,
                timestamp: ts,
                token: parsed.meta_hmac
            });
            const result = await queryWithContext('business.updateCoverPhoto', node, undefined, {
                id
            });
            (0, query_1.assertIqResult)(result, 'business.updateCoverPhoto');
            return { id };
        },
        deleteCoverPhoto: async (id) => {
            const node = (0, business_2.buildCoverPhotoIq)({ op: 'delete', id });
            const result = await queryWithContext('business.deleteCoverPhoto', node, undefined, {
                id
            });
            (0, query_1.assertIqResult)(result, 'business.deleteCoverPhoto');
        }
    };
}
