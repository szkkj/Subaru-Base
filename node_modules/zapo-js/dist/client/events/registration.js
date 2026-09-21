"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRegistrationNotification = parseRegistrationNotification;
const notification_1 = require("../../protocol/notification");
const helpers_1 = require("../../transport/node/helpers");
const primitives_1 = require("../../util/primitives");
function parseRegistrationNotification(node) {
    const firstChild = (0, helpers_1.getFirstNodeChild)(node);
    if (!firstChild) {
        return null;
    }
    if (firstChild.tag === notification_1.WA_REGISTRATION_NOTIFICATION_TAGS.WA_OLD_REGISTRATION) {
        const code = firstChild.attrs.code;
        const expirySeconds = (0, primitives_1.parseOptionalInt)(firstChild.attrs.expiry_t);
        const fromDeviceId = firstChild.attrs.device_id;
        if (!code || expirySeconds === undefined || !fromDeviceId) {
            return null;
        }
        return {
            kind: 'registration_code',
            code,
            expiryTimestampMs: expirySeconds * 1000,
            fromDeviceId
        };
    }
    if (firstChild.tag === notification_1.WA_REGISTRATION_NOTIFICATION_TAGS.DEVICE_LOGOUT) {
        const serverToken = firstChild.attrs.id;
        const tSeconds = (0, primitives_1.parseOptionalInt)(firstChild.attrs.t);
        if (!serverToken || tSeconds === undefined) {
            return null;
        }
        return {
            kind: 'account_takeover_notice',
            serverToken,
            attemptTimestampMs: tSeconds * 1000,
            newDeviceName: firstChild.attrs.device,
            newDevicePlatform: firstChild.attrs.new_device_platform,
            newDeviceAppVersion: firstChild.attrs.new_device_app_version
        };
    }
    return null;
}
