// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

/**
 * Translates a key to a value.
 *
 * @param {object} langDict dictionary with translations
 * @param {*} key translation key
 * @param {*} defaultVal default value
 * @returns translated value
 */
function translate(langDict, key, defaultVal) {
    if (!langDict) {
        return defaultVal;
    }

    function iter(dict, trPath) {
        switch (typeof(dict)) {
            case "object":
                if (trPath.length) {
                    return iter(dict[trPath[0]], trPath.slice(1));
                }
                break;
            case "string":
                if (!trPath.length) {
                    return dict;
                }
                break;
        }
        console.warn("Untranslated key: " + key);
        return defaultVal;
    }

    return iter(langDict, key.split("."));
}

exports.translate = translate;
