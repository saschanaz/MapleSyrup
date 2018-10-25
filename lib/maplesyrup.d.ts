export declare function convert(mml: string | string[]): string;
export declare function convertAsArray(mml: string | string[]): string[];
interface Token {
    type: string;
    value: number;
}
export declare function parseChannel(mmlChannel: string): Token[];
export {};
