// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {DateTime} = require("luxon");
const {translate} = require("./util.js");
const zencashjs = require("zencashjs");

const userWarningImportPK = "A new address and a private key is imported. Your previous back-ups do not include this newly imported address or the corresponding private key. Please use the backup feature of Arizen to make new backup file and replace your existing Arizen wallet backup. By pressing OK you declare that you understand this."

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

/**
 * Like `document.querySelectorAll()`, but queries shadow roots and template
 * contents too and returns an `Array` of nodes instead of a `NodeList`.
 *
 * @param {string} selector - selector string
 * @returns {Array} array of matched nodes
 */
function querySelectorAllDeep(selector, startRoot = document) {
    const roots = [startRoot];

    const nodeQueue = [...startRoot.children];
    while (nodeQueue.length) {
        const node = nodeQueue.shift();
        if (node.shadowRoot)
            roots.push(node.shadowRoot);
        if (node.tagName === "TEMPLATE" && node.content)
            roots.push(node.content);
        nodeQueue.push(...node.children);
    }

    const matches = [];
    for (const r of roots)
        matches.push(... r.querySelectorAll(selector));
    return matches;
}

function deepClone(obj) {
    // feel free to make a better implementation
    if (!obj)
        return null;
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Shows a OK/Cancel message box with `msg`. Executes `ifOk` lambda if user
 * presses OK or executes `onCancel` if it is defined and user presses Cancel.
 *
 * @param {string} msg - message for the user
 * @param {function} onOk - lambda executed if OK is pressed
 * @param {function=} onOk - lambda executed if Cancel is pressed
 */
function warnUser(msg, onOk, onCancel) {
    if (confirm(msg))
        onOk();
    else if (onCancel)
        onCancel();
}

function showNotification(message) {
    if (settings && !settings.notifications)
        return;
    const notif = new Notification("Arizen", {
        body: message,
        icon: "resources/zen_icon.png"
    });
    notif.onclick = () => notif.close();
}

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

function linkHandler(event) {
    event.preventDefault();
    openUrl(event.target.href);
}

function fixLinks(parent = document) {
    querySelectorAllDeep("a[href^='http']", parent).forEach(link =>
        link.addEventListener("click", linkHandler));
}

function fixAmountInputs(parent = document) {
    querySelectorAllDeep(".amountInput", parent).forEach(node => {
        function updateBalanceText() {
            node.value = formatBalance(node.valueAsNumber, "en")
        }

        updateBalanceText();
        node.addEventListener("change", () => updateBalanceText());
    });
}

function fixPage(parent = document) {
    fixLinks(parent);
    fixAmountInputs(parent);
}

/**
 * Sets `<input>` node's value and also fires the change event. Needed for
 * amount nodes which are currently hacked by reformatting their contents on
 * change.
 *
 * @param {Node} node
 * @param {string} value
 */
function setInputNodeValue(node, value) {
    node.value = value;
    node.dispatchEvent(new Event("change"));
}

function formatBalance(balance, localeTag = undefined) {
    return parseFloat(balance).toLocaleString(localeTag, {minimumFractionDigits: 8, maximumFractionDigits: 8});
}

function formatFiatBalance(balance, localeTag = undefined) {
    return parseFloat(balance).toLocaleString(localeTag, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function formatBalanceDiff(diff, localeTag = undefined) {
    return diff >= 0 ? "+" + formatBalance(diff, localeTag) : "-" + formatBalance(-diff, localeTag);
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
    const templateNode = document.getElementById(id);
    if (!templateNode)
        throw new Error(`No template with ID "${id}"`);
    const node = templateNode.content.cloneNode(true).firstElementChild;
    if (!node)
        throw new Error(`Template is empty (ID "${id}")`);
    fixPage(node);
    return node;
}

/**
 * Creates dialog from a template and adds it to the DOM.
 *
 * WARNING! You have to call close() on the retunred dialog otherwise it'll stay
 * in the DOM. The close event handler will automatically remove it from DOM. If
 * you use `id` attributes on slotted contents and forget to remove old dialog
 * before creating a new one from the same template, this will result in
 * duplicate IDs in the DOM. Maybe. To be honest, I (woky) don't know how IDs on
 * slotted contents in shadow DOM work. Feel free to experiment and update this
 * comment.
 *
 * @param templateId id of the template
 * @returns the `<arizen-dialog>` node of the created dialog
 */
function createDialogFromTemplate(templateId) {
    const dialog = cloneTemplate(templateId);
    if (dialog.tagName !== "ARIZEN-DIALOG") {
        throw new Error("No dialog in the template");
    }
    document.body.appendChild(dialog);
    dialog.addEventListener("close", () => dialog.remove());
    return dialog;
}

function showDialogFromTemplate(templateId, dialogInit, onClose = null) {
    const dialog = createDialogFromTemplate(templateId);
    dialogInit(dialog);
    if (onClose) {
        dialog.addEventListener("close", () => onClose());
    }
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
    link.addEventListener("click", linkHandler);
    return link;
}

// TODO this doesn't belong here
function showAboutDialog() {
    const pkg = require("../package.json");
    showDialogFromTemplate("aboutDialogTemplate", dialog => {
        dialog.querySelector(".aboutHomepage").appendChild(createLink(pkg.homepage, pkg.homepage));
        dialog.querySelector(".aboutVersion").textContent = pkg.version;
        dialog.querySelector(".aboutLicense").textContent = pkg.license;
        // const authorsNode = dialog.querySelector(".aboutAuthors");
        // pkg.contributors.forEach(function (person) {
        //     const row = document.createElement("div");
        //     row.textContent = person.name;
        //     if (/@/.test(person.email)) {
        //         row.textContent += " ";
        //         row.appendChild(createLink("mailto: " + person.email, person.email));
        //     }
        //     authorsNode.appendChild(row);
        // });
    });
}

// TODO this doesn't belong here
let settings = {};
let langDict;
(() => {
    const {ipcRenderer} = require("electron");
    ipcRenderer.on("settings", (sender, settingsStr) => {
        // don't notify about new settings on startup
        if (Object.keys(settings).length)
            showNotification(tr("notification.settingsUpdated", "Settings updated"));
        const newSettings = JSON.parse(settingsStr);
        if (settings.lang !== newSettings.lang)
            changeLanguage(newSettings.lang);
        settings = newSettings;
    });
})();

function saveModifiedSettings() {
    ipcRenderer.send("save-settings", JSON.stringify(settings));
}

function showSettingsDialog() {
    showDialogFromTemplate("settingsDialogTemplate", dialog => {
        const inputTxHistory = dialog.querySelector(".settingsTxHistory");
        const inputExplorerUrl = dialog.querySelector(".settingsExplorerUrl");
        const inputApiUrls = dialog.querySelector(".settingsApiUrls");
        const inputFiatCurrency = dialog.querySelector(".settingsFiatCurrency");
        const inputLanguages = dialog.querySelector(".settingsLanguage");
        const inputNotifications = dialog.querySelector(".enableNotifications");

        inputTxHistory.value = settings.txHistory;
        inputExplorerUrl.value = settings.explorerUrl;
        loadAvailableLangs(inputLanguages, settings.lang);
        inputApiUrls.value = settings.apiUrls.join("\n");
        inputFiatCurrency.value = settings.fiatCurrency;
        inputNotifications.checked = settings.notifications;

        // An existing user has empty value settings.fiatCurrency
        if (settings.fiatCurrency === "" || settings.fiatCurrency === undefined || settings.fiatCurrency === null) {
            inputFiatCurrency.value = "USD";
        }
        console.log(settings);

        dialog.querySelector(".settingsSave").addEventListener("click", () => {
            const newSettings = {
                txHistory: parseInt(inputTxHistory.value),
                explorerUrl: inputExplorerUrl.value.trim().replace(/\/?$/, ""),
                apiUrls: inputApiUrls.value.split(/\s+/).filter(s => !/^\s*$/.test(s)).map(s => s.replace(/\/?$/, "")),
                fiatCurrency: inputFiatCurrency.value,
                lang: inputLanguages[inputLanguages.selectedIndex].value,
                notifications: inputNotifications.checked ? 1 : 0,
            };

            if (settings.lang !== newSettings.lang)
                changeLanguage(newSettings.lang);

            Object.assign(settings, newSettings);
            saveModifiedSettings();

            let zenBalance = getZenBalance();
            setFiatBalanceText(zenBalance, inputFiatCurrency.value);

            dialog.close();
        });
    });
}

function showImportSinglePKDialog() {
    showDialogFromTemplate("importSinglePrivateKeyDialogTemplate", dialog => {
        const importButton = dialog.querySelector(".newPrivateKeyImportButton");
        const nameInput = dialog.querySelector(".newPrivateKeyDialogName");
        const privateKeyInput = dialog.querySelector(".newPrivateKeyDialogKey");
        importButton.addEventListener("click", () => {
            const name = nameInput.value ? nameInput.value : "";
            let pk = privateKeyInput.value;

            if (isPKorWif(pk) === true) {
                console.log(name);
                console.log(pk);
                if (isWif(pk) === true) {
                    pk = zencashjs.address.WIFToPrivKey(pk);
                }
                let pubKey = zencashjs.address.privKeyToPubKey(pk, true);
                let zAddress = zencashjs.address.pubKeyToAddr(pubKey);
                let resp = ipcRenderer.sendSync("check-if-z-address-in-wallet", zAddress);
                let zAddrExists = resp.exist;

                if (zAddrExists === true) {
                    alert(tr("wallet.importSinglePrivateKey.warningNotValidAddress", "Z address exist in your wallet"))
                } else {
                    ipcRenderer.send("import-single-key", name, pk);
                    alert(tr("warmingMessages.userWarningImportPK", userWarningImportPK))
                    dialog.close();
                }
            } else {
                alert(tr("wallet.importSinglePrivateKey.warningNotValidPK", "This is not a valid Private Key."));
            }
        });
    });
}

function openZenExplorer(path) {
    openUrl(settings.explorerUrl + "/" + path);
}

function getZenBalance() {
    const totalBalanceAmountNode = document.getElementById("totalBalanceAmount");
    return formatBalance(parseFloat(totalBalanceAmountNode.innerHTML));
}

function loadAvailableLangs(select, selected) {
    const fs = require("fs");
    fs.readdir(__dirname + "/lang", (err, files) => {
        if (err) {
            console.log(err);
            return;
        }
        files.forEach(file => {
            let tempLangData = require("./lang/" + file);
            let opt = document.createElement("option");
            opt.value = tempLangData.languageValue;
            opt.innerHTML = tempLangData.languageName;
            if (tempLangData.languageValue === selected) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
    });
}

function changeLanguage(lang) {
    // translation functions depend on this global
    settings.lang = lang;
    ipcRenderer.send("set-lang", lang);
    langDict = require("./lang/lang_" + lang + ".json");
    translateCurrentPage();
}

function tr(key, defaultVal) {
    return (settings && settings.lang) ? translate(langDict, key, defaultVal) : defaultVal;
}

/**
 * Sets `node`'s `textContent` to a translated text based on the translation
 * key `key` and current language setting or to the `defaultVal` if the `key`
 * is not translated. Also sets node's `data-tr` attribute to the `key`.
 * If the `key` is null, only `defaultVal` is used and `data-tr` attribute is
 * removed.
 *
 * @param {Node} node node to which set the translated text (`<span>`/`<div>`)
 * @param {string} key translation key
 * @param {string} defaultVal default text
 */
function setNodeTrText(node, key, defaultVal) {
    if (key) {
        node.dataset.tr = key;
        node.textContent = tr(key, defaultVal);
    } else {
        delete node.dataset.tr;
        node.textContent = defaultVal;
    }
}

function translateCurrentPage() {
    if (!langDict)
        return;
    querySelectorAllDeep("[data-tr]").forEach(node =>
        node.textContent = tr(node.dataset.tr, node.textContent));
}

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
