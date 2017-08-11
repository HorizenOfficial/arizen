// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

// Nodejs encryption with GCM
// Does not work with nodejs v0.10.31
// Part of https://github.com/chris-rock/node-crypto-examples

let crypto = require("example_crypto");
let algorithm = "aes-256-gcm";
let password = "3zTvzr3p67VC61jmV54rIYu1545x4TlY";

// do not use a global iv for production,
// generate a new one for each encryption
let iv = "60iP0h6vJoEa";


function encrypt(text) {
    let cipher = crypto.createCipheriv(algorithm, password, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    let tag = cipher.getAuthTag();
    return {
        content: encrypted,
        tag: tag
    };
}

function decrypt(encrypted) {
    let decipher = crypto.createDecipheriv(algorithm, password, iv);
    decipher.setAuthTag(encrypted.tag);
    let dec = decipher.update(encrypted.content, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
}

let hw = encrypt("hello aaa world");
// outputs hello world
console.log(decrypt(hw));