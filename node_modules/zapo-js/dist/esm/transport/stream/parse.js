import { WA_STREAM_SIGNALING } from '../../protocol/constants.js';
import { findNodeChild, hasNodeChild } from '../node/helpers.js';
import { base64ToBytesChecked } from '../../util/bytes.js';
import { parseOptionalInt } from '../../util/primitives.js';
export function parseStreamControlNode(node) {
    if (node.tag === WA_STREAM_SIGNALING.XML_STREAM_END_TAG) {
        return { kind: 'xmlstreamend' };
    }
    if (node.tag !== WA_STREAM_SIGNALING.STREAM_ERROR_TAG) {
        return null;
    }
    const conflictNode = findNodeChild(node, WA_STREAM_SIGNALING.CONFLICT_TAG);
    if (conflictNode) {
        return conflictNode.attrs.type === WA_STREAM_SIGNALING.REPLACED_TYPE
            ? { kind: 'stream_error_replaced' }
            : { kind: 'stream_error_device_removed' };
    }
    const code = parseOptionalInt(node.attrs.code);
    if (code !== undefined) {
        return { kind: 'stream_error_code', code };
    }
    const ackNode = findNodeChild(node, WA_STREAM_SIGNALING.ACK_TAG);
    if (ackNode) {
        return { kind: 'stream_error_ack', id: ackNode.attrs.id };
    }
    if (hasNodeChild(node, WA_STREAM_SIGNALING.XML_NOT_WELL_FORMED_TAG)) {
        return { kind: 'stream_error_xml_not_well_formed' };
    }
    return { kind: 'stream_error_other' };
}
export function parseCompanionEncStatic(value, onError) {
    if (!value) {
        return undefined;
    }
    try {
        return base64ToBytesChecked(value, 'success.companion_enc_static');
    }
    catch (error) {
        if (error instanceof Error) {
            onError?.(error);
        }
        return undefined;
    }
}
export function parseSuccessPersistAttributes(node, onCompanionParseError) {
    return {
        meLid: node.attrs.lid,
        meDisplayName: node.attrs.display_name,
        companionEncStatic: parseCompanionEncStatic(node.attrs.companion_enc_static, onCompanionParseError),
        lastSuccessTs: parseOptionalInt(node.attrs.t),
        propsVersion: parseOptionalInt(node.attrs.props),
        abPropsVersion: parseOptionalInt(node.attrs.abprops),
        connectionLocation: node.attrs.location,
        accountCreationTs: parseOptionalInt(node.attrs.creation)
    };
}
