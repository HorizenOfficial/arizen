// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

// These function could be integrated in zencash.js lib
const zencashjs = require("zencashjs");

function isWif(pk) {
    let isWif = true;
    try {
        let pktmp = zencashjs.address.WIFToPrivKey(pk);
    } catch (err) {
        isWif = false;
    }
    return isWif
}

function isPK(pk) {
    let isPK = true;
    try {
        let pktmp = zencashjs.address.privKeyToPubKey(pk);
    } catch (err) {
        isPK = false;
    }
    return isPK
}

function isPKorWif(pk) {
    return (isWif(pk) || isPK(pk))
}


function isTransaparentAddr(str) {
    return (str.length === 35)

}

function isZeroAddr(str) {
    return (str.length === 95)
}

module.exports = {
    zenextra: {
        isTransaparentAddr: isTransaparentAddr,
        isZeroAddr: isZeroAddr,
        isWif: isWif,
        isPK: isPK,
        isPKorWif: isPKorWif
    }
};
