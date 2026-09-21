"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStreamControlNode = parseStreamControlNode;
exports.parseCompanionEncStatic = parseCompanionEncStatic;
exports.parseSuccessPersistAttributes = parseSuccessPersistAttributes;
const constants_1 = require("../../protocol/constants");
const helpers_1 = require("../node/helpers");
const bytes_1 = require("../../util/bytes");
const primitives_1 = require("../../util/primitives");
function parseStreamControlNode(node) {
    if (node.tag === constants_1.WA_STREAM_SIGNALING.XML_STREAM_END_TAG) {
        return { kind: 'xmlstreamend' };
    }
    if (node.tag !== constants_1.WA_STREAM_SIGNALING.STREAM_ERROR_TAG) {
        return null;
    }
    const conflictNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_STREAM_SIGNALING.CONFLICT_TAG);
    if (conflictNode) {
        return conflictNode.attrs.type === constants_1.WA_STREAM_SIGNALING.REPLACED_TYPE
            ? { kind: 'stream_error_replaced' }
            : { kind: 'stream_error_device_removed' };
    }
    const code = (0, primitives_1.parseOptionalInt)(node.attrs.code);
    if (code !== undefined) {
        return { kind: 'stream_error_code', code };
    }
    const ackNode = (0, helpers_1.findNodeChild)(node, constants_1.WA_STREAM_SIGNALING.ACK_TAG);
    if (ackNode) {
        return { kind: 'stream_error_ack', id: ackNode.attrs.id };
    }
    if ((0, helpers_1.hasNodeChild)(node, constants_1.WA_STREAM_SIGNALING.XML_NOT_WELL_FORMED_TAG)) {
        return { kind: 'stream_error_xml_not_well_formed' };
    }
    return { kind: 'stream_error_other' };
}
function parseCompanionEncStatic(value, onError) {
    if (!value) {
        return undefined;
    }
    try {
        return (0, bytes_1.base64ToBytesChecked)(value, 'success.companion_enc_static');
    }
    catch (error) {
        if (error instanceof Error) {
            onError?.(error);
        }
        return undefined;
    }
}
function parseSuccessPersistAttributes(node, onCompanionParseError) {
    return {
        meLid: node.attrs.lid,
        meDisplayName: node.attrs.display_name,
        companionEncStatic: parseCompanionEncStatic(node.attrs.companion_enc_static, onCompanionParseError),
        lastSuccessTs: (0, primitives_1.parseOptionalInt)(node.attrs.t),
        propsVersion: (0, primitives_1.parseOptionalInt)(node.attrs.props),
        abPropsVersion: (0, primitives_1.parseOptionalInt)(node.attrs.abprops),
        connectionLocation: node.attrs.location,
        accountCreationTs: (0, primitives_1.parseOptionalInt)(node.attrs.creation)
    };
}
