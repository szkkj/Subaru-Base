/**
 * Computes the v2 participant hash (`2:<base64>`) attached to group and
 * broadcast-list fanouts.
 *
 * Every participant is canonicalized to `<user>.0:<device>@<server>`, the set
 * is sorted bytewise and hashed as a single SHA-256 stream. There is no
 * participant ceiling: the canonical buffer grows to fit the list, so a group
 * whose members resolve to tens of thousands of devices still hashes.
 *
 * @param participants device jids, in any order
 * @returns the `2:`-prefixed phash, or `'2:'` when the list is empty
 */
export declare function computePhashV2(participants: readonly string[]): string;
