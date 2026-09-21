import { type WaEmailContext } from '../../../protocol/email';
import type { BinaryNode } from '../../types';
export declare function buildGetEmailIq(): BinaryNode;
export declare function buildSetEmailIq(email: string, context?: WaEmailContext): BinaryNode;
export interface BuildRequestEmailVerificationCodeInput {
    readonly languageCode: string;
    readonly localeCode: string;
}
export declare function buildRequestEmailVerificationCodeIq(input: BuildRequestEmailVerificationCodeInput): BinaryNode;
export declare function buildVerifyEmailCodeIq(code: string): BinaryNode;
export declare function buildConfirmEmailIq(context?: WaEmailContext): BinaryNode;
