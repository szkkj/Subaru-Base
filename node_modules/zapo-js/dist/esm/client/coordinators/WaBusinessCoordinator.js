import { parseBusinessProfileNode, parseVerifiedNameNode } from '../events/business.js';
import { assertMediaUploadStatus, parseMediaUploadJsonBody, performPlaintextMediaUpload } from '../media.js';
import { PPS_UPLOAD_PATHS } from '../../media/constants.js';
import { WA_NODE_TAGS } from '../../protocol/nodes.js';
import { WA_BUSINESS_NOTIFICATION_TAGS } from '../../protocol/notification.js';
import { buildCoverPhotoIq, buildEditBusinessProfileIq, buildGetBusinessProfileIq, buildGetBusinessUsyncQueryNode, buildGetVerifiedNameIq } from '../../transport/node/builders/business.js';
import { buildUsyncIq, iterateUsyncUsers, parseUsyncResultEnvelope } from '../../transport/node/builders/usync.js';
import { findNodeChild, getNodeChildren } from '../../transport/node/helpers.js';
import { assertIqResult } from '../../transport/node/query.js';
import { logUsyncProtocolErrors } from '../../transport/node/usync.js';
function parseBusinessProfiles(result) {
    const bizNode = findNodeChild(result, 'business_profile');
    if (!bizNode) {
        return [];
    }
    const profileNodes = getNodeChildren(bizNode);
    const results = new Array(profileNodes.length);
    let count = 0;
    for (let i = 0; i < profileNodes.length; i += 1) {
        const parsed = parseBusinessProfileNode(profileNodes[i]);
        if (!parsed)
            continue;
        results[count] = parsed;
        count += 1;
    }
    results.length = count;
    return results;
}
function parseVerifiedName(result) {
    const vnNode = findNodeChild(result, WA_BUSINESS_NOTIFICATION_TAGS.VERIFIED_NAME);
    if (!vnNode)
        return null;
    return parseVerifiedNameNode(vnNode);
}
function parseUsyncVerifiedNames(result) {
    const userNodes = iterateUsyncUsers(result) ?? [];
    const out = new Array(userNodes.length);
    let count = 0;
    for (let i = 0; i < userNodes.length; i += 1) {
        const userNode = userNodes[i];
        const jid = userNode.attrs.jid;
        if (!jid)
            continue;
        const businessNode = findNodeChild(userNode, WA_NODE_TAGS.BUSINESS);
        const errorNode = businessNode ? findNodeChild(businessNode, WA_NODE_TAGS.ERROR) : undefined;
        const vnNode = businessNode && !errorNode
            ? findNodeChild(businessNode, WA_BUSINESS_NOTIFICATION_TAGS.VERIFIED_NAME)
            : undefined;
        out[count] = {
            jid,
            verifiedName: vnNode ? parseVerifiedNameNode(vnNode) : null
        };
        count += 1;
    }
    out.length = count;
    return out;
}
/** Builds a {@link WaBusinessCoordinator} from its IQ/media dependencies. */
export function createBusinessCoordinator(options) {
    const { queryWithContext, mediaTransfer, getMediaConn, logger, generateSid } = options;
    return {
        getBusinessProfile: async (jids) => {
            if (jids.length === 0)
                return [];
            const node = buildGetBusinessProfileIq(jids);
            const result = await queryWithContext('business.getProfile', node, undefined, {
                count: jids.length
            });
            assertIqResult(result, 'business.getProfile');
            return parseBusinessProfiles(result);
        },
        editBusinessProfile: async (input) => {
            const node = buildEditBusinessProfileIq(input);
            const result = await queryWithContext('business.editProfile', node);
            assertIqResult(result, 'business.editProfile');
        },
        getVerifiedName: async (jid) => {
            const node = buildGetVerifiedNameIq(jid);
            const result = await queryWithContext('business.getVerifiedName', node, undefined, {
                jid
            });
            assertIqResult(result, 'business.getVerifiedName');
            return parseVerifiedName(result);
        },
        getVerifiedNames: async (jids) => {
            if (jids.length === 0)
                return [];
            const sid = await generateSid();
            const usyncNode = buildUsyncIq({
                sid,
                queryProtocolNodes: [buildGetBusinessUsyncQueryNode()],
                users: jids.map((jid) => ({ jid }))
            });
            const result = await queryWithContext('business.getVerifiedNames', usyncNode, undefined, { count: jids.length });
            assertIqResult(result, 'business.getVerifiedNames');
            logUsyncProtocolErrors(parseUsyncResultEnvelope(result), logger, 'business.getVerifiedNames');
            return parseUsyncVerifiedNames(result);
        },
        updateCoverPhoto: async (media) => {
            const mediaConn = await getMediaConn();
            const upload = await performPlaintextMediaUpload({ mediaTransfer, mediaConn, logger }, {
                source: media,
                path: PPS_UPLOAD_PATHS['biz-cover-photo'],
                logLabel: 'sending business cover photo upload'
            });
            assertMediaUploadStatus(upload.status, 'business cover photo upload');
            const parsed = parseMediaUploadJsonBody(upload.responseBytes, 'business cover photo upload');
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
            const node = buildCoverPhotoIq({
                op: 'update',
                id,
                timestamp: ts,
                token: parsed.meta_hmac
            });
            const result = await queryWithContext('business.updateCoverPhoto', node, undefined, {
                id
            });
            assertIqResult(result, 'business.updateCoverPhoto');
            return { id };
        },
        deleteCoverPhoto: async (id) => {
            const node = buildCoverPhotoIq({ op: 'delete', id });
            const result = await queryWithContext('business.deleteCoverPhoto', node, undefined, {
                id
            });
            assertIqResult(result, 'business.deleteCoverPhoto');
        }
    };
}
