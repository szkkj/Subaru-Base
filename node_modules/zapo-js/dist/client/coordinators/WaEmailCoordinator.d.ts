import { type WaEmailContext } from '../../protocol/email';
import { type BuildRequestEmailVerificationCodeInput } from '../../transport/node/builders/email';
import type { BinaryNode } from '../../transport/types';
export interface WaEmailStatus {
    readonly email: string | null;
    readonly verified: boolean;
    readonly confirmed: boolean;
}
export interface WaEmailVerifyCodeResult {
    readonly verified: boolean;
    readonly autoVerifyFailed: boolean;
    readonly email: string | null;
}
/**
 * Coordinates the email-on-account flow: read state, bind/unbind, request
 * verification code, submit the code, and confirm. Accessed via
 * {@link WaClient.email}.
 *
 * **Mobile-only.** Email binding is only available when the client is
 * connected via the WhatsApp Mobile transport (`options.mobileTransport`).
 * Every method throws against a regular Web/companion connection because
 * the server rejects the underlying IQ.
 */
export interface WaEmailCoordinator {
    /** Returns the current email binding (address + verified/confirmed flags). */
    readonly getStatus: () => Promise<WaEmailStatus>;
    /** Binds (or rebinds) an email address to the account. */
    readonly setEmail: (email: string, context?: WaEmailContext) => Promise<WaEmailStatus>;
    /** Asks the server to send a verification code to the bound address. */
    readonly requestVerificationCode: (input: BuildRequestEmailVerificationCodeInput) => Promise<void>;
    /** Submits a verification code received via email. */
    readonly verifyCode: (code: string) => Promise<WaEmailVerifyCodeResult>;
    /** Confirms email ownership (post-verification handshake). */
    readonly confirm: (context?: WaEmailContext) => Promise<void>;
}
export interface WaEmailCoordinatorOptions {
    readonly queryWithContext: (context: string, node: BinaryNode, timeoutMs?: number, contextData?: Readonly<Record<string, unknown>>) => Promise<BinaryNode>;
}
/** Builds a {@link WaEmailCoordinator} backed by the given IQ query function. */
export declare function createEmailCoordinator(options: WaEmailCoordinatorOptions): WaEmailCoordinator;
