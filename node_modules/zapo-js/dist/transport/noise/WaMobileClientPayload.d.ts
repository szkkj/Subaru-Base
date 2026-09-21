import { type Proto } from '../../proto';
/**
 * Distribution channel advertised by an iOS login (`UserAgent.distributionChannel`).
 * iOS-only – Android leaves the field unset. `appstore` is the normal
 * production install; `testflight`/`internal` mark beta builds.
 */
export type WaMobileDistributionChannel = 'appstore' | 'website' | 'testflight' | 'internal';
export interface WaMobileTransportDeviceInfo {
    /**
     * Operating system the login payload impersonates. `android` (the default,
     * for backwards compatibility) advertises the `ANDROID`/`SMB_ANDROID`
     * platform and fills the Android-only `mcc`/`mnc`/`deviceBoard` fields.
     * `ios` advertises `IOS`/`SMB_IOS`, omits those Android-only fields (the
     * real iPhone client never sends them) and carries `distributionChannel`
     * instead.
     *
     * Field mapping differs by OS and must match the real client:
     * - **Android** `device` = a device codename (e.g. `moto_g52`).
     * - **iOS** `device` = the marketing name (e.g. `iPhone 15 Pro`) while
     *   {@link deviceModelType} carries the raw machine id (`iPhone16,1`).
     */
    readonly os?: 'android' | 'ios';
    readonly manufacturer: string;
    readonly device: string;
    readonly osVersion: string;
    readonly osBuildNumber: string;
    readonly appVersion: string;
    readonly mcc?: string;
    readonly mnc?: string;
    readonly localeLanguageIso6391?: string;
    readonly localeCountryIso31661Alpha2?: string;
    readonly phoneId?: string;
    readonly deviceBoard?: string;
    readonly deviceModelType?: string;
    /** iOS distribution channel; ignored for Android. Defaults to `appstore`. */
    readonly distributionChannel?: WaMobileDistributionChannel;
    readonly business?: boolean;
}
export interface WaMobileLoginPayloadConfig {
    readonly username: number;
    readonly device?: number;
    readonly passive?: boolean;
    readonly pull?: boolean;
    readonly deviceInfo: WaMobileTransportDeviceInfo;
    readonly lidDbMigrated?: boolean;
    readonly connectReason?: Proto.ClientPayload.ConnectReason;
    readonly connectType?: Proto.ClientPayload.ConnectType;
    readonly pushName?: string;
    readonly yearClass?: number;
    readonly memClass?: number;
}
/**
 * Builds the encoded {@link Proto.ClientPayload} bytes the WhatsApp Mobile
 * transport sends after the noise login handshake. Throws when
 * `username`/`appVersion` are missing/invalid.
 */
export declare function buildMobileLoginPayload(config: WaMobileLoginPayloadConfig): Uint8Array;
