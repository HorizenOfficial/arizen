// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const MARK_PREFIX = "";
const LANGDIR = __dirname + "/../app/lang";

const fs = require("fs");
const deepmerge = require("deepmerge");
const jsonfileplus = require("json-file-plus");

function mark(node) {
    switch(typeof(node)) {
        case "string": return MARK_PREFIX + node;
        case "object":
            const newnode = {};
            for (const key of Object.keys(node)) {
                newnode[key] = mark(node[key]);
            }
            return newnode;
        default:
            throw new Error();
    }
}

const main = mark(require(LANGDIR + "/lang_en.json"));

fs.readdirSync(LANGDIR)
    .filter(file => file !== "lang_en.json" && file.match(/^lang_\w+\.json$/))
    .forEach(async file => {
    console.log("Updating dictionary " + file);
    const other = require(LANGDIR + "/" + file);
    const merged = deepmerge(main, other);
    const mutable = await jsonfileplus(LANGDIR + "/" + file);
    mutable.set(merged);
    await mutable.save();
});
