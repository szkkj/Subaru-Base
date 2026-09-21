export interface WaMexArgoError {
    readonly message: string;
    readonly path: number | null;
    readonly extensions: Record<string, unknown> | null;
}
export interface WaMexArgoResponse {
    readonly data: unknown;
    readonly errors: WaMexArgoError[];
}
export declare function isMexArgoDecoderAvailable(): Promise<boolean>;
export declare function decodeMexArgoResponse(bytes: Uint8Array): Promise<WaMexArgoResponse>;
