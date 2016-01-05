"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};
function syrupifySingleLine() {
    try {
        let resultText = MapleSyrup.convert(text.value.replace(/\s/g, ""));
        result.textContent = resultText;
    }
    catch (err) {
        alert(`오류가 발생했습니다: ${err}`);
    }
}
function syrupifyMultiLine() {
    try {
        let resultTexts = MapleSyrup.convertAsArray(text.value.replace(/\s/g, ""));
        result.textContent = resultTexts.join('\r\n\r\n');
    }
    catch (err) {
        alert(`오류가 발생했습니다: ${err}`);
    }
}
document.addEventListener("DOMContentLoaded", () => __awaiter(this, void 0, Promise, function* () {
    agreeButton.addEventListener("click", () => {
        dialog.close();
    });
    dialogPolyfill.registerDialog(dialog);
    dialog.showModal();
    dialog.addEventListener("cancel", ev => ev.preventDefault());
    yield (dialog.scrollTop = 0);
}));
//# sourceMappingURL=app.js.map