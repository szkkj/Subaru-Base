"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMobileLoginPayload = buildMobileLoginPayload;
const node_crypto_1 = require("node:crypto");
const _proto_1 = require("../../proto");
function parseAppVersion(version) {
    const parts = version.split('.');
    const at = (i) => {
        const n = Number(parts[i]);
        return Number.isFinite(n) ? n : undefined;
    };
    return {
        primary: at(0) ?? 2,
        secondary: at(1) ?? 0,
        tertiary: at(2) ?? 0,
        quaternary: at(3)
    };
}
function distributionChannelId(channel) {
    const { DistributionChannel } = _proto_1.proto.ClientPayload.UserAgent;
    switch (channel) {
        case 'website':
            return DistributionChannel.WEBSITE;
        case 'testflight':
            return DistributionChannel.TESTFLIGHT;
        case 'internal':
            return DistributionChannel.INTERNAL;
        case 'appstore':
        case undefined:
            return DistributionChannel.APPSTORE;
    }
}
/**
 * Builds the encoded {@link Proto.ClientPayload} bytes the WhatsApp Mobile
 * transport sends after the noise login handshake. Throws when
 * `username`/`appVersion` are missing/invalid.
 */
function buildMobileLoginPayload(config) {
    if (!Number.isSafeInteger(config.username) || config.username <= 0) {
        throw new Error('mobile login payload requires a valid numeric username');
    }
    const info = config.deviceInfo;
    const version = parseAppVersion(info.appVersion);
    const isIos = info.os === 'ios';
    const platform = isIos
        ? info.business
            ? _proto_1.proto.ClientPayload.UserAgent.Platform.SMB_IOS
            : _proto_1.proto.ClientPayload.UserAgent.Platform.IOS
        : info.business
            ? _proto_1.proto.ClientPayload.UserAgent.Platform.SMB_ANDROID
            : _proto_1.proto.ClientPayload.UserAgent.Platform.ANDROID;
    const userAgent = {
        platform,
        releaseChannel: _proto_1.proto.ClientPayload.UserAgent.ReleaseChannel.RELEASE,
        appVersion: version,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer,
        device: info.device,
        osBuildNumber: info.osBuildNumber,
        phoneId: info.phoneId ?? (0, node_crypto_1.randomUUID)(),
        localeLanguageIso6391: info.localeLanguageIso6391 ?? 'en',
        localeCountryIso31661Alpha2: info.localeCountryIso31661Alpha2 ?? 'US',
        deviceType: _proto_1.proto.ClientPayload.UserAgent.DeviceType.PHONE,
        deviceModelType: info.deviceModelType,
        ...(isIos
            ? { distributionChannel: distributionChannelId(info.distributionChannel) }
            : { mcc: info.mcc ?? '000', mnc: info.mnc ?? '000', deviceBoard: info.deviceBoard })
    };
    return _proto_1.proto.ClientPayload.encode({
        passive: config.passive === true,
        pull: config.pull ?? true,
        product: _proto_1.proto.ClientPayload.Product.WHATSAPP,
        connectType: config.connectType ?? _proto_1.proto.ClientPayload.ConnectType.CELLULAR_UNKNOWN,
        connectReason: config.connectReason ?? _proto_1.proto.ClientPayload.ConnectReason.USER_ACTIVATED,
        userAgent,
        username: config.username,
        device: config.device ?? 0,
        lidDbMigrated: config.lidDbMigrated === true,
        pushName: config.pushName,
        yearClass: config.yearClass,
        memClass: config.memClass
    }).finish();
}
