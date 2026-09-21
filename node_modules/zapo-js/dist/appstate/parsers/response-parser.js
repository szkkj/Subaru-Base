"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSyncResponse = parseSyncResponse;
exports.parseCollectionState = parseCollectionState;
const utils_1 = require("../utils");
const _proto_1 = require("../../proto");
const constants_1 = require("../../protocol/constants");
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
/**
 * Parses an app-state `sync` IQ response into one payload per collection,
 * decoding embedded patches and snapshot references. Throws when the IQ is
 * an error envelope or missing the `<sync>` child.
 */
function parseSyncResponse(iqNode) {
    if (iqNode.tag !== constants_1.WA_NODE_TAGS.IQ) {
        throw new Error(`invalid sync response tag ${iqNode.tag}`);
    }
    const syncNode = (0, helpers_1.findNodeChild)(iqNode, constants_1.WA_NODE_TAGS.SYNC);
    if (!syncNode) {
        if (iqNode.attrs.type === constants_1.WA_IQ_TYPES.ERROR) {
            const errorNode = (0, helpers_1.findNodeChild)(iqNode, constants_1.WA_NODE_TAGS.ERROR);
            const code = errorNode?.attrs.code ?? 'unknown';
            const text = errorNode?.attrs.text ?? 'unknown';
            throw new Error(`sync iq failed (${code}: ${text})`);
        }
        throw new Error('sync response is missing <sync> node');
    }
    const payloads = [];
    for (const collectionNode of (0, helpers_1.getNodeChildrenByTag)(syncNode, constants_1.WA_NODE_TAGS.COLLECTION)) {
        const collection = (0, utils_1.parseCollectionName)(collectionNode.attrs.name);
        if (!collection) {
            throw new Error(`invalid app-state collection name: ${collectionNode.attrs.name}`);
        }
        const state = parseCollectionState(collectionNode);
        const versionAttr = collectionNode.attrs.version;
        let version;
        if (versionAttr) {
            version = (0, primitives_1.parseOptionalInt)(versionAttr);
            if (version === undefined) {
                throw new Error(`invalid app-state collection version "${versionAttr}"`);
            }
        }
        const [patchesNode, snapshotNode] = (0, helpers_1.findNodeChildrenByTags)(collectionNode, [
            constants_1.WA_NODE_TAGS.PATCHES,
            constants_1.WA_NODE_TAGS.SNAPSHOT
        ]);
        const patches = [];
        if (patchesNode) {
            for (const patchNode of (0, helpers_1.getNodeChildrenByTag)(patchesNode, constants_1.WA_NODE_TAGS.PATCH)) {
                patches.push(_proto_1.proto.SyncdPatch.decode((0, helpers_1.decodeNodeContentBase64OrBytes)(patchNode.content, 'collection.patches.patch')));
            }
        }
        const snapshotReference = snapshotNode
            ? _proto_1.proto.ExternalBlobReference.decode((0, helpers_1.decodeNodeContentBase64OrBytes)(snapshotNode.content, 'collection.snapshot'))
            : undefined;
        payloads.push({
            collection,
            state,
            version,
            patches,
            snapshotReference
        });
    }
    return payloads;
}
/**
 * Reads a `<collection>` node and returns the right
 * {@link AppStateCollectionState} (success / has-more / conflict / fatal /
 * retryable) based on its `type` attribute and embedded error code.
 */
function parseCollectionState(node) {
    const type = node.attrs.type;
    const hasMorePatches = node.attrs.has_more_patches === 'true';
    if (type !== constants_1.WA_IQ_TYPES.ERROR) {
        return hasMorePatches
            ? constants_1.WA_APP_STATE_COLLECTION_STATES.SUCCESS_HAS_MORE
            : constants_1.WA_APP_STATE_COLLECTION_STATES.SUCCESS;
    }
    const errorNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_NODE_TAGS.ERROR);
    const code = errorNode?.attrs.code;
    if (code === constants_1.WA_APP_STATE_ERROR_CODES.CONFLICT) {
        return hasMorePatches
            ? constants_1.WA_APP_STATE_COLLECTION_STATES.CONFLICT_HAS_MORE
            : constants_1.WA_APP_STATE_COLLECTION_STATES.CONFLICT;
    }
    if (code === constants_1.WA_APP_STATE_ERROR_CODES.BAD_REQUEST ||
        code === constants_1.WA_APP_STATE_ERROR_CODES.NOT_FOUND ||
        code === constants_1.WA_APP_STATE_ERROR_CODES.NOT_ALLOWED ||
        code === constants_1.WA_APP_STATE_ERROR_CODES.NOT_ACCEPTABLE) {
        return constants_1.WA_APP_STATE_COLLECTION_STATES.ERROR_FATAL;
    }
    return constants_1.WA_APP_STATE_COLLECTION_STATES.ERROR_RETRY;
}
