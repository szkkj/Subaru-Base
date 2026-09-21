"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVICE_NOTIFICATION_ACTIONS = void 0;
exports.parseDeviceNotification = parseDeviceNotification;
const jid_1 = require("../../protocol/jid");
const nodes_1 = require("../../protocol/nodes");
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
exports.DEVICE_NOTIFICATION_ACTIONS = Object.freeze({
    ADD: 'add',
    REMOVE: 'remove',
    UPDATE: 'update'
});
function parseDeviceNotification(node) {
    const stanzaId = node.attrs.id;
    const fromJid = node.attrs.from;
    if (!stanzaId || !fromJid) {
        return null;
    }
    let action;
    let actionNode;
    const removeNode = (0, helpers_1.findNodeChild)(node, exports.DEVICE_NOTIFICATION_ACTIONS.REMOVE);
    const addNode = removeNode ? undefined : (0, helpers_1.findNodeChild)(node, exports.DEVICE_NOTIFICATION_ACTIONS.ADD);
    const updateNode = removeNode || addNode ? undefined : (0, helpers_1.findNodeChild)(node, exports.DEVICE_NOTIFICATION_ACTIONS.UPDATE);
    if (removeNode) {
        action = exports.DEVICE_NOTIFICATION_ACTIONS.REMOVE;
        actionNode = removeNode;
    }
    else if (addNode) {
        action = exports.DEVICE_NOTIFICATION_ACTIONS.ADD;
        actionNode = addNode;
    }
    else if (updateNode) {
        action = exports.DEVICE_NOTIFICATION_ACTIONS.UPDATE;
        actionNode = updateNode;
    }
    else {
        return null;
    }
    const devices = [];
    if (action !== exports.DEVICE_NOTIFICATION_ACTIONS.UPDATE && actionNode) {
        const deviceNodes = (0, helpers_1.getNodeChildrenByTag)(actionNode, nodes_1.WA_NODE_TAGS.DEVICE);
        for (let index = 0; index < deviceNodes.length; index += 1) {
            const deviceNode = deviceNodes[index];
            const jidAttr = deviceNode.attrs.jid;
            if (!jidAttr) {
                continue;
            }
            let deviceId;
            try {
                deviceId = (0, jid_1.parseSignalAddressFromJid)(jidAttr).device;
            }
            catch {
                continue;
            }
            const keyIndex = (0, primitives_1.parseOptionalInt)(deviceNode.attrs['key-index']) ?? null;
            devices[devices.length] = {
                deviceId,
                keyIndex
            };
        }
    }
    return {
        action,
        stanzaId,
        fromJid,
        lid: node.attrs.lid ?? null,
        hash: action === exports.DEVICE_NOTIFICATION_ACTIONS.UPDATE ? (actionNode?.attrs.hash ?? null) : null,
        devices
    };
}
