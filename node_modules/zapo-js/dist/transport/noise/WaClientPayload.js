"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDevicePropsPlatformType = resolveDevicePropsPlatformType;
exports.buildLoginPayload = buildLoginPayload;
exports.buildRegistrationPayload = buildRegistrationPayload;
const primitives_1 = require("../../crypto/core/primitives");
const _proto_1 = require("../../proto");
const bytes_1 = require("../../util/bytes");
const runtime_1 = require("../../util/runtime");
const _version_spec_1 = require("../../version-spec");
function parseVersion(versionBase) {
    const parts = versionBase.split('.');
    const [p = '2', s = '3000', t = '0'] = parts;
    const primary = Number.parseInt(p, 10);
    const secondary = Number.parseInt(s, 10);
    const tertiary = Number.parseInt(t, 10);
    const quaternary = parts.length > 3 ? Number.parseInt(parts[3], 10) : undefined;
    const quinary = parts.length > 4 ? Number.parseInt(parts[4], 10) : undefined;
    if (!Number.isSafeInteger(primary) ||
        !Number.isSafeInteger(secondary) ||
        !Number.isSafeInteger(tertiary) ||
        (quaternary !== undefined && !Number.isSafeInteger(quaternary)) ||
        (quinary !== undefined && !Number.isSafeInteger(quinary))) {
        throw new Error(`invalid versionBase: ${versionBase}`);
    }
    return { primary, secondary, tertiary, quaternary, quinary };
}
let cachedLocale = null;
function resolveLocale() {
    // The first `Intl.DateTimeFormat()` call triggers V8's lazy ICU init
    // (tens of ms). The process locale does not change at runtime, so
    // memoize after the first resolve.
    if (cachedLocale !== null)
        return cachedLocale;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
    const [language = 'en', country = 'US'] = locale.split('-');
    cachedLocale = Object.freeze({
        lg: language.toLowerCase(),
        lc: country.toUpperCase()
    });
    return cachedLocale;
}
function defaultWebSubPlatform() {
    return _proto_1.proto.ClientPayload.WebInfo.WebSubPlatform.WEB_BROWSER;
}
function resolveDevicePropsPlatformType(deviceBrowser) {
    const normalized = deviceBrowser?.trim().toLowerCase();
    switch (normalized) {
        case 'chrome':
            return _proto_1.proto.DeviceProps.PlatformType.CHROME;
        case 'firefox':
            return _proto_1.proto.DeviceProps.PlatformType.FIREFOX;
        case 'ie':
            return _proto_1.proto.DeviceProps.PlatformType.IE;
        case 'opera':
            return _proto_1.proto.DeviceProps.PlatformType.OPERA;
        case 'safari':
            return _proto_1.proto.DeviceProps.PlatformType.SAFARI;
        case 'edge':
            return _proto_1.proto.DeviceProps.PlatformType.EDGE;
        case 'electron':
        case 'desktop':
            return _proto_1.proto.DeviceProps.PlatformType.DESKTOP;
        case 'ipad':
            return _proto_1.proto.DeviceProps.PlatformType.IPAD;
        case 'tablet':
        case 'android tablet':
            return _proto_1.proto.DeviceProps.PlatformType.ANDROID_TABLET;
        case 'ohana':
            return _proto_1.proto.DeviceProps.PlatformType.OHANA;
        case 'aloha':
            return _proto_1.proto.DeviceProps.PlatformType.ALOHA;
        case 'catalina':
            return _proto_1.proto.DeviceProps.PlatformType.CATALINA;
        default:
            return _proto_1.proto.DeviceProps.PlatformType.UNKNOWN;
    }
}
function defaultUserAgent(versionBase, version) {
    const { primary, secondary, tertiary, quaternary, quinary } = version ?? parseVersion(versionBase);
    const locale = resolveLocale();
    return {
        platform: _proto_1.proto.ClientPayload.UserAgent.Platform.WEB,
        releaseChannel: _proto_1.proto.ClientPayload.UserAgent.ReleaseChannel.RELEASE,
        appVersion: {
            primary,
            secondary,
            tertiary,
            quaternary,
            quinary
        },
        mcc: '000',
        mnc: '000',
        osVersion: '0.1',
        manufacturer: '',
        device: 'Desktop',
        osBuildNumber: '0.1',
        localeLanguageIso6391: locale.lg,
        localeCountryIso31661Alpha2: locale.lc
    };
}
/**
 * Parses an OS version string into the `DeviceProps.version` tuple. Mirrors
 * WhatsApp Web, which only fills the field when the parsed OS version is a
 * plain dotted-numeric string and otherwise leaves it unset.
 */
function parseOsVersion(osVersion) {
    if (osVersion === null || osVersion === undefined || !/^[0-9.]+$/.test(osVersion)) {
        return undefined;
    }
    const parts = osVersion.split('.');
    const primary = Number.parseInt(parts[0], 10);
    if (!Number.isSafeInteger(primary)) {
        return undefined;
    }
    const secondary = parts.length > 1 ? Number.parseInt(parts[1], 10) : Number.NaN;
    const tertiary = parts.length > 2 ? Number.parseInt(parts[2], 10) : Number.NaN;
    return {
        primary,
        secondary: Number.isSafeInteger(secondary) ? secondary : undefined,
        tertiary: Number.isSafeInteger(tertiary) ? tertiary : undefined
    };
}
function defaultDeviceProps(config) {
    return _proto_1.proto.DeviceProps.encode({
        os: config.deviceOsDisplayName ?? process.platform,
        version: parseOsVersion(config.deviceOsVersion ?? (0, runtime_1.getRuntimeOsVersion)()),
        platformType: resolveDevicePropsPlatformType(config.deviceBrowser),
        requireFullSync: config.requireFullSync === true,
        historySyncConfig: {
            storageQuotaMb: 114149,
            inlineInitialPayloadInE2EeMsg: true,
            supportCallLogHistory: true,
            supportBotUserAgentChatHistory: true,
            supportCagReactionsAndPolls: true,
            supportBizHostedMsg: true,
            supportRecentSyncChunkMessageCountTuning: true,
            supportHostedGroupMsg: true,
            supportFbidBotChatHistory: true,
            supportMessageAssociation: true,
            supportGroupHistory: true,
            thumbnailSyncDaysLimit: 60,
            supportManusHistory: true,
            supportHatchHistory: true,
            supportedBotChannelFbids: []
        }
    }).finish();
}
function buildCommonPayload(config, defaultPull, version) {
    const versionBase = config.versionBase ?? _version_spec_1.WA_VERSION;
    return {
        passive: config.passive === true,
        pull: config.pull ?? defaultPull,
        connectType: _proto_1.proto.ClientPayload.ConnectType.WIFI_UNKNOWN,
        connectReason: _proto_1.proto.ClientPayload.ConnectReason.USER_ACTIVATED,
        userAgent: config.userAgent ?? defaultUserAgent(versionBase, version),
        webInfo: config.webInfo ?? {
            webSubPlatform: defaultWebSubPlatform()
        }
    };
}
function buildLoginPayload(config) {
    if (!Number.isSafeInteger(config.username) || config.username <= 0) {
        throw new Error('login payload requires a valid numeric username');
    }
    const common = buildCommonPayload(config, true);
    return _proto_1.proto.ClientPayload.encode({
        ...common,
        username: config.username,
        device: config.device ?? 0,
        lc: config.loginCounter ?? 0,
        connectAttemptCount: config.connectAttemptCount ?? 0,
        lidDbMigrated: config.lidDbMigrated === true
    }).finish();
}
function buildRegistrationPayload(config) {
    const registrationId = config.registrationInfo.registrationId;
    const signedPreKeyId = config.signedPreKey.keyId;
    if (!Number.isSafeInteger(registrationId) || registrationId <= 0) {
        throw new Error('registration payload requires a valid registrationId');
    }
    if (!Number.isSafeInteger(signedPreKeyId) || signedPreKeyId <= 0) {
        throw new Error('registration payload requires a valid signedPreKeyId');
    }
    const versionBase = config.versionBase ?? _version_spec_1.WA_VERSION;
    const version = parseVersion(versionBase);
    const common = buildCommonPayload(config, false, version);
    const devicePairingData = {
        buildHash: config.buildHash ?? (0, primitives_1.md5Bytes)(versionBase),
        deviceProps: config.deviceProps ?? defaultDeviceProps(config),
        eRegid: (0, bytes_1.intToBytes)(4, registrationId),
        eKeytype: (0, bytes_1.intToBytes)(1, 5),
        eIdent: config.registrationInfo.identityKeyPair.pubKey,
        eSkeyId: (0, bytes_1.intToBytes)(3, signedPreKeyId),
        eSkeyVal: config.signedPreKey.keyPair.pubKey,
        eSkeySig: config.signedPreKey.signature
    };
    return _proto_1.proto.ClientPayload.encode({
        ...common,
        devicePairingData
    }).finish();
}
