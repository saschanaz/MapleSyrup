"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function syrupifySingleLine() {
    try {
        const resultText = MapleSyrup.convert(text.value.replace(/\s/g, ""));
        result.textContent = resultText;
    }
    catch (err) {
        alert(`오류가 발생했습니다: ${err}`);
    }
}
function syrupifyMultiLine() {
    try {
        const resultTexts = MapleSyrup.convertAsArray(text.value.replace(/\s/g, ""));
        result.textContent = resultTexts.join("\n\n");
    }
    catch (err) {
        alert(`오류가 발생했습니다: ${err}`);
    }
}
document.addEventListener("DOMContentLoaded", () => __awaiter(this, void 0, void 0, function* () {
    agreeButton.addEventListener("click", () => {
        dialog.close();
    });
    dialogPolyfill.registerDialog(dialog);
    dialog.showModal();
    dialog.addEventListener("cancel", ev => ev.preventDefault());
    yield (dialog.scrollTop = 0);
}));
//# sourceMappingURL=app.js.map