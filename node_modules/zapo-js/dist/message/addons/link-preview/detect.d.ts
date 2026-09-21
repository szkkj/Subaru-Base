export interface WaDetectedLink {
    readonly matchedText: string;
    readonly url: URL;
}
export declare function findFirstLink(text: string): WaDetectedLink | null;
