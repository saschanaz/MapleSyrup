(function (global, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
    else {
        global.MapleSyrup = global.MapleSyrup || {};
        var leaf = global.MapleSyrup;
        factory(global.require, leaf);
    }
})(this, function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function convert(mml) {
        const array = convertAsArray(mml);
        return `MML@${array.join(",")};`;
    }
    exports.convert = convert;
    function convertAsArray(mml) {
        let channels;
        if (typeof mml === "string") {
            channels = extractChannelsFromMMLContainer(mml.toLowerCase());
        }
        else if (Array.isArray(mml)) {
            channels = mml.map(channel => channel.toLowerCase());
        }
        else {
            throw new Error("argument should be string or string array");
        }
        const channelsAsTokens = channels.map(parseChannel);
        const tempoChangesByTime = [];
        for (const channelAsTokens of channelsAsTokens) {
            replaceAbsoluteNotes(channelAsTokens);
            replaceDottedDefaultLength(channelAsTokens);
        }
        const timeIndexMapsForChannels = channelsAsTokens.map(mapTime);
        for (let i = 0; i < channels.length; i++) {
            const channelAsTokens = channelsAsTokens[i];
            const timeIndexMap = timeIndexMapsForChannels[i];
            const tempoTokenIndices = searchTempoTokenIndices(channelAsTokens);
            for (const index of tempoTokenIndices) {
                tempoChangesByTime.push([timeIndexMap[index], channelAsTokens[index]]);
            }
        }
        tempoChangesByTime.sort((a, b) => b[0] - a[0]); // make it reversed
        for (const change of tempoChangesByTime) {
            for (let i = 0; i < channels.length; i++) {
                const timeIndexMap = timeIndexMapsForChannels[i];
                const index = findTimeIndex(change[0], timeIndexMap);
                if (index === timeIndexMap.length) {
                    continue;
                }
                else if (index > timeIndexMap.length) {
                    throw new Error("Assert failure: out of index");
                }
                if (change[0] < timeIndexMap[index - 1]) {
                    throw new Error("Assert failure: incorrect time map index");
                }
                // Detect unbreakable note (Issue #2)
                const previousTime = index > 0 ? timeIndexMap[index - 1] : 0;
                if (change[0] && change[0] > previousTime) {
                    const timeGap = timeIndexMap[index] - change[0];
                    const noteToken = channelsAsTokens[i][index];
                    if (noteToken.type !== "note") {
                        throw new Error("Assert failure: incorrect time index");
                    }
                    let length = Number.isNaN(noteToken.value) ?
                        getDefaultLengthByIndex(channelsAsTokens[i], index) : (128 / noteToken.value);
                    if (noteToken.dot) {
                        length *= 1.5;
                    }
                    const brokenNoteLength = length - timeGap;
                    const brokenNote = createTiedNotes(noteToken, brokenNoteLength);
                    const tie = { type: "tie", value: NaN };
                    const gapNote = createTiedNotes(noteToken, timeGap);
                    channelsAsTokens[i].splice(index, 1, ...brokenNote, tie, change[1], ...gapNote);
                    const baseTime = timeIndexMap[index] - length;
                    const brokenNoteTimes = mapTime(brokenNote).map(n => n + baseTime);
                    const brokenLast = brokenNoteTimes[brokenNoteTimes.length - 1];
                    timeIndexMap.splice(index, 1, ...brokenNoteTimes, brokenLast, brokenLast, ...mapTime(gapNote).map(n => n + brokenLast));
                }
                else {
                    channelsAsTokens[i].splice(index, 0, change[1]);
                }
            }
        }
        return channelsAsTokens.map(writeChannel);
    }
    exports.convertAsArray = convertAsArray;
    /**
     * Create (multiple) notes that can be played for the specified arbitrary integer length
     * @param noteToken base token
     * @param length r64 is 2
     */
    function createTiedNotes(noteToken, length) {
        if (length !== (length | 0)) {
            throw new Error("The input length is not integer");
        }
        const notes = [];
        while (length > 0) {
            const largest2 = Math.pow(2, (Math.log2(length) | 0));
            length -= largest2;
            const note = {
                type: "note",
                value: 128 / largest2,
                note: noteToken.note,
                dot: false,
                postfix: noteToken.postfix
            };
            notes.push(note);
            if (length > 0) {
                notes.push({ type: "tie", value: NaN });
            }
        }
        return notes;
    }
    function extractChannelsFromMMLContainer(mml) {
        if (!mml.startsWith("mml@")) {
            throw new Error("Expected 'MML@' start marker but not found");
        }
        if (!mml.endsWith(";")) {
            throw new Error("Expected ';' end marker but not found");
        }
        const commaRegex = /,/g;
        const commaDelimited = mml.slice(4, -1);
        return commaDelimited.split(",");
    }
    /**
     * @param time value to find index
     * @param timeMap from this map
     * @return the first index of item whose value is larger than the input time
     */
    function findTimeIndex(time, timeMap) {
        for (let i = 0; i < timeMap.length; i++) {
            const mapped = timeMap[i];
            if (mapped === time) {
                return i + 1;
            }
            else if (mapped > time) {
                return i;
            }
        }
        return timeMap.length;
    }
    function getDefaultLengthByIndex(tokens, index) {
        if (index >= tokens.length) {
            throw new Error("Index cannot be greater than or equal to token length.");
        }
        let defaultLength = NaN;
        for (let i = 0; i < index; i++) {
            if (tokens[i].type === "defaultlength") {
                defaultLength = 128 / tokens[i].value;
                if (tokens[i].dot) {
                    defaultLength *= 1.5;
                }
            }
        }
        return defaultLength;
    }
    function mapTime(tokens) {
        /*
        Time:
        r64 -> 2
        r64. -> 3
        r32 -> 4
        ...
        r4 -> 32
        */
        const map = [];
        let elapsed = 0;
        let defaultLength = 128 / 4; // 32
        for (const token of tokens) {
            if (token.type === "note") {
                let length = Number.isNaN(token.value) ? defaultLength : (128 / token.value);
                if (token.dot) {
                    length *= 1.5;
                }
                elapsed += length;
            }
            else if (token.type === "defaultlength") {
                let length = 128 / token.value;
                if (token.dot) {
                    length *= 1.5;
                }
                defaultLength = length;
            }
            if ((elapsed - elapsed | 0) < 1e-12) {
                // (Assuming we won't ever treat any notes this small)
                // Cleanup tiny remainder caused by adding fractions in floating point
                elapsed |= 0;
            }
            map.push(elapsed);
        }
        return map;
    }
    function searchTempoTokenIndices(tokens) {
        const indices = [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type === "tempo") {
                indices.push(i);
            }
        }
        return indices;
    }
    function replaceAbsoluteNotes(tokens) {
        let octave = 4;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.type === "octave") {
                octave = token.value;
                // console.log(`set: ${octave}`);
            }
            else if (token.type === "octavemanipulation") {
                token.value ? octave++ : octave--;
                // console.log(`manipulated: ${octave}`);
            }
            else if (token.type === "absolutenote") {
                // console.log(`absolute: ${token.value}, current octave: ${octave}`)
                const newTokens = absoluteToNormalNote(token, octave);
                // console.log(newTokens);
                tokens.splice(i, 1, ...newTokens);
                i += newTokens.length - 1;
            }
        }
    }
    function replaceDottedDefaultLength(tokens) {
        let defaultLengthDot = false;
        for (const token of tokens) {
            if (token.type === "defaultlength") {
                const defaultLengthToken = token;
                defaultLengthDot = defaultLengthToken.dot;
                defaultLengthToken.dot = false;
                // console.log(`dotted L command: ${defaultLengthToken.value}`);
            }
            else if (token.type === "note") {
                if (defaultLengthDot) {
                    const noteToken = token;
                    if (Number.isNaN(noteToken.value)) {
                        if (noteToken.dot) {
                            throw new Error("Unexpected dotted note when default length already has a dot.");
                        }
                        noteToken.dot = true;
                    }
                    // console.log(`added a dot: ${noteToken.note}`);
                }
            }
        }
    }
    const numberNotes = ["c", "c+", "d", "d+", "e", "f", "f+", "g", "g+", "a", "a+", "b"];
    function absoluteToNormalNote(token, currentOctave) {
        const newTokens = [];
        const relative = token.value % 12;
        const noteOctave = Math.floor(token.value / 12);
        if (noteOctave !== currentOctave) {
            newTokens.push({ type: "octave", value: noteOctave });
        }
        const note = numberNotes[relative];
        const noteToken = {
            type: "note",
            value: NaN,
            note: note.slice(0, 1),
            postfix: note.endsWith("+") ? "sharp" : null,
            dot: false
        };
        newTokens.push(noteToken);
        if (noteOctave !== currentOctave) {
            // return to original octave
            newTokens.push({ type: "octave", value: currentOctave });
        }
        return newTokens;
    }
    function writeChannel(tokens) {
        const results = [];
        for (const token of tokens) {
            switch (token.type) {
                case "tempo":
                    results.push(`t${token.value}`);
                    break;
                case "defaultlength":
                    results.push(`l${token.value}${token.dot ? "." : ""}`);
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
                    results.push(token.value ? ">" : "<");
                    break;
                case "tie":
                    results.push("&");
                    break;
                case "note": {
                    let result = token.note;
                    const postfix = token.postfix;
                    if (postfix) {
                        if (postfix === "sharp") {
                            result += "+";
                        }
                        else if (postfix === "flat") {
                            result += "-";
                        }
                        else {
                            throw new Error(`Unexpected note postfix: ${postfix}`);
                        }
                    }
                    if (!Number.isNaN(token.value)) {
                        result += token.value;
                    }
                    if (token.dot) {
                        result += ".";
                    }
                    results.push(result);
                    break;
                }
                default:
                    throw new Error(`Unexpected token: ${token.type}`);
            }
        }
        return results.join("");
    }
    function parseChannel(mmlChannel) {
        const tokens = [];
        const parser = new TextParser(mmlChannel);
        while (parser.remaining) {
            const char = parser.read();
            let token;
            switch (char) {
                case "t":
                    token = {
                        type: "tempo",
                        value: assertValidNumber(parser.readContinuousNumbers(3))
                    };
                    break;
                case "l":
                    token = {
                        type: "defaultlength",
                        value: assertValidNumber(parser.readContinuousNumbers(2))
                    };
                    token.dot = parser.readIf(".");
                    break;
                case "v":
                    token = {
                        type: "volume",
                        value: assertValidNumber(parser.readContinuousNumbers(2))
                    };
                    break;
                case "s":
                    token = {
                        type: "sustain",
                        value: assertValidNumber(parser.readContinuousNumbers(2))
                    };
                    break;
                case "o":
                    token = {
                        type: "octave",
                        value: assertValidNumber(parser.readContinuousNumbers(1))
                    };
                    break;
                case "n":
                    token = {
                        type: "absolutenote",
                        value: assertValidNumber(parser.readContinuousNumbers(2))
                    };
                    break;
                case "<":
                case ">":
                    token = {
                        type: "octavemanipulation",
                        value: char === ">" ? 1 : 0
                    };
                    break;
                case "&":
                    token = {
                        type: "tie",
                        value: NaN
                    };
                    break;
                case "a":
                case "b":
                case "c":
                case "d":
                case "e":
                case "f":
                case "g":
                case "r": // rest note
                    token = {
                        type: "note",
                        note: char,
                        postfix: null
                    };
                    if (char !== "r") {
                        if (parser.readIf("+") || parser.readIf("#")) {
                            token.postfix = "sharp";
                        }
                        else if (parser.readIf("-")) {
                            token.postfix = "flat";
                        }
                    }
                    token.value = parser.readContinuousNumbers(2);
                    token.dot = parser.readIf(".");
                    break;
                default:
                    throw new Error(`Unexpected token '${char}', position ${parser.position}.`);
            }
            tokens.push(token);
        }
        return tokens;
        function assertValidNumber(input) {
            if (Number.isNaN(input)) {
                throw new Error("Expected a valid number but found NaN");
            }
            return input;
        }
    }
    exports.parseChannel = parseChannel;
    class TextParser {
        static charIsNumber(char) {
            const charCode = char.charCodeAt(0);
            return charCode >= 0x30 /* 0 */ && charCode <= 0x39; /* 9 */
        }
        get position() {
            return this._position;
        }
        set position(value) {
            if (value > this._text.length) {
                throw new Error("Position value should be lower than or equal to text length.");
            }
            this._position = value;
        }
        get remaining() {
            return this._position < this._text.length;
        }
        constructor(text) {
            this._text = text;
            this._position = 0;
        }
        read() {
            if (!this.remaining) {
                throw new Error("No more readable characters after current position.");
            }
            const char = this._text[this._position];
            this.position++;
            return char;
        }
        readIf(target) {
            if (!this.remaining) {
                return false;
            }
            const read = this.read();
            if (read !== target) {
                this.unread();
                return false;
            }
            return true;
        }
        unread() {
            if (this._position === 0) {
                throw new Error("Cannot unread because current position is zero.");
            }
            this.position--;
        }
        readContinuousNumbers(limit) {
            const array = [];
            while (this.remaining && array.length < limit) {
                const read = this.read();
                if (TextParser.charIsNumber(read)) {
                    array.push(read);
                }
                else {
                    this.unread();
                    break;
                }
            }
            return parseInt(array.join(""), 10);
        }
    }
});
//# sourceMappingURL=maplesyrup.js.map