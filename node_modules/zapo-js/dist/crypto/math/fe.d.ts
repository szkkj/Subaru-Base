/**
 * Field element arithmetic for GF(2^255-19).
 * Representation: 16 limbs of 16 bits in Float64Array (tweetnacl style).
 * Hot-path operations are allocation-free using pre-allocated temporaries.
 */
export type Fe = Float64Array;
export declare function fe(): Fe;
export declare function feCopy(o: Fe, a: Fe): void;
export declare function feFromBigInt(n: bigint): Fe;
export declare function feToBigInt(a: Fe): bigint;
export declare function feFromBytes(o: Fe, s: Uint8Array): void;
export declare function fePack(o: Uint8Array, n: Fe): void;
export declare function feAdd(o: Fe, a: Fe, b: Fe): void;
export declare function feSub(o: Fe, a: Fe, b: Fe): void;
export declare function feNeg(o: Fe, a: Fe): void;
/**
 * Fully unrolled field multiplication with folded reduction.
 * Computes o = a * b mod (2^255-19) using negacyclic convolution:
 * t[i] = Σ a[j]*b[i-j] (direct) + 38 * Σ a[j]*b[i+16-j] (wrapped)
 * All values in local variables for register allocation.
 */
export declare function feMul(o: Fe, a: Fe, b: Fe): void;
/**
 * Fully unrolled field squaring with folded reduction and symmetry.
 * Exploits a[j]*a[k] == a[k]*a[j] to halve off-diagonal multiplications.
 * Combined with negacyclic reduction: wrapped terms use a38[k] = 38*a[k].
 */
export declare function feSqr(o: Fe, a: Fe): void;
export declare function feSqrN(o: Fe, a: Fe, n: number): void;
export declare function feInv(o: Fe, a: Fe): void;
