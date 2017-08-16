
// @flow
/*jshint esversion: 6 */
"use strict";

const {remote} = require("electron");
const updater = remote.require("electron-simple-updater");

function attachUiHandlers() {
    const btnUpdate = document.getElementById("btn-update");
    const btnInstall = document.getElementById("btn-install");
    const chkAutomatically = document.getElementById("automatically");

    btnUpdate.addEventListener("click", function () {
        updater.checkForUpdates();
        document.body.classList.add("update-downloading");
    });

    btnInstall.addEventListener("click", function () {
        updater.downloadUpdate();
    });

    chkAutomatically.addEventListener("change", function () {
        updater.setOptions("autoDownload", this.checked);
    });
}

function attachUpdaterHandlers() {
    updater.on("update-available", onUpdateAvailable);
    updater.on("update-downloading", onUpdateDownloading);
    updater.on("update-downloaded", onUpdateDownloaded);

    function onUpdateAvailable(meta) {
        setText('new-version', meta.version);
        setText('description', meta.readme);
        document.body.className = 'update-available';
    }

    function onUpdateDownloading() {
        document.body.classList.add('update-downloading');
    }

    function onUpdateDownloaded() {
        if (window.confirm('The app has been updated. Do you like to restart it now?')) {
            updater.quitAndInstall();
        }
    }
}

function setText(id, text) {
    document.getElementById(id).appendChild(
        document.createTextNode(text)
    );
}

setText("version", updater.version);
setText("build", updater.buildId);

attachUiHandlers();
attachUpdaterHandlers();

// const {remote} = require("electron");
// // use `remote` require so that it"s run in the context of the main process
// // this makes it so that the application listed Access Control List is our main app, not `MyApp Helper`
// // this isn"t 100% necessary and probably somewhat of a personal preference
// const keytar = remote.require("keytar");
//
//
//
// const getBtn = document.querySelector("#btSubmit");
// const setBtn = document.querySelector("#setBtn");
// const secretValEl = document.querySelector("#secretVal");
// const output = document.querySelector("#output");
//
// getBtn.addEventListener("click", function () {
//     // Params are: service name, account name. Both are arbitrary
//     const secret = keytar.getPassword("Arizen", "lukas");
//     console.log(secret);
//     // output.innerText = secret || "Nothing set";
// });
//
// setBtn.addEventListener("click", function () {
//     const secret = secretValEl.value;
//     keytar.replacePassword("KeytarTest", "AccountName", secret);
// });
//
//
//
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
// let user;
// let pass;
// const password = ipcRenderer.sendSync("get-password", user);
// ipcRenderer.sendSync("set-password", user, pass);