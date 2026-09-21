export declare class CsTokenGenerator {
    private cachedSalt;
    private readonly cache;
    constructor();
    generate(nctSalt: Uint8Array, accountLid: string): Uint8Array;
    invalidate(): void;
    private isSameSalt;
}
