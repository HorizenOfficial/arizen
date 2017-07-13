// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {ipcRenderer} = require("electron");

//
//
// function refreshUI() {
//     ipcRenderer.send("coin-request");
//     ipcRenderer.send("check-params");
//     ipcRenderer.send("check-config");
//     ipcRenderer.send("check-wallet");
//     generateQuery("getblockchaininfo", []);
//
//     // for receivePage
//     generateQuery("listreceivedbyaddress", [0, true]);
//
//     // for historyPage
//     generateQuery("listtransactions", []);
//
//     // for addressesPage
//     generateQuery("listaddressgroupings", []);
//     generateQuery("z_listaddresses", []);
//
//     // for general use
//     generateQuery("getnetworkinfo", []);
//     generateQuery("getinfo", []);
//     generateQuery("z_gettotalbalance", [0]);
//
//
//     //sort collected options
//     options = [].concat(transOpts, shieldedOpts);
//
//     // update the private send dropdown only if needed
//     let different = false;
//     if (options.length !== oldOptions.length) {
//         different = true;
//     }
//     else if (options.length === oldOptions.length) {
//         for (let i = 0; i < options.length; i++) {
//             if (options[i].value !== oldOptions[i].value) {
//                 different = true;
//             }
//         }
//         if (!different) {
//             return;
//         }
//     }
//     if (different && options.length > 0) {
//         document.getElementById("privateFromSelect").innerHTML = "";
//         for (let i = 0; i < options.length; i++) {
//             let doc = document.getElementById("privateFromSelect");
//             doc.add(options[i]);
//         }
//         oldOptions = options;
//         options = [];
//         transOpts = [];
//         shieldedOpts = [];
//     }
// }
//
// function pollUI() {
//     if (genHistory.transparent === true && genHistory.private === true) {
//         generateHistoryTable(txs, privTxs);
//         txs = [];
//         privTxs = [];
//         genHistory.transparent = false;
//         genHistory.private = false;
//         generateMemoTable(memos);
//     }
// }
//
// refreshUI();
// setInterval(refreshUI, 900);
// setInterval(pollUI, 400);
//
// module.exports = {
//     generateQuerySync: function (method, params) {
//         return generateQuerySync(method, params);
//     },
//     generateQuery: function (method, params) {
//         return generateQuery(method, params);
//     },
//     showTxDetails: function (txid) {
//         return showTxDetails(txid);
//     },
//     saveOpts: function (opts) {
//         ipcRenderer.send("save-opts", opts);
//     }
// };
