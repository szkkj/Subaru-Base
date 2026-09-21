import { type WaBusinessHoursDay, type WaBusinessHoursMode } from '../../../protocol/constants';
import type { BinaryNode } from '../../types';
export declare const WA_BUSINESS_PROFILE_VERSION = 116;
export interface WaEditBusinessProfileInput {
    readonly address?: string;
    readonly description?: string;
    readonly email?: string;
    readonly websites?: readonly {
        readonly url: string;
    }[];
    readonly categories?: readonly {
        readonly id: string;
    }[];
    /**
     * Weekly opening schedule. List one entry per **open** day; closed days are
     * expressed by omitting them, not by a separate mode. `openTime` / `closeTime`
     * (minutes from midnight, e.g. `540` = 09:00) only apply to `specific_hours`
     * and are ignored for `open_24h` / `appointment_only`. An unknown `mode` is
     * rejected by the server with a `406 not-acceptable`.
     */
    readonly businessHours?: {
        readonly timezone?: string;
        readonly config: readonly {
            readonly dayOfWeek: WaBusinessHoursDay;
            readonly mode: WaBusinessHoursMode;
            readonly openTime?: number;
            readonly closeTime?: number;
        }[];
    };
    readonly latitude?: number;
    readonly longitude?: number;
}
export declare function buildGetBusinessProfileIq(jids: readonly string[], version?: number): BinaryNode;
export declare function buildEditBusinessProfileIq(input: WaEditBusinessProfileInput): BinaryNode;
export declare function buildGetVerifiedNameIq(jid: string): BinaryNode;
export type BuildCoverPhotoIqInput = {
    readonly op: 'update';
    readonly id: string;
    readonly timestamp: string;
    readonly token: string;
} | {
    readonly op: 'delete';
    readonly id: string;
};
export declare function buildGetBusinessUsyncQueryNode(): BinaryNode;
export declare function buildCoverPhotoIq(input: BuildCoverPhotoIqInput): BinaryNode;
