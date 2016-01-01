"use strict";
declare var text: HTMLTextAreaElement;
declare var result: HTMLTextAreaElement;

function syrupify() {
    let results = MapleSyrup.convertAsArray(text.value.trim());
    
    result.textContent = results.join('\r\n\r\n');
}