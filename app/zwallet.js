// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {ipcRenderer} = require("electron");
const Qrcode = require("qrcode");
const jsPDF = require("jspdf");
const {showPaperWalletDialog} = require("./paperwallet.js");

function logIpc(msgType) {
    ipcRenderer.on(msgType, (...args) => {
        console.log(`IPC Message: ${msgType}, Args:`);
        for (let i = 0; i < args.length; i++) {
            console.log(args[i]);
        }
    });
}

// sed -r -n "/\.send/{s/.*send\("([^"]+)".*/logIpc("\1");/p}" main.js|sort -u
logIpc("call-get-wallets");
logIpc("check-login-response");
logIpc("generate-wallet-response");
logIpc("get-settings-response");
logIpc("get-transaction-update");
logIpc("get-wallet-by-name-response");
logIpc("refresh-wallet-response");
logIpc("render-qr-code");
logIpc("save-settings-response");
logIpc("send-finish");
logIpc("show-notification-response");
logIpc("update-wallet-balance");
logIpc("verify-login-response");
logIpc("write-login-response");
logIpc("zz-get-wallets");

let addrListNode = document.getElementById("addrList");
const txListNode = document.getElementById("txList");
const totalBalanceNode = document.getElementById("totalBalance");
const loadingImageNode = document.getElementById("loadingImage");
const depositTabButton = document.getElementById("depositTabButton");
const depositToButton = document.getElementById("depositToButton");
const depositToAddrInput = document.getElementById("depositToAddr");
const depositAmountInput = document.getElementById("depositAmount");
const depositMsg = document.getElementById("depositMsg");
const depositQrcodeImage = document.getElementById("depositQrcodeImg");
const depositSaveQrcodeButton = document.getElementById("depositSaveQrcodeButton");
const withdrawTabButton = document.getElementById("withdrawTabButton");
const withdrawFromButton = document.getElementById("withdrawFromButton");
const withdrawFromAddrInput = document.getElementById("withdrawFromAddr");
const withdrawToButton = document.getElementById("withdrawToButton");
const withdrawToAddrInput = document.getElementById("withdrawToAddr");
const withdrawAmountInput = document.getElementById("withdrawAmount");
const withdrawFeeInput = document.getElementById("withdrawFee");
const withdrawMsg = document.getElementById("withdrawMsg");
const withdrawButton = document.getElementById("withdrawButton");
const withdrawStatusTitleNode = document.getElementById("withdrawStatusTitle");
const withdrawStatusBodyNode = document.getElementById("withdrawStatusBody");

const userWarningCreateNewAddress = "A new address and a private key will be created. Your previous back-ups do not include this newly generated address or the corresponding private key. Please use the backup feature of Arizen to make new backup file and replace your existing Arizen wallet backup. By pressing 'I understand' you declare that you understand this. For further information please refer to the help menu of Arizen.";

const refreshTimeout = 300;
let refreshTimer;
let showZeroBalances = true;
let depositQrcodeTimer;
let addrObjList;
let addrIdxByAddr;
let refreshCounter = 0;

// ---------------------------------------------------------------------------------------------------------------------
// IPC
ipcRenderer.on("get-wallets-response", (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
    addrObjList = [];
    addrIdxByAddr = new Map();
    clearChildNodes(addrListNode);
    clearChildNodes(txListNode);
    // TODO: sort like txs
    addAddresses(msg.wallets);
    addTransactions(msg.transactions);
    setTotalBalance(msg.total);
    scheduleRefresh();
});

ipcRenderer.on("update-wallet-balance", (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
    setAddressBalance(msg.addrObj.addr, msg.addrObj.lastbalance);
    setTotalBalance(msg.total);
    showNotification(`${tr("notification.balanceUpdated", "Balance updated")} (${formatBalanceDiff(msg.diff)})`);
});

ipcRenderer.on("get-transaction-update", (event, msgStr) => {
    const txObj = JSON.parse(msgStr);
    txObj.amount = parseFloat(txObj.amount);
    addTransactions([txObj], true);
    showNotification(tr("notification.newTransactions", "New transaction"));
});

ipcRenderer.on("add-loading-image", (event) => {
    refreshCounter = refreshCounter + 1;
    loadingImageNode.innerHTML = "<img src='resources/loading.gif' height='14' width='14' />"
});

ipcRenderer.on("remove-loading-image", (event) => {
    refreshCounter = refreshCounter - 1;
    if (refreshCounter <= 0) {
        loadingImageNode.innerHTML = ""
    }
});

ipcRenderer.on("refresh-wallet-response", (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
    scheduleRefresh();
});

ipcRenderer.on("send-refreshed-wallet-balance", (event, totalBalance) => {
    setTotalBalance(totalBalance);
});

ipcRenderer.on("send-finish", (event, result, msg) =>
    updateWithdrawalStatus(result, msg));

ipcRenderer.on("rename-wallet-response", (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
    setAddressName(msg.addr, msg.newname);
});

ipcRenderer.on("generate-wallet-response", (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
    addNewAddress(msg.addr);
    //alert(tr("warmingMessages.userWarningCreateNewAddress", userWarningCreateNewAddress))
});

ipcRenderer.on("main-sends-alert", (event, msgStr) => {
    alert(msgStr)
 });

ipcRenderer.on("change-wallet-password-begin", (event, currentPassword) => {
    showChangeWalletPasswordDialog(currentPassword);
});

ipcRenderer.on("change-wallet-password-finish", (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    showPasswordChangeNotice(msg);
});

window.addEventListener("load", initWallet);

// FUNCTIONS
function checkResponse(resp) {
    if (resp.response !== "OK") {
        console.error(resp);
        throw new Error("Failed response");
    }
}

function warnTxSend(onOk) {
    const msg = tr("wallet.tabWithdraw.withdrawConfirmQuestion", "Do you really want to send this transaction?");
    if (confirm(msg)) {
        onOk();
    }
}

function getAddrData(addr) {
    const idx = addrIdxByAddr.get(addr);
    let addrObj, addrNode;
    if (idx !== null) {
        addrObj = addrObjList[idx];
        addrNode = addrListNode.children[idx];
    }
    return [addrObj, addrNode, idx];
}

// Expects a balance node with one balanceAmount child node
function setBalanceText(balanceNode, balance) {
    const balanceAmountNode = balanceNode.firstElementChild;
    balanceAmountNode.textContent = formatBalance(balance);
    if (balance > 0)
        balanceNode.classList.add("positive");
    else
        balanceNode.classList.remove("positive");
}

function setFiatBalanceText(balanceZen, fiatCurrencySymbol = "") {
    const totalBalanceFiatNode = document.getElementById("totalBalanceFiat");
    const balanceFiatAmountNode = totalBalanceFiatNode.firstElementChild;
    const lastUpdateTimeNode = document.getElementById("lastUpdateTime");
    if (fiatCurrencySymbol === "") {
        fiatCurrencySymbol = settings.fiatCurrency;
        if (fiatCurrencySymbol === undefined || fiatCurrencySymbol === null) {
            fiatCurrencySymbol = "USD";
        }
    }

    const axios = require("axios");
    const BASE_API_URL = "https://api.coinmarketcap.com/v1/ticker";
    let API_URL = BASE_API_URL + "/zencash/?convert=" + fiatCurrencySymbol;

    axios.get(API_URL).then(response => {
        let resp = response.data;
        let zenPrice = parseFloat(resp[0]["price_" + fiatCurrencySymbol.toLowerCase()]);
        const now = new Date().toLocaleTimeString();
        let balance = parseFloat(balanceZen) * zenPrice;
        balanceFiatAmountNode.textContent = formatFiatBalance(balance) + " " + fiatCurrencySymbol;
        lastUpdateTimeNode.textContent = now;
    }).catch(error => {
        console.log(error);
    });
}

function setAddressNodeName(addrObj, addrNode) {
    if (addrObj.name)
        setNodeTrText(addrNode, null, addrObj.name);
    else
        setNodeTrText(addrNode, "wallet.tabOverview.unnamedAddress", "Unnamed address");
}

function createAddrItem(addrObj) {
    const addrItem = cloneTemplate("addrItemTemplate");
    addrItem.dataset.addr = addrObj.addr;

    setAddressNodeName(addrObj, addrItem.getElementsByClassName("addrName")[0]);
    addrItem.getElementsByClassName("addrText")[0].textContent = addrObj.addr;
    addrItem.getElementsByClassName("addrNameLine")[0]
        .addEventListener("click", () => showAddrDetail(addrObj.addr));
    addrItem.getElementsByClassName("addrDepositButton")[0]
        .addEventListener("click", () => {
            depositToAddrInput.value = addrObj.addr;
            updateDepositQrcode();
            depositTabButton.click();
        });
    addrItem.getElementsByClassName("addrWithdrawButton")[0]
        .addEventListener("click", () => {
            withdrawFromAddrInput.value = addrObj.addr;
            validateWithdrawForm();
            withdrawTabButton.click();
        });

    setAddrItemBalance(addrItem, addrObj.lastbalance);
    return addrItem;
}


function setAddrItemBalance(addrItem, balance) {
    addrItem.dataset.balance = balance;
    hideElement(addrItem, balance === 0 && !showZeroBalances);
    const balanceNode = addrItem.getElementsByClassName("addrBalance")[0];
    setBalanceText(balanceNode, balance);
    const withdrawButton = addrItem.getElementsByClassName("addrWithdrawButton")[0];
    withdrawButton.disabled = balance === 0;
}

function showAddrDetail(addr) {
    showDialogFromTemplate("addrDialogTemplate", dialog => {
        const [addrObj] = getAddrData(addr);
        dialog.querySelector(".addrDetailAddr").textContent = addr;
        setBalanceText(dialog.querySelector(".addrDetailBalance"), addrObj.lastbalance);
        const nameNode = dialog.querySelector(".addrDetailName");
        nameNode.value = addrObj.name;
        dialog.querySelector(".addrInfoLink").addEventListener("click", () => openZenExplorer("address/" + addr));
        const saveButton = dialog.querySelector(".addrDetailSave");
        saveButton.addEventListener("click", ev => {
            ipcRenderer.send("rename-wallet", addr, nameNode.value);
        });
        dialog.addEventListener("keypress", ev => {
            if (event.keyCode === 13)
                saveButton.click();
        });
    });
}

// Expects a node with one amount child node
function setTxBalanceText(node, balance) {
    let balanceStr, balanceClass;
    if (balance >= 0) {
        balanceStr = "+" + formatBalance(balance);
        balanceClass = "positive";
    } else {
        balanceStr = "-" + formatBalance(-balance);
        balanceClass = "negative";
    }
    node.classList.add(balanceClass);
    const amountNode = node.firstElementChild;
    amountNode.textContent = balanceStr;
}

function createTxItem(txObj, newTx = false) {
    const node = txObj.block >= 0 ? cloneTemplate("txItemTemplate") : cloneTemplate("txMempoolItemTemplate");
    node.dataset.txid = txObj.txid;
    node.dataset.blockheight = txObj.block;
    if (txObj.block >= 0)
        node.querySelector(".txDate").textContent = formatEpochTime(txObj.time * 1000);
    setTxBalanceText(node.querySelector(".txBalance"), txObj.amount);
    if (newTx)
        node.classList.add("txItemNew");
    node.addEventListener("click", () => showTxDetail(txObj));
    return node;
}

function showTxDetail(txObj) {
    const templateId = txObj.block >= 0 ? "txDialogTemplate" : "mempoolTxDialogTemplate";
    showDialogFromTemplate(templateId, dialog => {
        dialog.querySelector(".txDetailTxId").textContent = txObj.txid;
        dialog.querySelector(".txInfoLink").addEventListener("click", () => openZenExplorer("tx/" + txObj.txid));
        setTxBalanceText(dialog.querySelector(".txDetailAmount"), txObj.amount);
        const vinListNode = dialog.querySelector(".txDetailFrom");
        txObj.vins.split(",").sort().forEach(addr => {
            const node = document.createElement("div");
            node.textContent = addr;
            if (addrIdxByAddr.has(addr))
                node.classList.add("negative");
            vinListNode.append(node);
        });
        const voutListNode = dialog.querySelector(".txDetailTo");
        txObj.vouts.split(",").sort().forEach(addr => {
            const node = document.createElement("div");
            node.textContent = addr;
            if (addrIdxByAddr.has(addr))
                node.classList.add("positive");
            voutListNode.append(node);
        });
        if (txObj.block >= 0) {
            dialog.querySelector(".txDetailDate").textContent = formatEpochTime(txObj.time * 1000);
            dialog.querySelector(".txDetailBlock").textContent = txObj.block;
        }
    });
}

function addNewAddress(addrObj) {
    addAddresses([addrObj]);
    const addrItem = addrListNode.children[addrIdxByAddr.get(addrObj.addr)];
    assert(addrItem);
    scrollIntoViewIfNeeded(addrListNode, addrItem);
}

function recreateAddrList() {
    const oldScrollTop = addrListNode.scrollTop;
    const newAddrListNode = addrListNode.cloneNode(false);
    addrObjList.forEach(addrObj => {
        const addrItem = createAddrItem(addrObj);
        hideElement(addrItem, addrObj.lastbalance === 0 && !showZeroBalances);
        newAddrListNode.appendChild(addrItem);
    });
    addrListNode.parentNode.replaceChild(newAddrListNode, addrListNode);
    addrListNode = newAddrListNode;
    newAddrListNode.scrollTop = oldScrollTop;
}

function sortAddresses() {
    addrObjList.sort((a, b) => {
        const balA = a.lastbalance;
        const balB = b.lastbalance;
        if (balA === balB) {
            const nameA = a.name || '';
            const nameB = b.name || '';
            if (nameA === nameB) {
                const addrA = a.addr;
                const addrB = b.addr;
                return addrA.localeCompare(addrB);
            } else {
                if (nameA === '')
                    return 1;
                else if (nameB === '')
                    return -1;
                else
                    return nameA.localeCompare(nameB);
            }
        } else
            return balB - balA;
    });
    addrObjList.forEach((addrObj, idx) => addrIdxByAddr.set(addrObj.addr, idx));
    recreateAddrList();
}

function addAddresses(newAddrs) {
    newAddrs.forEach(addrObj => {
        if (!addrIdxByAddr.has(addrObj.addr))
            addrObjList.push(addrObj);
        else
            console.warn(`Address ${addrObj.addr} is already in the list`);
    });
    sortAddresses();
}

function setAddressBalance(addr, balance) {
    const [addrObj, addrNode] = getAddrData(addr);
    assert(addrObj);
    addrObj.lastbalance = balance;
    setAddrItemBalance(addrNode, balance);
    sortAddresses();
}

function setAddressName(addr, name) {
    const [addrObj, addrNode] = getAddrData(addr);
    assert(addrObj);
    addrObj.name = name;
    setAddressNodeName(addrObj, addrNode.querySelector(".addrName"));
    sortAddresses();
    scrollIntoViewIfNeeded(addrListNode, addrNode);
}

function showNewAddrDialog() {
    let response = -1;
    response = ipcRenderer.sendSync("renderer-show-message-box", tr("warmingMessages.userWarningCreateNewAddress", userWarningCreateNewAddress), [tr("warmingMessages.userWarningIUnderstand", "I understand")]);
    console.log(response);
    if (response===0){
        showDialogFromTemplate("newAddrDialogTemplate", dialog => {
            const createButton = dialog.querySelector(".newAddrDialogCreate");
            createButton.addEventListener("click", () => {
                ipcRenderer.send("generate-wallet", dialog.querySelector(".newAddrDialogName").value);
                dialog.close();
            });
            dialog.addEventListener("keypress", ev => {
                if (event.keyCode === 13)
                    createButton.click();
            });
        });
    }
}

function addTransactions(txs, newTx = false) {
    txs.sort((a, b) => {
        if ((a.block - b.block) === 0) {
            return 0;
        } else if (a.block < 0) {
            return 1;
        } else if (b.block < 0) {
            return -1;
        }
        return a.block - b.block;
    });

    for (const txObj of txs) {
        const oldTxItem = txListNode.querySelector(`[data-txid='${txObj.txid}']`);
        if (oldTxItem) {
            if (oldTxItem.dataset.blockheight !== "-1") {
                console.error(tr("wallet.transactionHistory.replaceAttempt","Attempting to replace transaction in block"));
            } else if (txObj.block >= 0) {
                txListNode.replaceChild(createTxItem(txObj, newTx), oldTxItem);
            }
        } else {
            txListNode.prepend(createTxItem(txObj, newTx));
        }
    }
}

function setTotalBalance(balanceZen) {
    setBalanceText(totalBalanceNode, balanceZen);
    setFiatBalanceText(balanceZen);
}

function toggleZeroBalanceAddrs() {
    showZeroBalances = !showZeroBalances;
    addrObjList.forEach((addrObj, idx) => {
        if (!addrObj.lastbalance)
            hideElement(addrListNode.children[idx], !showZeroBalances);
    });
}

function scheduleRefresh() {
    if (refreshTimer)
        clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refresh(), refreshTimeout * 1000);
}

function refresh() {
    ipcRenderer.send("refresh-wallet");
    scheduleRefresh();
}

function showAddrSelectDialog(zeroBalanceAddrs, onSelected) {
    showDialogFromTemplate("addrSelectDialogTemplate", dialog => {
        const listNode = dialog.querySelector(".addrSelectList");
        for (const addrObj of addrObjList) {
            if (!zeroBalanceAddrs && !addrObj.lastbalance)
                continue;
            const row = cloneTemplate("addrSelectRowTemplate");
            row.querySelector(".addrSelectRowName").textContent = addrObj.name;
            row.querySelector(".addrSelectRowAddr").textContent = addrObj.addr;
            setBalanceText(row.querySelector(".addrSelectRowBalance"), addrObj.lastbalance);
            row.addEventListener("click", () => {
                dialog.close();
                onSelected(addrObj.addr);
            });
            listNode.appendChild(row)
        }
    });
}

function initDepositView() {
    const qrcodeTypeDelay = 500; // ms
    depositToAddrInput.addEventListener("input", () => updateDepositQrcode(qrcodeTypeDelay));
    depositAmountInput.addEventListener("input", () => updateDepositQrcode(qrcodeTypeDelay));
    depositToButton.addEventListener("click", () => showAddrSelectDialog(true, addr => {
        depositToAddrInput.value = addr;
        updateDepositQrcode();
    }));
    depositSaveQrcodeButton.addEventListener("click", () => {
        const pdf = new jsPDF({ unit: 'mm', format: [100, 100] });
        const w = pdf.internal.pageSize.width;
        const h = pdf.internal.pageSize.height;
        pdf.addImage(depositQrcodeImage.src, 'JPEG', 0, 0, w, h);
        const addr = depositToAddrInput.value;
        pdf.save(`arizen-deposit-${addr}.pdf`);
    });
}

function updateDepositQrcode(qrcodeDelay = 0) {
    const qrcodeOpts = {
        errorCorrectionLevel: "H",
        scale: 5,
        color: {dark: "#000000ff", light: "#fefefeff"}
    };

    depositQrcodeImage.classList.add("hidden");
    depositSaveQrcodeButton.disabled = true;

    const toAddr = depositToAddrInput.value;
    const amount = parseFloat(depositAmountInput.value || 0);

    if (!toAddr) {
        setNodeTrText(depositMsg, "wallet.tabDeposit.messages.emptyToAddr", "The to address is empty");
        return;
    }

    depositQrcodeImage.classList.remove("hidden");
    depositSaveQrcodeButton.disabled = false;

    if (!addrIdxByAddr.has(toAddr)) {
        setNodeTrText(depositMsg, "wallet.tabDeposit.messages.unknownToAddr", "The to address does not belong to this wallet");
    } else if (amount <= 0) {
        setNodeTrText(depositMsg, "wallet.tabDeposit.messages.zeroAmount", "The amount is not positive");
    } else {
        setNodeTrText(depositMsg, null, "\xA0" /* &nbsp; */);
    }
    if (depositQrcodeTimer) {
        clearTimeout(depositQrcodeTimer);
    }
    depositQrcodeTimer = setTimeout(() => {
        const json = {symbol: "zen", tAddr: toAddr, amount: amount};
        Qrcode.toDataURL(JSON.stringify(json), qrcodeOpts, (err, url) => {
            if (err)
                console.log(err);
            else
                depositQrcodeImage.src = url;
            depositQrcodeTimer = null;
        });
    }, qrcodeDelay);
}

function initWithdrawView() {
    withdrawFromAddrInput.addEventListener("input", validateWithdrawForm);
    withdrawToAddrInput.addEventListener("input", validateWithdrawForm);
    withdrawAmountInput.addEventListener("input", validateWithdrawForm);
    withdrawFeeInput.addEventListener("input", validateWithdrawForm);
    withdrawButton.addEventListener("click", () => {
        const msg = tr("wallet.tabWithdraw.withdrawConfirmQuestion", "Do you really want to send this transaction?");
        if (confirm(msg)) {
            ipcRenderer.send("send",
                withdrawFromAddrInput.value,
                withdrawToAddrInput.value,
                withdrawFeeInput.value,
                withdrawAmountInput.value);
        }
    });
    withdrawFromButton.addEventListener("click", () => showAddrSelectDialog(false, addr => {
        withdrawFromAddrInput.value = addr;
        validateWithdrawForm();
    }));
    withdrawToButton.addEventListener("click", () => showAddrSelectDialog(true, addr => {
        withdrawToAddrInput.value = addr;
        validateWithdrawForm();
    }));
    validateWithdrawForm();
}

function precisionRound(number, precision) {
    let factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

function validateWithdrawForm() {
    const fromAddr = withdrawFromAddrInput.value;
    const toAddr = withdrawToAddrInput.value;
    const amount = parseFloat(withdrawAmountInput.value || 0);
    const fee = parseFloat(withdrawFeeInput.value || 0);
    let precRoundDigit = 9;

    withdrawButton.disabled = true;
    setBalanceText(withdrawAvailBalance, 0);

    if (!fromAddr) {
        setNodeTrText(withdrawMsg, "wallet.tabWithdraw.messages.emptyFromAddr", "The from address is empty");
        return;
    }
    const [fromAddrObj] = getAddrData(fromAddr);
    if (!fromAddrObj) {
        setNodeTrText(withdrawMsg, "wallet.tabWithdraw.messages.unknownFromAddr", "The from address does not belong to this wallet");
        return;
    }
    setBalanceText(withdrawAvailBalance, fromAddrObj.lastbalance);

    if (!toAddr) {
        setNodeTrText(withdrawMsg, "wallet.tabWithdraw.messages.emptyToAddr", "The to address is empty");
        return;
    }
    if (amount <= 0) {
        setNodeTrText(withdrawMsg, "wallet.tabWithdraw.messages.zeroAmount", "The amount is not positive");
        return;
    }
    if (precisionRound(amount + fee, precRoundDigit) > precisionRound(fromAddrObj.lastbalance, precRoundDigit)) {
        setNodeTrText(withdrawMsg, "wallet.tabWithdraw.messages.insufficientFunds", "Insufficient funds on the from address");
        return;
    }

    withdrawMsg.textContent = "\xA0"; // &nbsp;
    withdrawButton.disabled = false;
}


function updateWithdrawalStatus(result, msg) {
    if (result === "error") {
        withdrawStatusTitleNode.classList.add("withdrawStatusBad");
        setNodeTrText(withdrawStatusTitleNode, "wallet.tabWithdraw.messages.error", "Error:");
    } else if (result === "ok") {
        withdrawStatusTitleNode.classList.remove("withdrawStatusBad");
        setNodeTrText(withdrawStatusTitleNode, "wallet.tabWithdraw.messages.success", "Transaction has been successfully sent");
    }
    withdrawStatusBodyNode.innerHTML = msg;
}

function showBatchWithdrawDialog() {
    showDialogFromTemplate("batchWithdrawDialogTemplate", dialog => {
        const bwSettings = deepClone(settings.batchWithdraw) || {
            fromAddrs: [],
            toAddr: "",
            keepAmount: 42,
            txFee: 0.0001,
        };
        const fromAddrsSet = new Set(bwSettings.fromAddrs);
        const listNode = dialog.querySelector(".addrSelectList");

        for (const addrObj of addrObjList) {
            if (addrObj.lastbalance === 0)
                continue;

            const row = cloneTemplate("addrMultiselectRowTemplate");
            row.dataset.addr = addrObj.addr;

            const selectCheckbox = row.querySelector(".addrSelectCheckbox");
            const nameNode = row.querySelector(".addrSelectRowName");
            const addrNode = row.querySelector(".addrSelectRowAddr");
            const balanceNode = row.querySelector(".addrSelectRowBalance");

            if (fromAddrsSet.has(addrObj.addr))
                selectCheckbox.checked = true;
            nameNode.textContent = addrObj.name;
            addrNode.textContent = addrObj.addr;
            setBalanceText(balanceNode, addrObj.lastbalance);

            listNode.appendChild(row)
        }

        const keepAmountInput = dialog.querySelector("#batchWithdrawKeepAmount");
        const txFeeInput = dialog.querySelector("#batchWithdrawFee");
        const toAddrSelectButton = dialog.querySelector("#batchWithdrawToAddrSelect");
        const toAddrInput = dialog.querySelector("#batchWithdrawToAddr");
        const withdrawButton = dialog.querySelector("#batchWithdrawButton");
        const selectAllButton = dialog.querySelector("#batchWithdrawSelectAll");
        const clearAllButton = dialog.querySelector("#batchWithdrawClearAll");

        setInputNodeValue(toAddrInput, bwSettings.toAddr);
        setInputNodeValue(keepAmountInput, bwSettings.keepAmount);
        setInputNodeValue(txFeeInput, bwSettings.txFee);
        toAddrSelectButton.addEventListener("click", () => showAddrSelectDialog(true, addr => {
            toAddrInput.value = addr;
            // TODO validate form
        }));

        withdrawButton.addEventListener("click", () => {
            bwSettings.fromAddrs = [];
            [... listNode.children].forEach(row => {
                if (row.querySelector(".addrSelectCheckbox").checked)
                    bwSettings.fromAddrs.push(row.dataset.addr);
            });
            bwSettings.toAddr = toAddrInput.value;
            bwSettings.keepAmount = keepAmountInput.value;
            bwSettings.txFee = txFeeInput.value;

            settings.batchWithdraw = bwSettings;
            saveModifiedSettings();

            warnTxSend(() => {
                const statusDialog = createDialogFromTemplate("txSendStatusDialogTemplate");
                const statusText = statusDialog.querySelector("#txStatusText");
                ipcRenderer.once("send-finish", (event, result, msg) => {
                    statusText.innerHTML = msg;
                });
                ipcRenderer.send("send-many", bwSettings.fromAddrs, bwSettings.toAddr, bwSettings.txFee, bwSettings.keepAmount);
                dialog.close();
                statusDialog.showModal();
            });
        });

        selectAllButton.addEventListener("click", () => {
            [... listNode.children].forEach(row => {
                row.querySelector(".addrSelectCheckbox").checked = true;
            });
        });
        clearAllButton.addEventListener("click", () => {
            [... listNode.children].forEach(row => {
                row.querySelector(".addrSelectCheckbox").checked = false;
            });
        });
    });
}

function initWallet() {
    fixPage();
    initDepositView();
    initWithdrawView();
    document.getElementById("actionShowZeroBalances").addEventListener("click", toggleZeroBalanceAddrs);
    document.getElementById("refreshButton").addEventListener("click", refresh);
    document.getElementById("createNewAddrButton").addEventListener("click", showNewAddrDialog);
    [...document.getElementsByClassName("amountInput")].forEach(node => {
        node.addEventListener("change", () => {
            node.value = parseFloat(node.value).toFixed(8);
        });
    });
    ipcRenderer.send("get-wallets");
}

function showChangeWalletPasswordDialog(currentPassword) {
    showDialogFromTemplate("changeWalletPasswordDialog", dialog => {
        console.log(currentPassword);
        const currentPasswordInput = dialog.querySelector(".currentPasswordText");
        const newPassword1Input = dialog.querySelector(".newPasswordText1");
        const newPassword2Input = dialog.querySelector(".newPasswordText2");
        const okButton = dialog.querySelector(".changePasswordOK");
        const cancelButton = dialog.querySelector(".changePasswordCancel");
        const errorsText = dialog.querySelector(".changeWalletPasswordErrors");

        cancelButton.addEventListener("click", () => dialog.close());

        okButton.addEventListener("click", () => {
            const typedCurrentPassword = currentPasswordInput.value;
            const newPassword1 = newPassword1Input.value;
            const newPassword2 = newPassword2Input.value;

            if (currentPassword !== typedCurrentPassword) {
                errorsText.textContent = tr("wallet.changePassword.error.wrongCurrentPassword", "Wrong current password");
                return;
            }

            if (newPassword1 !== newPassword2) {
                errorsText.textContent = tr("wallet.changePassword.error.newPasswordBadRetype", "New passwords do not match");
                return;
            }

            if (newPassword1 === "") {
                errorsText.textContent = tr("wallet.changePassword.error.emptyNewPassword", "New password cannot be empty");
                return;
            }

            ipcRenderer.send("change-wallet-password-continue", newPassword1);
            dialog.close();
        });
    });
}

function showPasswordChangeNotice(result) {
    if (result.success)
        alert(tr("wallet.changePassword.noticeSuccess", "Wallet password successfully changed"));
    else
        alert(tr("wallet.changePassword.noticeError", "Failed to change wallet password"));
}
