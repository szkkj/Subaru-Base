/**
 * Verdict of {@link scanStreamable}: `true` when the payload can be played
 * back while it downloads, `false` when it cannot, `null` while the leading
 * bytes seen so far are not enough to decide.
 */
export type WaStreamableVerdict = boolean | null;
/**
 * Decides whether a media payload supports progressive playback, by walking
 * the top-level ISO base media file format (mp4/mov/3gp/m4a) boxes over the
 * leading bytes.
 *
 * An ISO-BMFF file is streamable only when its `moov` index box precedes the
 * `mdat` payload box. With `mdat` first, a player has to reach the end of the
 * download before it can start decoding, so advertising the file as seekable
 * (by attaching a streaming sidecar) makes the recipient fail to open it
 * instead of falling back to a plain download.
 *
 * Anything that is not ISO-BMFF - Ogg/Opus voice notes, for instance - is
 * reported as streamable: those containers carry their index inline and have
 * no equivalent failure mode.
 *
 * @param head - Leading bytes of the payload, starting at offset 0.
 * @returns `true` when streamable, `false` when not, `null` when `head` is
 *   too short to tell and the caller should retry with more bytes.
 */
export declare function scanStreamable(head: Uint8Array): WaStreamableVerdict;
/**
 * Incremental front-end for {@link scanStreamable}, for callers that see the
 * payload as a sequence of chunks. Buffers at most
 * {@link CONTAINER_SCAN_MAX_BYTES} leading bytes and settles on `true` once
 * that budget is spent without a verdict.
 */
export declare class WaStreamableScanner {
    private readonly head;
    private headLength;
    private settled;
    /** Verdict so far; `null` until enough leading bytes have been seen. */
    get verdict(): WaStreamableVerdict;
    /** Feeds the next payload chunk. Ignored once the verdict has settled. */
    push(chunk: Uint8Array): void;
    /** Verdict to use once the payload has ended, defaulting to streamable. */
    finish(): boolean;
}
