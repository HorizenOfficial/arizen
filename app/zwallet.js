'use strict';
// @flow
/*jshint esversion: 6 */
/*jslint node: true */

const electron = require("electron");
const {ipcRenderer} = electron;
const {List} = require('immutable');
const {DateTime} = require('luxon');
const QRCode = require('qrcode');

function logIpc(msgType) {
    ipcRenderer.on(msgType, (...args) => {
        console.log(`IPC Message: ${msgType}, Args:`);
        for (let i = 0; i < args.length; i++)
            console.log(args[i]);
    });
}
// sed -r -n '/\.send/{s/.*send\("([^"]+)".*/logIpc("\1");/p}' main.js|sort -u
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

const addrListNode = document.getElementById('addrList');
const txListNode = document.getElementById('txList');
const totalBalanceNode = document.getElementById('totalBalance');
const showZeroBalancesButton = document.getElementById('actionShowZeroBalances');

const refreshTimeout = 30;
let showZeroBalances = false;
const knownTxIds = new Set();

showZeroBalancesButton.addEventListener('click', toggleZeroBalanceAddrs);

ipcRenderer.on('get-wallets-response', (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
    clearChildNodes(addrListNode);
    clearChildNodes(txListNode);
    msg.wallets.forEach(addAddress); // TODO sort like txs
    addTransactions(msg.transactions);
    setTotalBalance(msg.total);
    scheduleRefresh();
});

ipcRenderer.on('update-wallet-balance', (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
    setAddressBalance(msg.wallet, msg.balance);
    setTotalBalance(msg.total);
});

ipcRenderer.on('get-transaction-update', (event, msgStr) => {
    const txObj = JSON.parse(msgStr);
    txObj.amount = parseFloat(txObj.amount);
    addTransactions([txObj]);
});

ipcRenderer.on('refresh-wallet-response', (event, msgStr) => {
    const msg = JSON.parse(msgStr);
    checkResponse(msg);
    scheduleRefresh();
});

window.addEventListener('load', initWalletView);


// FUNCTIONS

function formatBalance(balance) {
    return balance.toFixed(8);
}

function checkResponse(resp) {
    if (resp.response != 'OK') {
        console.error(resp);
        throw new Error('Failed response');
    }
}

function hideElement(node, yes) {
    if (yes)
        node.classList.add('hidden')
    else
        node.classList.remove('hidden')
}

function clearChildNodes(parent) {
    parent.childNodes.forEach(p => parent.removeChild(p));
}

function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

// Expects a balance node with one balanceAmount child node
function setBalanceText(balanceNode, balance) {
    const balanceAmountNode = balanceNode.firstElementChild;
    balanceAmountNode.textContent = formatBalance(balance);
    if (balance > 0)
        balanceNode.classList.add('addrBalancePositive');
    else
        balanceNode.classList.remove('addrBalancePositive');
}

function createAddrItem(addrObj) {
    const addrItem = cloneTemplate('addrItemTemplate');
    addrItem.dataset.addr = addrObj.addr;
    setAddrItemBalance(addrItem, addrObj.lastbalance);
    if (addrObj.name)
        addrItem.getElementsByClassName('addrName')[0].textContent = addrObj.name;
    addrItem.getElementsByClassName('addrText')[0].textContent = addrObj.addr;
    return addrItem;
}

function setAddrItemBalance(addrItem, balance) {
    addrItem.dataset.balance = balance;
    hideElement(addrItem, balance == 0 && !showZeroBalances);
    const balanceNode = addrItem.getElementsByClassName('addrBalance')[0];
    setBalanceText(balanceNode, balance);
}

function shortTxId(txId) {
    const edgeLen = 8
    return txId.substring(0, edgeLen) + '...' + txId.substring(txId.length - edgeLen);
}
function createTxItem(txObj) {
    const node = cloneTemplate('txItemTemplate');
    node.querySelector('.txDate').textContent =
        DateTime.fromMillis(txObj.time * 1000).toLocaleString(DateTime.DATETIME_MED);
    node.querySelector('.txBlock').textContent = txObj.block;
    node.querySelector('.txBalanceAmount').textContent = formatBalance(txObj.amount);
    node.querySelector('.txId').textContent = shortTxId(txObj.txid);
    node.querySelector('.txBalance').classList.add(txObj.amount > 0 ? 'txBalancePositive' : 'txBalanceNegative');
    return node;
}

function addAddress(addrObj) {
    const addrItem = createAddrItem(addrObj);
    hideElement(addrItem, addrObj.lastbalance == 0 && !showZeroBalances);
    addrListNode.appendChild(addrItem);
}

function setAddressBalance(addr, balance) {
    const addrItem = addrListNode.querySelector(`[data-addr="${addr}"]`);
    setAddrItemBalance(addrItem, balance);
}

function addTransactions(txs) {
    txListNode.prepend(...List(txs)
        .sortBy(tx => -tx.block)
        .toArray()
        .map(createTxItem));
}

function setTotalBalance(balance) {
    setBalanceText(totalBalanceNode, balance);
}

function toggleZeroBalanceAddrs() {
    showZeroBalances = !showZeroBalances;
    [...addrListNode.querySelectorAll('[data-balance="0"]')]
        .forEach(node => hideElement(node, !showZeroBalances));
}

function scheduleRefresh() {
    setTimeout(() => ipcRenderer.send('refresh-wallet'), refreshTimeout * 1000);
}

function initWalletView() {
    ipcRenderer.send('get-wallets');  
}