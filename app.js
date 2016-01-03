"use strict";
function syrupifySingleLine() {
    let resultText = MapleSyrup.convert(text.value.replace(/\s/g, ""));
    result.textContent = resultText;
}
function syrupifyMultiLine() {
    let resultTexts = MapleSyrup.convertAsArray(text.value.replace(/\s/g, ""));
    result.textContent = resultTexts.join('\r\n\r\n');
}
//# sourceMappingURL=app.js.map