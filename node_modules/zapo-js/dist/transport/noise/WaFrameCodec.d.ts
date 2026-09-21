export declare class WaFrameCodec {
    private readonly introFrame;
    private readonly maxFrameLength;
    private readonly tailScratch;
    private introSent;
    private buffered;
    private bufferedLength;
    constructor(introFrame?: Uint8Array, maxFrameLength?: number);
    private assertFrameLength;
    private appendBuffered;
    encodeFrame(frame: Uint8Array): Uint8Array;
    pushWireChunk(chunk: Uint8Array): readonly Uint8Array[];
}
