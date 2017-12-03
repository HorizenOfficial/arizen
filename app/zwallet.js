// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {ipcRenderer} = require("electron");
// FIXME: unused List
const {List} = require("immutable");
const {DateTime} = require("luxon");
const Qrcode = require("qrcode");

function logIpc(msgType) {
    ipcRenderer.on(msgType, (...args) => {
        console.log(`IPC Message: ${msgType}, Args:`);
        for (let i = 0; i < args.length; i++)
            console.log(args[i]);
    });
}

// sed -r -n "/\.send/{s/.*send\("([^"]+)".*/logIpc("\1");/p}" main.js|sort -u
logIpc("call-get-wallets");
logIpc("check-login-response");
logIpc("generate-wallet-response");
logIpc("get-settings-response");
logIpc("get-transaction-update");
logIpc("get-wallet-by-name-response");
//logIpc("get-wallets-response");
logIpc("refresh-wallet-response");
logIpc("rename-wallet-response");
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
const depositTabButton = document.getElementById("depositTabButton");
const depositToAddrInput = document.getElementById("depositToAddr");
const depositAmountInput = document.getElementById("depositAmount");
const depositMsg = document.getElementById("depositMsg");
const depositQrcodeImage = document.getElementById("depositQrcodeImg");
const withdrawTabButton = document.getElementById("withdrawTabButton");
// FIXME: withdrawAvailBalanceNode unused
const withdrawAvailBalanceNode = document.getElementById("withdrawAvailBalance");
const withdrawFromAddrInput = document.getElementById("withdrawFromAddr");
const withdrawToAddrInput = document.getElementById("withdrawToAddr");
const withdrawAmountInput = document.getElementById("withdrawAmount");
const withdrawFeeInput = document.getElementById("withdrawFee");
const withdrawMsg = document.getElementById("withdrawMsg");
const withdrawButton = document.getElementById("withdrawButton");
const withdrawStatusTitleNode = document.getElementById("withdrawStatusTitle");
const withdrawStatusBodyNode = document.getElementById("withdrawStatusBody");

const refreshTimeout = 300;
let refreshTimer;
let showZeroBalances = false;
let depositQrcodeTimer;
const myAddrs = new Set();

// ---------------------------------------------------------------------------------------------------------------------
// IPC
ipcRenderer.on("get-wallets-response", (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
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
    setAddressBalance(msg.wallet, msg.balance);
    setTotalBalance(msg.total);
});

ipcRenderer.on("get-transaction-update", (event, msgStr) => {
    const txObj = JSON.parse(msgStr);
    txObj.amount = parseFloat(txObj.amount);
    addTransactions([txObj], true);
});

ipcRenderer.on("refresh-wallet-response", (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
    scheduleRefresh();
});

ipcRenderer.on("send-finish", (event, result, msg) =>
    updateWithdrawalStatus(result, msg));

window.addEventListener("load", initWallet);

// FUNCTIONS
function checkResponse(resp) {
    if (resp.response !== "OK") {
        console.error(resp);
        throw new Error("Failed response");
    }
}

// Expects a balance node with one balanceAmount child node
function setBalanceText(balanceNode, balance) {
    const balanceAmountNode = balanceNode.firstElementChild;
    balanceAmountNode.textContent = formatBalance(balance);
    if (balance > 0)
        balanceNode.classList.add("addrBalancePositive");
    else
        balanceNode.classList.remove("addrBalancePositive");
}

function createAddrItem(addrObj) {
    const addrItem = cloneTemplate("addrItemTemplate");

    addrItem.dataset.addr = addrObj.addr;
    addrItem.dataset.name = addrObj.name || '';

    if (addrObj.name) {
        addrItem.getElementsByClassName("addrName")[0].textContent = addrObj.name;
    }
    addrItem.getElementsByClassName("addrText")[0].textContent = addrObj.addr;
    addrItem.getElementsByClassName("addrInfoLink")[0]
        .addEventListener("click", () => openZenExplorer("address/" + addrObj.addr));
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

function shortTxId(txId) {
    const edgeLen = 8;
    return txId.substring(0, edgeLen) + "..." + txId.substring(txId.length - edgeLen);
}

function createTxItem(txObj, newTx = false) {
    const node = txObj.block >= 0 ? cloneTemplate("txItemTemplate") : cloneTemplate("txMempoolItemTemplate");

    node.dataset.txid = txObj.txid;
    node.dataset.blockheight = txObj.block;

    if (txObj.block >= 0) {
        node.querySelector(".txDate").textContent = DateTime.fromMillis(txObj.time * 1000).toLocaleString(DateTime.DATETIME_MED);
    }

    let balanceStr, balanceClass;
    if (txObj.amount >= 0) {
        balanceStr = "+" + formatBalance(txObj.amount);
        balanceClass = "txBalancePositive";
    } else {
        balanceStr = "-" + formatBalance(-txObj.amount);
        balanceClass = "txBalanceNegative";
    }
    node.querySelector(".txBalance").classList.add(balanceClass);
    node.querySelector(".txBalanceAmount").textContent = balanceStr;

    if (newTx) {
        node.classList.add("txItemNew");
    }

    return node;
}

function addAddresses(addrs) {
    addrs.forEach(addrObj => {
        myAddrs.add(addrObj.addr);
        const addrItem = createAddrItem(addrObj);
        hideElement(addrItem, addrObj.lastbalance === 0 && !showZeroBalances);
        addrListNode.appendChild(addrItem);
    });
    sortAddrItems();
}

function sortAddrItems() {
    const sortedAddrItems = [...addrListNode.childNodes].sort((a, b) => {
        const balA = parseFloat(a.dataset.balance);
        const balB = parseFloat(b.dataset.balance);
        if (balA === balB) {
            const nameA = a.dataset.name || '';
            const nameB = b.dataset.name || '';
            return nameA.localeCompare(nameB);
        }
        return balB - balA;
    });
    const newAddrListNode = addrListNode.cloneNode(false);
    newAddrListNode.append(...sortedAddrItems);
    addrListNode.parentNode.replaceChild(newAddrListNode, addrListNode);
    addrListNode = newAddrListNode;
}

function setAddressBalance(addr, balance) {
    const addrItem = addrListNode.querySelector(`[data-addr='${addr}']`);
    setAddrItemBalance(addrItem, balance);
    sortAddrItems();
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
                console.error("Attempting to replace transaction in block");
            } else if (txObj.block >= 0) {
                txListNode.replaceChild(createTxItem(txObj, newTx), oldTxItem);
            }
        } else {
            txListNode.prepend(createTxItem(txObj, newTx));
        }
    }
}

function setTotalBalance(balance) {
    setBalanceText(totalBalanceNode, balance);
}

function toggleZeroBalanceAddrs() {
    showZeroBalances = !showZeroBalances;
    [...addrListNode.querySelectorAll("[data-balance='0']")]
        .forEach(node => hideElement(node, !showZeroBalances));
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

function initDepositView() {
    const qrcodeTypeDelay = 500; // ms
    depositToAddrInput.addEventListener("input", () => updateDepositQrcode(qrcodeTypeDelay));
    depositAmountInput.addEventListener("input", () => updateDepositQrcode(qrcodeTypeDelay));
}

function updateDepositQrcode(qrcodeDelay = 0) {
    const qrcodeOpts = {
        errorCorrectionLevel: "H",
        scale: 5,
        color: {dark: "#000000ff", light: "#fefefeff"}
    };

    const toAddr = depositToAddrInput.value;
    const amount = parseFloat(depositAmountInput.value || 0);

    if (!toAddr) {
        depositMsg.textContent = "WARNING: To address is empty";
    } else if (!addrListNode.querySelector(`[data-addr='${toAddr}']`)) {
        depositMsg.textContent = "WARNING: To address does not belong to this wallet";
    } else if (!amount) {
        depositMsg.textContent = "WARNING: Amount is not positive";
    } else {
        depositMsg.textContent = "\xA0"; // &nbsp;
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
        if (confirm("Do you really want to send this transaction?")) {
            ipcRenderer.send("send",
                withdrawFromAddrInput.value,
                withdrawToAddrInput.value,
                withdrawFeeInput.value,
                withdrawAmountInput.value);
        }
    });
    validateWithdrawForm();
}

function validateWithdrawForm() {
    const fromAddr = withdrawFromAddrInput.value;
    const toAddr = withdrawToAddrInput.value;
    const amount = parseFloat(withdrawAmountInput.value || 0);
    const fee = parseFloat(withdrawFeeInput.value || 0);

    withdrawButton.disabled = true;
    withdrawAvailBalance.textContent = 0;

    if (!fromAddr) {
        withdrawMsg.textContent = "ERROR: The From address is empty";
        return;
    }

    const fromAddrItem = addrListNode.querySelector(`[data-addr='${fromAddr}']`);
    if (!fromAddrItem) {
        withdrawMsg.textContent = "ERROR: The From address does not belong to this wallet";
        return;
    }

    const fromBalance = parseFloat(fromAddrItem.dataset.balance);
    withdrawAvailBalance.textContent = fromBalance;

    if (!toAddr) {
        withdrawMsg.textContent = "ERROR: The To address is empty";
        return;
    }
    if (!amount) {
        withdrawMsg.textContent = "ERROR: The amount is not positive";
        return;
    }
    if (amount + fee > fromBalance) {
        withdrawMsg.textContent = "ERROR: Insufficient funds on the From address";
        return;
    }

    withdrawMsg.textContent = "\xA0"; // &nbsp;
    withdrawButton.disabled = false;
}

function updateWithdrawalStatus(result, msg) {
    if (result === "error") {
        withdrawStatusTitleNode.classList.add("withdrawStatusBad");
        withdrawStatusTitleNode.textContent = "Error:"
    } else if (result === "ok") {
        withdrawStatusTitleNode.classList.remove("withdrawStatusBad");
        withdrawStatusTitleNode.textContent = "Transaction has been successfully sent";
    }
    withdrawStatusBodyNode.innerHTML = msg;
}

function initWallet() {
    fixLinks();
    initDepositView();
    initWithdrawView();
    document.getElementById("actionShowZeroBalances").addEventListener("click", toggleZeroBalanceAddrs);
    document.getElementById("refreshButton").addEventListener("click", refresh);
    [...document.getElementsByClassName("amountInput")].forEach(node => {
        node.addEventListener("change", () => {
            node.value = parseFloat(node.value).toFixed(8);
        });
    });
    ipcRenderer.send("get-wallets");
}
