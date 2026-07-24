"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBase64 = decodeBase64;
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ToBytes(value) {
    const clean = value.replace(/[\r\n\s]/g, '').replace(/=+$/, '');
    if (clean.length === 0 || !/^[A-Za-z0-9+/]*$/.test(clean))
        return undefined;
    const bytes = [];
    let buffer = 0;
    let bits = 0;
    for (const char of clean) {
        buffer = (buffer << 6) | B64_ALPHABET.indexOf(char);
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
        }
    }
    return Uint8Array.from(bytes);
}
function utf8Decode(bytes) {
    let out = '';
    let i = 0;
    while (i < bytes.length) {
        const b1 = bytes[i++];
        if (b1 < 0x80) {
            out += String.fromCharCode(b1);
        }
        else if (b1 < 0xe0) {
            out += String.fromCharCode(((b1 & 0x1f) << 6) | (bytes[i++] & 0x3f));
        }
        else if (b1 < 0xf0) {
            out += String.fromCharCode(((b1 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
        }
        else {
            const cp = ((b1 & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
            out += String.fromCodePoint(cp);
        }
    }
    return out;
}
// Pure-JS base64 → UTF-8: must behave the same on Node/Electron and React Native
// (no Buffer, atob or TextDecoder — none of them exist across all targets).
function decodeBase64(value) {
    if (typeof value !== 'string' || value.length === 0)
        return '';
    try {
        const bytes = base64ToBytes(value);
        if (!bytes)
            return String(value);
        return utf8Decode(bytes);
    }
    catch {
        return String(value);
    }
}
