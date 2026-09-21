import { randomUUID } from 'node:crypto';
import { proto } from '../../proto.js';
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
    const { DistributionChannel } = proto.ClientPayload.UserAgent;
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
export function buildMobileLoginPayload(config) {
    if (!Number.isSafeInteger(config.username) || config.username <= 0) {
        throw new Error('mobile login payload requires a valid numeric username');
    }
    const info = config.deviceInfo;
    const version = parseAppVersion(info.appVersion);
    const isIos = info.os === 'ios';
    const platform = isIos
        ? info.business
            ? proto.ClientPayload.UserAgent.Platform.SMB_IOS
            : proto.ClientPayload.UserAgent.Platform.IOS
        : info.business
            ? proto.ClientPayload.UserAgent.Platform.SMB_ANDROID
            : proto.ClientPayload.UserAgent.Platform.ANDROID;
    const userAgent = {
        platform,
        releaseChannel: proto.ClientPayload.UserAgent.ReleaseChannel.RELEASE,
        appVersion: version,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer,
        device: info.device,
        osBuildNumber: info.osBuildNumber,
        phoneId: info.phoneId ?? randomUUID(),
        localeLanguageIso6391: info.localeLanguageIso6391 ?? 'en',
        localeCountryIso31661Alpha2: info.localeCountryIso31661Alpha2 ?? 'US',
        deviceType: proto.ClientPayload.UserAgent.DeviceType.PHONE,
        deviceModelType: info.deviceModelType,
        ...(isIos
            ? { distributionChannel: distributionChannelId(info.distributionChannel) }
            : { mcc: info.mcc ?? '000', mnc: info.mnc ?? '000', deviceBoard: info.deviceBoard })
    };
    return proto.ClientPayload.encode({
        passive: config.passive === true,
        pull: config.pull ?? true,
        product: proto.ClientPayload.Product.WHATSAPP,
        connectType: config.connectType ?? proto.ClientPayload.ConnectType.CELLULAR_UNKNOWN,
        connectReason: config.connectReason ?? proto.ClientPayload.ConnectReason.USER_ACTIVATED,
        userAgent,
        username: config.username,
        device: config.device ?? 0,
        lidDbMigrated: config.lidDbMigrated === true,
        pushName: config.pushName,
        yearClass: config.yearClass,
        memClass: config.memClass
    }).finish();
}
