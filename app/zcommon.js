// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {DateTime} = require("luxon");


function logout() {
    ipcRenderer.send("do-logout");
    location.href = "./login.html";
}

function exitApp() {
    ipcRenderer.send("exit-from-menu");
}

function openUrl(url) {
    const {shell} = require("electron");
    shell.openExternal(url);
}

function fixLinks() {
    document.querySelectorAll("a[href^='http']").forEach(link =>
        link.addEventListener("click", event => {
            event.preventDefault();
            openUrl(link.href);
        }));
}

function formatBalance(balance) {
    return balance.toFixed(8);
}

function formatEpochTime(epochSeconds) {
    return DateTime.fromMillis(epochSeconds).toLocaleString(DateTime.DATETIME_MED);
}

function hideElement(node, yes) {
    if (yes) {
        node.classList.add("hidden");
    } else {
        node.classList.remove("hidden");
    }
}

function clearChildNodes(parent) {
    parent.childNodes.forEach(p => parent.removeChild(p));
}

function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

function showDialogFromTemplate(templateName, dialogInit, onClose = null) {
    const dialog = cloneTemplate(templateName);
    if (dialog.tagName !== "ARIZEN-DIALOG")
        throw new Error("No dialog in the template");
    document.body.appendChild(dialog);
    dialogInit(dialog);
    dialog.addEventListener("close", () => {
        if (onClose)
            onClose();
        dialog.remove()
    });
    dialog.showModal();
}

function scrollIntoViewIfNeeded(parent, child) {
    const parentRect = parent.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    if (childRect.top < parentRect.top ||
        childRect.right > parentRect.right ||
        childRect.bottom > parentRect.bottom ||
        childRect.left < parentRect.left)
        child.scrollIntoView();
}

function createLink(url, text) {
    const link = document.createElement("a");
    link.href = url;
    link.textContent = text;
    return link;
}


// TODO this doesn't belong here
function showAboutDialog() {
    const pkg = require("../package.json");
    showDialogFromTemplate("aboutDialogTemplate", dialog => {
        dialog.querySelector(".aboutHomepage").appendChild(createLink(pkg.homepage, pkg.homepage));
        dialog.querySelector(".aboutVersion").textContent = pkg.version;
        dialog.querySelector(".aboutLicense").textContent = pkg.license;
        const authorsNode = dialog.querySelector(".aboutAuthors");
        pkg.contributors.forEach(function (person) {
            const row = document.createElement("div");
            row.textContent = person.name;
            if (/@/.test(person.email)) {
                row.textContent += " ";
                row.appendChild(createLink("mailto: " + person.email, person.email));
            }
            authorsNode.appendChild(row);
        });
    });
}

// TODO this doesn't belong here
let settings;
(() => {
    const {ipcRenderer} = require("electron");
    ipcRenderer.on("settings", (sender, settingsStr) => settings = JSON.parse(settingsStr));
})();

function showSettingsDialog() {
    showDialogFromTemplate("settingsDialogTemplate", dialog => {
        const inputTxHistory = dialog.querySelector(".settingsTxHistory");
        const inputExplorerUrl = dialog.querySelector(".settingsExplorerUrl");
        const inputApiUrls = dialog.querySelector(".settingsApiUrls");
        const saveButton = dialog.querySelector(".settingsSave");

        inputTxHistory.value = settings.txHistory;
        inputExplorerUrl.value = settings.explorerUrl;
        inputApiUrls.value = settings.apiUrls.join("\n");

        dialog.querySelector(".settingsSave").addEventListener("click", () => {

            const newSettings = {
                txHistory: parseInt(inputTxHistory.value),
                explorerUrl: inputExplorerUrl.value.trim().replace(/\/?$/, ""),
                apiUrls: inputApiUrls.value.split(/\s+/).filter(s => !/^\s*$/.test(s)).map(s => s.replace(/\/?$/, "")),
            };
            ipcRenderer.send("save-settings", JSON.stringify(newSettings));
            dialog.close();
        });
    });
}

function openZenExplorer(path) {
    openUrl(settings.explorerUrl + "/" + path);
}

// TODO this doesn't belong here
function showGeneratePaperWalletDialog() {
    const zencashjs = require("zencashjs");
    var fs = require("fs");

    showDialogFromTemplate("generatePaperWalletDialogTemplate", dialog => {

        dialog.querySelector(".generateNewWallet").addEventListener("click", () => {
            let addressInWallet = document.getElementById("addPaperWalletArizen").checked;
            console.log(addressInWallet);

            var newWalletNamePaper = document.getElementById("newWalletNamePaper").value;
            console.log(newWalletNamePaper);

            // Clear Checkbox and Button from HTML
            let ButtonArea = document.getElementById("createButtonCheck");
            ButtonArea.innerHTML = "";

            // Style the new screen
            dialog.querySelector(".generateNewWalletTitle").textContent = "ZenCash Wallet"
            dialog.querySelector(".namezAddr").textContent = "Public Key";
            dialog.querySelector(".namePrivateKey").textContent = "Private Key";
            if (newWalletNamePaper){
                dialog.querySelector(".newWalletNamePaperLabel").innerHTML = "Name: " + newWalletNamePaper;
            }

            let wif = ipcRenderer.sendSync("get-paper-address-wif",addressInWallet, newWalletNamePaper);
            console.log('New wif created');
            let privateKey = zencashjs.address.WIFToPrivKey(wif);
            let pubKey = zencashjs.address.privKeyToPubKey(privateKey, true);
            let zAddr = zencashjs.address.pubKeyToAddr(pubKey);

            dialog.querySelector(".keyPrivate").textContent = privateKey;
            dialog.querySelector(".zAddr").textContent = zAddr;

            var QRCode = require("qrcode");

            // z Address QR Image
            var canvasZ = document.getElementById("canvasZ")

            QRCode.toCanvas(canvasZ, zAddr, function (error) {
                if (error) console.error(error)
                console.log("Success QRcode z Address.");
            });

            // Private Key QR Image
            var canvasPriv = document.getElementById("canvasPriv")

            QRCode.toCanvas(canvasPriv, privateKey, function (error) {
                if (error) console.error(error)
                console.log("Success QRCode Private Key");
            });


            // Print to PDF
            var pdfButton = document.createElement("BUTTON");
            pdfButton.setAttribute("id", "exportPDFButton");
            var t = document.createTextNode("Export PDF");       // Create a text node
            pdfButton.appendChild(t);
            dialog.querySelector(".pdfButton").appendChild(pdfButton)

            dialog.querySelector(".pdfButton").addEventListener("click", () => {
                // pdfButton.parentNode.removeChild(pdfButton);
                pdfButton.style.visibility='hidden'
                ipcRenderer.send("export-pdf",newWalletNamePaper);
                console.log('PDF export command sent')

            });
        });
    });
}

(() => {
    const {ipcRenderer} = require("electron");
    ipcRenderer.on("export-pdf-done", (event,arg)=> {
        console.log(arg);
        document.getElementById("exportPDFButton").style.visibility = "visible"
        console.log("exportPDFButton visible again.");
    });

    // ipcRenderer.on("show-again-export-pdf-button", (event,arg)=> {
    //     console.log(arg);
    //     document.getElementById("exportPDFButton").style.visibility = "visible"
    //     console.log("Should be visible");
    // });
})();
