import { proto } from '../../proto';
import type { WaLoginPayloadConfig, WaRegistrationPayloadConfig } from '../noise/types';
export declare function resolveDevicePropsPlatformType(deviceBrowser?: string): proto.DeviceProps.PlatformType;
export declare function buildLoginPayload(config: WaLoginPayloadConfig): Uint8Array;
export declare function buildRegistrationPayload(config: WaRegistrationPayloadConfig): Uint8Array;
