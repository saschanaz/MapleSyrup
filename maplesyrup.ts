"use strict";
namespace MapleSyrup {
    export function convert(mml: string) {
        let array = convertAsArray(mml);
        return `MML@${array.join(',')};`
    }
    export function convertAsArray(mml: string) {
        if (!mml.startsWith("MML@")) {
            throw new Error("Expected 'MML@' start marker but not found");
        }
        if (!mml.endsWith(";")) {
            throw new Error("Expected ';' end marker but not found");
        }

        let commaRegex = /,/g;
        let commaDelimited = mml.slice(4, -1);
        let channels = commaDelimited.split(',').map(channel => channel.toLowerCase());

        let tempoRegex = /t[0-9]+/;
        let tempoChannelIndex = -1;
        let tempoText: string;
        for (let i = 0; i < channels.length; i++) {
            let match = channels[i].match(tempoRegex);
            if (match) {
                tempoChannelIndex = i;
                tempoText = match[0];
                break;
            }
        }
        if (tempoChannelIndex !== -1) {
            for (let i = 0; i < channels.length; i++) {
                if (i !== tempoChannelIndex) {
                    channels[i] = tempoText + channels[i];
                }
            }
        }
        // TODO: synchronize tempo change

        return channels.map(channel => convertChannel(channel));
    }
    
    export function convertChannel(mmlChannel: string) {
        let tokens = parseChannel(mmlChannel);

        let octave = 4;
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];

            if (token.type === "octave") {
                octave = token.value;
                //console.log(`set: ${octave}`);
            }
            else if (token.type === "octavemanipulation") {
                token.value ? octave++ : octave--;
                //console.log(`manipulated: ${octave}`);
            }
            else if (token.type === "absolutenote") {
                //console.log(`absolute: ${token.value}, current octave: ${octave}`)
                let newTokens = absoluteToNormalNote(token, octave);
                //console.log(newTokens);
                tokens.splice(i, 1, ...newTokens);
                i += newTokens.length - 1;
            }
        }

        return writeChannel(tokens);
    }

    let numberNotes: string[] = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
    function absoluteToNormalNote(token: Token, currentOctave: number) {
        let newTokens: Token[] = [];

        let relative = token.value % 12;
        let noteOctave = Math.floor(token.value / 12);
        if (noteOctave !== currentOctave) {
            newTokens.push({ type: "octave", value: noteOctave })
        }

        let note = numberNotes[relative];
        let noteToken: NoteToken = {
            type: "note",
            value: NaN, // follow default note length 
            note: note.slice(0, 1),
            postfix: note.endsWith('+') ? "sharp" : undefined,
            dot: false
        }
        newTokens.push(noteToken);

        if (noteOctave !== currentOctave) {
            // return to original octave
            newTokens.push({ type: "octave", value: currentOctave })
        }
        return newTokens;
    }

    function writeChannel(tokens: Token[]) {
        let results: string[] = [];

        for (let token of tokens) {
            switch (token.type) {
                case "tempo":
                    results.push(`t${token.value}`);
                    break;
                case "defaultlength":
                    results.push(`l${token.value}${(token as LengthToken).dot ? ".": ""}`);
                    break;
                case "volume":
                    results.push(`v${token.value}`);
                    break;
                case "sustain":
                    results.push(`s${token.value}`);
                    break;
                case "octave":
                    results.push(`o${token.value}`);
                    break;
                case "absolutenote":
                    throw new Error("Absolute note should be converted to normal note");
                case "octavemanipulation":
                    results.push(token.value ? '>' : '<');
                    break;
                case "tie":
                    results.push('&');
                    break;
                case "note": {
                    let result = (token as NoteToken).note;
                    let postfix = (token as NoteToken).postfix;
                    if (postfix) {
                        if (postfix === "sharp") {
                            result += "+";
                        }
                        else if (postfix === "flat") {
                            result += "-";
                        }
                        else {
                            throw new Error(`Unexpected note postfix: ${postfix}`)
                        }
                    }
                    if (!Number.isNaN(token.value)) {
                        result += token.value
                    }
                    if ((token as NoteToken).dot) {
                        result += '.';
                    }
                    results.push(result)
                    break;
                }
                default:
                    throw new Error(`Unexpected token: ${token.type}`);
            }
        }

        return results.join('');
    }

    interface Token {
        type: string;
        value: number;
    }
    interface LengthToken extends Token {
        dot: boolean;
    }
    interface NoteToken extends LengthToken {
        note: string;
        postfix: string;
        dot: boolean;
    }
    export function parseChannel(mmlChannel: string) {
        let tokens: Token[] = [];
        let parser = new TextParser(mmlChannel);
        while (parser.remaining) {
            let char = parser.read();
            let token: Token;
            switch (char) {
                case 't':
                    token = {
                        type: "tempo",
                        value: assertValidNumber(parser.readContinuousNumbers(3))
                    };
                    break;
                case 'l':
                    token = {
                        type: "defaultlength",
                        value: assertValidNumber(parser.readContinuousNumbers(2))
                    } as LengthToken;
                    (token as NoteToken).dot = parser.readIf('.')
                    break;
                    break;
                case 'v':
                    token = {
                        type: "volume",
                        value: assertValidNumber(parser.readContinuousNumbers(2))
                    };
                    break;
                case 's':
                    token = {
                        type: "sustain",
                        value: assertValidNumber(parser.readContinuousNumbers(2))
                    }
                    break;
                case 'o':
                    token = {
                        type: "octave",
                        value: assertValidNumber(parser.readContinuousNumbers(1))
                    }
                    break;
                case 'n':
                    token = {
                        type: "absolutenote",
                        value: assertValidNumber(parser.readContinuousNumbers(2))
                    }
                    break;
                case '<':
                case '>':
                    token = {
                        type: "octavemanipulation",
                        value: char === '>' ? 1 : 0
                    }
                    break;
                case '&':
                    token = {
                        type: "tie",
                        value: undefined
                    }
                    break;
                case 'a':
                case 'b':
                case 'c':
                case 'd':
                case 'e':
                case 'f':
                case 'g':
                case 'r': // rest note
                    token = {
                        type: "note",
                        note: char
                    } as NoteToken;

                    if (char !== 'r') {
                        if (parser.readIf('+') || parser.readIf('#')) {
                            (token as NoteToken).postfix = "sharp";
                        }
                        else if (parser.readIf('-')) {
                            (token as NoteToken).postfix = "flat";
                        }
                    }

                    (token as NoteToken).value = parser.readContinuousNumbers(2);
                    (token as NoteToken).dot = parser.readIf('.')
                    break;
                default:
                    throw new Error(`Unexpected token: ${char}`)
            }
            tokens.push(token);
        }
        return tokens;

        function assertValidNumber(input: number) {
            if (Number.isNaN(input)) {
                throw new Error("Expected a valid number but found NaN")
            }
            return input;
        }
    }

    class TextParser {
        private _text: string;

        private _position: number;
        get position() {
            return this._position;
        }
        set position(value: number) {
            if (value > this._text.length) {
                throw new Error("Position value should be lower than or equal to text length.")
            }
            this._position = value;
        }
        get remaining() {
            return this._position < this._text.length;
        }

        constructor(text: string) {
            this._text = text;
            this._position = 0;
        }

        read() {
            if (!this.remaining) {
                throw new Error("No more readable characters after current position.")
            }
            let char = this._text[this._position];
            this.position++;
            return char;
        }
        readIf(target: string) {
            if (!this.remaining) {
                return false;
            }
            let read = this.read();
            if (read !== target) {
                this.unread();
                return false;
            }
            return true;
        }
        unread() {
            if (this._position === 0) {
                throw new Error("Cannot unread because current position is zero.")
            }
            this.position--;
        }
        readContinuousNumbers(limit: number) {
            let array: string[] = [];
            while (this.remaining && array.length < limit) {
                let read = this.read();
                if (TextParser.charIsNumber(read)) {
                    array.push(read);
                }
                else {
                    this.unread();
                    break;
                }
            }
            return parseInt(array.join(''))
        }
        static charIsNumber(char: string) {
            let charCode = char.charCodeAt(0);
            return charCode >= 0x30 /* 0 */ && charCode <= 0x39 /* 9 */
        }
    }
    // function indicesOf(text: string, regex: RegExp): number[] {
    //     // TODO: use 'y' regex flag when Chrome activates it by default
    //     // (Chrome 49 does but with an experimental flag)
    //     let lastIndex = text.search(regex);
    //     if (lastIndex === -1) {
    //         return [];
    //     }
    //     let indices = [lastIndex];
    //     while (true) {
    //         let localLastIndex = text.slice(lastIndex).search(regex);
    //         if (localLastIndex === -1) {
    //             return indices;
    //         }
    //         lastIndex = localLastIndex + lastIndex + 1;
    //         indices.push(lastIndex);
    //     }
    // }
}