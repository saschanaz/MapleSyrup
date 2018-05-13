"use strict";
declare namespace dialogPolyfill {
    function registerDialog(dialog: HTMLDialogElement): void;
}

declare var text: HTMLTextAreaElement;
declare var result: HTMLTextAreaElement;
declare var dialog: HTMLDialogElement;
declare var agreeButton: HTMLInputElement;

function syrupifySingleLine() {
    try {
        let resultText = MapleSyrup.convert(text.value.replace(/\s/g, ""));
        result.textContent = resultText;
    }
    catch (err) {
        alert(`오류가 발생했습니다: ${err}`)
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

document.addEventListener("DOMContentLoaded", async () => {
    agreeButton.addEventListener("click", () => {
        dialog.close();
    })
    dialogPolyfill.registerDialog(dialog);
    dialog.showModal();
    dialog.addEventListener("cancel", ev => ev.preventDefault())
    await (dialog.scrollTop = 0);
})
