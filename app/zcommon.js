// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {DateTime} = require("luxon");
const {translate} = require("./util.js");
const zencashjs = require("zencashjs");
const rpc = require("./rpc.js");
const {zenextra} = require("./zenextra.js");

const userWarningImportPK = "A new address and a private key will be imported. Your previous back-ups do not include the newly imported address or the corresponding private key. Please use the backup feature of Arizen to make new backup file and replace your existing Arizen wallet backup. By pressing 'I understand' you declare that you understand this. For further information please refer to the help menu of Arizen.";
const userWarningImportPkUserZendRescan = "The balance of the Z address you imported will be visible after you rescan the blockchain. Please run 'zen-cli stop && sleep 8 && zend -rescan' in your secure node (linux).";

let settings = {};
let internalInfo = {};
let langDict;

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
 * @param {string} startRoot -
 * @returns {Array} array of matched nodes
 */
function querySelectorAllDeep(selector, startRoot = document) {
    const roots = [startRoot];
    const nodeQueue = [...startRoot.children];

    while (nodeQueue.length) {
        const node = nodeQueue.shift();
        if (node.shadowRoot) {
            roots.push(node.shadowRoot);
        }
        if (node.tagName === "TEMPLATE" && node.content) {
            roots.push(node.content);
        }
        nodeQueue.push(...node.children);
    }

    const matches = [];
    for (const r of roots) {
        matches.push(... r.querySelectorAll(selector));
    }
    return matches;
}

function deepClone(obj) {
    // feel free to make a better implementation
    if (!obj) {
        return null;
    }
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
    if (confirm(msg)) {
        onOk();
    } else if (onCancel) {
        onCancel();
    }
    // else {
    // FIXME: what here?
    // }
}

function showNotification(message) {
    if (settings && !settings.notifications) {
        return;
    }
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
    querySelectorAllDeep("a[href^='http']", parent).forEach(link => link.addEventListener("click", linkHandler));
}

function fixAmountInputs(parent = document) {
    querySelectorAllDeep(".amountInput", parent).forEach(node => {
        function updateBalanceText() {
            node.value = node.valueAsNumber.toFixed(8);
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
    if (!templateNode) {
        throw new Error(`No template with ID "${id}"`);
    }
    const node = templateNode.content.cloneNode(true).firstElementChild;
    if (!node) {
        throw new Error(`Template is empty (ID "${id}")`);
    }
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
        childRect.left < parentRect.left) {
        child.scrollIntoView();
    }
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
(() => {
    const {ipcRenderer} = require("electron");
    ipcRenderer.on("settings", (sender, settingsStr) => {
        // don't notify about new settings on startup
        pingSecureNode();
        //rpc.pingSecureNodeRPCResult();

        if (Object.keys(settings).length) {
            showNotification(tr("notification.settingsUpdated", "Settings updated"));
        }
        const newSettings = JSON.parse(settingsStr);
        if (settings.lang !== newSettings.lang) {
            changeLanguage(newSettings.lang);
        }

        if (newSettings.autoLogOffEnable) {
            autoLogOffEnable(newSettings.autoLogOffTimeout);
        } else {
            autoLogOffDisable();
        }
        settings = newSettings;
    });

    ipcRenderer.on("internal-info", (sender, internalInfoStr) => {
        // const newInternalInfo = JSON.parse(internalInfoStr);
        internalInfo = JSON.parse(internalInfoStr);
    });

})();

function saveModifiedSettings() {
    ipcRenderer.send("save-settings", JSON.stringify(settings));
}

function saveInternalInfo() {
    ipcRenderer.send("save-internal-info", JSON.stringify(internalInfo));
}

function syncZaddrIfSettingsExist() {
    let settingsForSecureNodeExist = (settings.secureNodeFQDN && settings.secureNodePort && settings.secureNodeUsername && settings.secureNodePassword && settings.sshUsername && settings.sshPassword && settings.sshPort)
    if (settingsForSecureNodeExist) {
        rpc.importAllZAddressesFromSNtoArizen();
        rpc.importAllZAddressesFromArizentoSN();
    }
}

function isValidDomainName(domainOrIP) {
    return (domainOrIP != "" && domainOrIP != undefined) // more to be added
}

function pingSecureNode() {
    if (isValidDomainName(settings.secureNodeFQDN)) {
        let ping = require('ping');
        const isIp = require('is-ip');

        let fqdnIsV6 = isIp.v6(settings.secureNodeFQDN);
        console.log(settings.secureNodeFQDN);
        console.log(fqdnIsV6);

        var cfg = {
        v6:fqdnIsV6,
        };

        let hosts = [settings.secureNodeFQDN];
        hosts.forEach(function (host) {
            ping.sys.probe(host, function (isAlive) {
              console.log(isAlive);
                if (isAlive) {
                    document.getElementById("dotSNstatus").style.backgroundColor = "#34A853"; // green
                } else {
                    document.getElementById("dotSNstatus").style.backgroundColor = "#EA4335"; // red #EA4335
                    document.getElementById("dotSNstatusRPC").style.backgroundColor = "#EA4335"; // red #EA4335
                }
            }, cfg);
        });
    }
}

function colorRpcLEDs(isAlive) {
    if (isAlive) {
        document.getElementById("dotSNstatusRPC").style.backgroundColor = "#34A853"; // green "#34A853"
        document.getElementById("dotSNstatus").style.backgroundColor = "#34A853"; // green
    } else {
        document.getElementById("dotSNstatusRPC").style.backgroundColor = "#EA4335"; // red #EA4335
    }
}

async function pingSecureNodeRPCResult() {
    if (isValidDomainName(settings.secureNodeFQDN)) {
        let isAlive = await rpc.pingSecureNodeRPC();
        colorRpcLEDs(isAlive);
    }
}

function showSettingsDialog() {
    showDialogFromTemplate("settingsDialogTemplate", dialog => {
        const inputTxHistory = dialog.querySelector(".settingsTxHistory");
        const inputExplorerUrl = dialog.querySelector(".settingsExplorerUrl");
        const inputApiUrls = dialog.querySelector(".settingsApiUrls");
        const inputFiatCurrency = dialog.querySelector(".settingsFiatCurrency");
        const inputLanguages = dialog.querySelector(".settingsLanguage");
        const inputNotifications = dialog.querySelector(".enableNotifications");
        const inputSecureNodeFQDN = dialog.querySelector(".settingsSecureNodeFQDN");
        const inputSecureNodePort = dialog.querySelector(".settingsSecureNodePort");
        const inputSecureNodeUsername = dialog.querySelector(".settingsSecureNodeUsername");
        const inputSecureNodePassword = dialog.querySelector(".settingsSecureNodePassword");

        const inputSshUsername = dialog.querySelector(".settingsSshUsername");
        const inputSshPassword = dialog.querySelector(".settingsSshPassword");
        const inputSshPort = dialog.querySelector(".settingsSshPort");
        const inputReadyTimeout = dialog.querySelector(".settingsReadyTimeout");
        const inputForwardTimeout = dialog.querySelector(".settingsForwardTimeout");
        const inputDomainFrontingEnable = dialog.querySelector(".enableDomainFronting");
        const inputDomainFrontingUrl = dialog.querySelector(".settingDomainFrontingUrl");
        const inputDomainFrontingHost = dialog.querySelector(".settingDomainFrontingHost");
        const inputAutoLogOffEnable = dialog.querySelector(".settingAutoLogOffEnable");
        const inputAutoLogOffTimeout = dialog.querySelector(".settingAutoLogOffTimeout");

        inputTxHistory.value = settings.txHistory;
        inputExplorerUrl.value = settings.explorerUrl;
        loadAvailableLangs(inputLanguages, settings.lang);
        inputApiUrls.value = settings.apiUrls.join("\n");
        inputFiatCurrency.value = settings.fiatCurrency;
        inputNotifications.checked = settings.notifications;
        inputDomainFrontingEnable.checked = settings.domainFronting || false;
        inputDomainFrontingUrl.value = settings.domainFrontingUrl || "https://www.google.com";
        inputDomainFrontingHost.value = settings.domainFrontingHost || "zendhide.appspot.com";
        inputFiatCurrency.value = settings.fiatCurrency || "USD";

        inputSecureNodeFQDN.value = settings.secureNodeFQDN;
        inputSecureNodePort.value = settings.secureNodePort || 8231;
        inputSecureNodeUsername.value = settings.secureNodeUsername || "";
        inputSecureNodePassword.value = settings.secureNodePassword || "";
        inputSshUsername.value = settings.sshUsername || "";
        inputSshPassword.value = settings.sshPassword || "";
        inputSshPort.value = settings.sshPort || 22;
        inputReadyTimeout.value = settings.readyTimeout || 10000;
        inputForwardTimeout.value = settings.forwardTimeout || 10000;

        inputAutoLogOffEnable.checked = settings.autoLogOffEnable;
        inputAutoLogOffTimeout.value = settings.autoLogOffTimeout || 60;


        dialog.querySelector(".settingsSave").addEventListener("click", () => {
            const newSettings = {
                txHistory: parseInt(inputTxHistory.value),
                explorerUrl: inputExplorerUrl.value.trim().replace(/\/?$/, ""),
                apiUrls: inputApiUrls.value.split(/\s+/).filter(s => !/^\s*$/.test(s)).map(s => s.replace(/\/?$/, "")),
                fiatCurrency: inputFiatCurrency.value,
                lang: inputLanguages[inputLanguages.selectedIndex].value,
                notifications: inputNotifications.checked ? 1 : 0,

                secureNodeFQDN: inputSecureNodeFQDN.value,
                secureNodePort: inputSecureNodePort.value,
                secureNodeUsername: inputSecureNodeUsername.value,
                secureNodePassword: inputSecureNodePassword.value,
                sshUsername: inputSshUsername.value,
                sshPassword: inputSshPassword.value,
                sshPort: inputSshPort.value,
                readyTimeout: inputReadyTimeout.value,
                forwardTimeout: inputForwardTimeout.value,

                domainFronting: inputDomainFrontingEnable.checked,
                domainFrontingUrl: inputDomainFrontingUrl.value,
                domainFrontingHost: inputDomainFrontingHost.value,
                autoLogOffEnable: inputAutoLogOffEnable.checked ? 1 : 0,
                autoLogOffTimeout: inputAutoLogOffTimeout.value < 60 ? 60 : inputAutoLogOffTimeout.value
            };

            if (settings.lang !== newSettings.lang) {
                changeLanguage(newSettings.lang);
            }

            Object.assign(settings, newSettings);
            saveModifiedSettings();

            let zenBalance = getZenBalance();
            setFiatBalanceText(zenBalance, inputFiatCurrency.value);

            syncZaddrIfSettingsExist();

            dialog.close();
        });
    });
}

function showImportSinglePKDialog() {
    let response = -1;
    response = ipcRenderer.sendSync("renderer-show-message-box", tr("warmingMessages.userWarningImportPK", userWarningImportPK), [tr("warmingMessages.userWarningIUnderstand", "I understand")]);
    if (response === 0) {
        showDialogFromTemplate("importSinglePrivateKeyDialogTemplate", dialog => {
            const importButton = dialog.querySelector(".newPrivateKeyImportButton");
            const nameInput = dialog.querySelector(".newPrivateKeyDialogName");
            const privateKeyInput = dialog.querySelector(".newPrivateKeyDialogKey");
            importButton.addEventListener("click", () => {
                const name = nameInput.value ? nameInput.value : "";
                let pk = privateKeyInput.value;
                let importT = dialog.querySelector(".importTorZgetT").checked;
                let importZ = dialog.querySelector(".importTorZgetZ").checked;
                let checkAddr;

                if ((zenextra.isPKorWif(pk) === true && importT) || (zenextra.isPKorSpendingKey(pk) === true && importZ)) {
                    console.log(name);
                    console.log(pk);
                    if (importT) {
                        if (zenextra.isWif(pk) === true) {
                            pk = zencashjs.address.WIFToPrivKey(pk);
                        }
                        let pubKey = zencashjs.address.privKeyToPubKey(pk, true);
                        checkAddr = zencashjs.address.pubKeyToAddr(pubKey);
                    }
                    if (importZ) {
                        let secretKey = pk;
                        if (zenextra.isSpendingKey(pk) === true) {
                            // pk = spendingKey
                            secretKey = zenextra.spendingKeyToSecretKey(pk);
                            pk = secretKey;
                        }
                        let a_pk = zencashjs.zaddress.zSecretKeyToPayingKey(secretKey);
                        let pk_enc = zencashjs.zaddress.zSecretKeyToTransmissionKey(secretKey);
                        checkAddr = zencashjs.zaddress.mkZAddress(a_pk, pk_enc);
                    }

                    let resp = ipcRenderer.sendSync("check-if-address-in-wallet", checkAddr);
                    let addrExists = resp.exist;

                    if (addrExists === true) {
                        alert(tr("wallet.importSinglePrivateKey.warningNotValidAddress", "Address exist in your wallet"))
                    } else {
                        ipcRenderer.send("import-single-key", name, pk, importT);
                        alert(tr("warmingMessages.userWarningImportPK", userWarningImportPK));
                        if (importZ) {
                            alert(tr("warmingMessages.userWarningImportPkUserZendRescan", userWarningImportPkUserZendRescan));
                        }
                        dialog.close();
                    }
                } else {
                    alert(tr("wallet.importSinglePrivateKey.warningNotValidPK", "This is not a valid Private Key or you try to import a Spending Key (only for Z addresses) as T address Private key."));
                }
            });
        });
    }
}

function showRpcDialog() {
    showDialogFromTemplate("tempRpcTemplate", dialog => {
        const testRpcButton = dialog.querySelector(".testRPCButton");
        const resultRPC = dialog.querySelector(".resultRPC");
        const inputCommandRPC = dialog.querySelector(".giveCommandRPC");
        const statusRPC = dialog.querySelector(".statusRPC");
        const testFunctionButton = dialog.querySelector(".testFunction");

        testFunctionButton.addEventListener("click", async function () {
            // Put here what you want to test ...
            //let res = await rpc.rpcCallResultSync("z_listaddresses",[]);
            //console.log(res);

            console.log(internalInfo);
            //internalInfo.pendingTxs = [];
            //internalInfo.pendingTxs.push({type:"snT-Z",from: "a", to: "b", amount:1, fee:2});
            //console.log(internalInfo);
            //console.log(internalInfo.pendingTxs[0]);

        });

        testRpcButton.addEventListener("click", async function () {
            resultRPC.innerHTML = "Fetching ...";
            statusRPC.innerHTML = "Fetching ...";

            let cmd = rpc.cleanCommandString(inputCommandRPC.value);
            inputCommandRPC.value = cmd;

            let resp = rpc.splitCommandString(cmd);
            let method = resp.method;
            let params = resp.params;
            let respTwo = await rpc.rpcCallResultSync(method, params);

            resultRPC.innerHTML = JSON.stringify(respTwo.output, undefined, 4);
            statusRPC.innerHTML = respTwo.status;

        });
    });
}

(() => {
    const {ipcRenderer} = require("electron");
    ipcRenderer.on("open-rpc-console", (event) => {
        showRpcDialog();
    });
})();

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
    if (!langDict) {
        return;
    }
    querySelectorAllDeep("[data-tr]").forEach(node => node.textContent = tr(node.dataset.tr, node.textContent));
}

//------------------------------------------------

let autoLogOffTimerId;
let autoLogOffEventHandler;

function autoLogOffEnable(timeout) {
    autoLogOffDisable();

    let currentTime = timeout;
    autoLogOffUpdateUI(currentTime);

    autoLogOffTimerId = setInterval(() => {
        currentTime--;
        if (currentTime > 0) {
            autoLogOffUpdateUI(currentTime);
        } else {
            autoLogOffDisable();
            logout();
        }
    }, 1000);

    autoLogOffEventHandler = () => {
        currentTime = timeout;
        autoLogOffUpdateUI(currentTime);
    };

    document.addEventListener("mousemove", autoLogOffEventHandler);
    document.addEventListener("keypress", autoLogOffEventHandler);
    document.addEventListener("click", autoLogOffEventHandler);

    hideElement(document.getElementById("autoLogOffTimer"), false);
}

function autoLogOffDisable() {
    if (!autoLogOffTimerId) {
        return;
    }

    clearInterval(autoLogOffTimerId);

    document.removeEventListener("mousemove", autoLogOffEventHandler);
    document.removeEventListener("keypress", autoLogOffEventHandler);
    document.removeEventListener("click", autoLogOffEventHandler);

    hideElement(document.getElementById("autoLogOffTimer"), true);

    autoLogOffTimerId = 0;
    autoLogOffEventHandler = null;
}

function autoLogOffUpdateUI(currentTime) {
    const node = document.getElementById("autoLogOffTimerTime");
    node.textContent = currentTime;
}

//------------------------------------------------
module.exports = {
    syncZaddrIfSettingsExist: syncZaddrIfSettingsExist
};
