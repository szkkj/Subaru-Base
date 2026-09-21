import type { BinaryNode } from '../../types';
export type WaProfilePictureType = 'preview' | 'image';
export declare function buildGetProfilePictureIq(targetJid: string, type?: WaProfilePictureType, existingId?: string, privacyTokenNode?: BinaryNode): BinaryNode;
export declare function buildSetProfilePictureIq(imageBytes: Uint8Array, targetJid?: string): BinaryNode;
export declare function buildDeleteProfilePictureIq(targetJid?: string): BinaryNode;
export declare function buildSetStatusIq(text: string): BinaryNode;
export declare function buildGetDisappearingModeUsyncQueryNode(): BinaryNode;
export declare function buildSetDisappearingModeIq(durationSeconds: number): BinaryNode;
export declare function buildGetTextStatusUsyncQueryNode(): BinaryNode;
export declare function buildGetUsernameUsyncQueryNode(): BinaryNode;
/**
 * `contact` answers with the resolved user plus its reachability `type`,
 * `business` with the verified name. WhatsApp Web pins `contact` to LID
 * addressing here, so the lookup resolves to a LID.
 */
export declare function buildUsernameLookupUsyncQueryNodes(): readonly BinaryNode[];
export interface BuildUsernameLookupContactNodeInput {
    readonly username: string;
    readonly usernameKey?: string;
}
/**
 * The `<contact>` child identifying the account in a username lookup. It goes
 * inside a `<user>` carrying no `jid` - the handle is the identifier - with
 * the optional lookup key in `pin`.
 */
export declare function buildUsernameLookupContactNode(input: BuildUsernameLookupContactNodeInput): BinaryNode;
export declare function buildGetStatusUsyncQueryNodes(): readonly BinaryNode[];
