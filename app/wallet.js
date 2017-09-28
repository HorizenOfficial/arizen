// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

function setButtonActive(className) {
    document.getElementById(className).style.backgroundColor = "transparent";
    document.getElementById(className).style.border = "1px #f88900 solid";
    document.getElementById(className).style.color = "#f88900";
}

function setButtonInactive(className) {
    document.getElementById(className).style.backgroundColor = "#f88900";
    document.getElementById(className).style.border = "1px #f88900 solid";
    document.getElementById(className).style.color = "#fefefe";
}

function showSend() {
    document.getElementById("receive").style.display = "none";
    document.getElementById("mywallet").style.display = "none";
    document.getElementById("send").style.display = "block";
    setButtonActive("sendButtonMenu");
    setButtonInactive("receiveButtonMenu");
    setButtonInactive("myWalletButtonMenu");
}

function showReceive() {
    document.getElementById("send").style.display = "none";
    document.getElementById("mywallet").style.display = "none";
    document.getElementById("receive").style.display = "block";
    setButtonActive("receiveButtonMenu");
    setButtonInactive("sendButtonMenu");
    setButtonInactive("myWalletButtonMenu");
}

function showWallet() {
    document.getElementById("send").style.display = "none";
    document.getElementById("mywallet").style.display = "block";
    document.getElementById("receive").style.display = "none";
    setButtonActive("myWalletButtonMenu");
    setButtonInactive("sendButtonMenu");
    setButtonInactive("receiveButtonMenu");
}

function changeAmount() {
    let number = document.getElementById("coinAmount").value;
    /* Input value is Not A Number*/
    if (Number.isNaN(Number(number))) {
        document.getElementById("coinAmount").value = Number(0).toFixed(8);
        return;
    }
    /* Number has to be greater or equal to zero */
    if (number < 0) {
        document.getElementById("coinAmount").value = Number(0).toFixed(8);
        return;
    }
    console.log(number);
    document.getElementById("coinAmount").value = Number(number).toFixed(8);
}

function clearValue() {
    if (document.getElementById("sendToAddress").value === "address") {
        document.getElementById("sendToAddress").value = "";
    }
}

function setValueIfEmpty() {
    if (document.getElementById("sendToAddress").value === "") {
        document.getElementById("sendToAddress").value = "address";
    }
}

function hideBalances() {
    if (document.getElementById("hideZeroBalancesButton").textContent === "Hide Zero Balances") {
        document.getElementById("hideZeroBalancesButton").textContent = "Show Zero Balances";
        document.getElementById("hideZeroBalancesButton").classList.remove("balancesButtonHide");
        document.getElementById("hideZeroBalancesButton").classList.add("balancesButtonShow");
    } else {
        document.getElementById("hideZeroBalancesButton").textContent = "Hide Zero Balances";
        document.getElementById("hideZeroBalancesButton").classList.remove("balancesButtonShow");
        document.getElementById("hideZeroBalancesButton").classList.add("balancesButtonHide");
    }
    getWallets();
}

function send() {
    return 0;
}

function showDarkContainer() {
    document.getElementById("darkContainer").style.transition = "0.5s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
}

function addWalletDialog() {
    showDarkContainer();
    document.getElementById("addWalletDialog").style.zIndex = "2";
    document.getElementById("addWalletDialog").style.opacity = "1";
}

function pickWalletDialog() {
    showDarkContainer();
    document.getElementById("pickWalletDialog").style.zIndex = "2";
    document.getElementById("pickWalletDialog").style.opacity = "1";
}

function checkZeroList(walletList, zero=true) {
    let list = [];
    for (let i = 0; i < walletList.wallets.length; i++) {
        if ((zero) && (walletList.wallets[i][3] === 0)) {
            list.push(walletList.wallets[i]);
        }
        if ((!zero) && (walletList.wallets[i][3] > 0)) {
            list.push(walletList.wallets[i]);
        }
    }
    return list;
}

function getNonZeroBalance(walletList) {
    let non_zero = [];
    non_zero = checkZeroList(walletList,false);
    non_zero.sort(function (a, b) {
        return b[3] - a[3];
    });
    return non_zero;
}

function getZeroBalance(walletList) {
    console.log(walletList);
    let zero = [];
    zero = checkZeroList(walletList,true);
    return zero;
}

function walletDetailsDialog(id) {
    showDarkContainer();
    document.getElementById("walletDetailsDialog").style.zIndex = "2";
    document.getElementById("walletDetailsDialog").style.opacity = "1";
    document.getElementById("walletDetailsDialogContent").innerHTML = "";
}


function closeDialog(clasname) {
    document.getElementById("darkContainer").style.transition = "0s";
    document.getElementById("darkContainer").style.opacity = "0";
    document.getElementById("darkContainer").style.zIndex = "-1";
    document.getElementById(clasname).style.zIndex = "-1";
    document.getElementById(clasname).style.opacity = "0";
}

function printWallet(wId, wName, wBalance, wAddress, verbose = true) {
    let walletClass = "";
    let walletTitle = "";
    let walletBalance;
    let walletAddress = "";
    let walletEnd = "</div>";
    if (wName === "Messenger Wallet") {
        walletClass = "<div class=\"walletListItem walletListItemChat\">";
        walletTitle = "<span class=\"walletListItemTitleChat\">Messenger Wallet</span>";
    } else {
        if ((wId % 2) === 0) {
            walletClass = "<div class=\"walletListItem walletListItemOdd\">";
        } else {
            walletClass = "<div class=\"walletListItem\">";
        }
        walletTitle = "<span class=\"walletListItemAddress walletListItemTitle\">" + wName + "</span>";
    }
    walletBalance = "<span id=\"balance_" + wAddress + "\" class=\"walletListItemAddress walletListItemBalance\">" + wBalance + "</span> ZEN";
    if (verbose) {
        walletAddress = "<span class=\"walletListItemAddress\"><b>Address </b> " + wAddress + "</span><a href=\"javascript:void(0)\" class=\"walletListItemDetails\" onclick=\"walletDetailsDialog(" + wId + ")\">Details</a>";
    }
    return walletClass + walletTitle + walletBalance + walletAddress + walletEnd;
}

function isMyAddress(address, wallets) {
    // true/false
}

function getObjectFromTransaction(transaction) {
    // convert transaction into address/amount list. the first item is vin address.
}

function getAmountForAddress(transaction, address) {
    // get amount based on address
}

function printTransaction(transaction, wallets) {
    let transactionClass = "";
    let transactionAmount = "";
    let transactionAddressFrom = "";
    let transactionAddressTo = "";
    let transactionEnd = "</div>";
    let income = false;
    if (income) {
        transactionClass = "<div class\"transactionListItem transactionIn\">";
        transactionAddressFrom = transaction.vin.address;
        transactionAddressTo = transaction.vout.addresses;
        //transactionAmount = transaction.vout.
    } else {
        transactionClass = "<div class\"transactionListItem transactionOut\">";
        transactionAddressTo = transaction.vin.address;
        transactionAddressFrom = transaction.vout.addresses.toString();
    }

    return transactionClass + transactionAddressFrom + transactionAddressTo + transactionEnd;
}

function isUnique(walletId, ids) {
    for (let i = 0; i < ids.length; i++) {
        if (ids[i] === walletId) {
            return false;
        }
    }
    return true;
}

function printList(list, elem, ids, verbose) {
    let walletElem = document.getElementById(elem);
    for (let i = 0; i < list.length; i++) {

        if (isUnique(list[i][2], ids)) {
            walletElem.innerHTML += printWallet(i, list[i][4], list[i][3], list[i][2], verbose);
            ids.push(list[i][2]);
        }
    }
    return ids;
}

function printWalletList(non_zero, zero, elem, verbose = true) {
    let walletElem = document.getElementById(elem);
    walletElem.innerHTML = "";
    let hide_balances = document.getElementById("hideZeroBalancesButton");
    let ids = [];
    ids = printList(non_zero, elem, ids, verbose);
    if ((elem === "walletList") && (hide_balances.textContent === "Show Zero Balances")) {
        return;
    }
    printList(zero, elem, ids, verbose);
}

function renderWallet() {
    getWallets();
}

function getWallets() {
    ipcRenderer.send("get-wallets");
}

function getWalletWithName(name) {
    ipcRenderer.send("get-wallet-by-name", name);
}

/* FIXME: @nonghost name usage */
function addressNameTest() {
    ipcRenderer.send("rename-wallet", "znc4M7DLcwShfoQuF18YB55QwphLhCVKeoi", "nove jmeno");
}

ipcRenderer.on("get-wallets-response", function (event, resp) {
    let data = JSON.parse(resp);
    let non_zero = getNonZeroBalance(data);
    let zero = getZeroBalance(data);

    showWallet();
    printWalletList(non_zero, zero, "pickWalletDialogContent", false);
    printWalletList(non_zero, zero, "walletList");
    printWalletList(non_zero, zero, "walletListReceive");
    document.getElementById("walletFooterBalance").innerHTML = data.total;
});

ipcRenderer.on("update-wallet-balance", function (event, resp) {
    let data = JSON.parse(resp);

    /* FIXME @nonghost wallet balance has no ID */
    console.log("wallet: " + data.wallet + "balance updated to " + data.balance);
});

ipcRenderer.on("rename-wallet-response", function (event, resp) {
    let data = JSON.parse(resp);

    /* FIXME: @nonghost name response OK/ERR */
    console.log(data.msg);
});

ipcRenderer.on("get-wallet-by-name-response", function (event, resp) {
    let data = JSON.parse(resp);

    /* FIXME: @nonghost if response=OK data.wallets else data.msg */
    console.log(data.msg);
});

/* FIXME: @nonghost transaction info usage */
function testTransaction() {
    ipcRenderer.send("get-transaction", "3098e8b87b1a54a5d3e60b60e2c888547f17cb8e8504b1e70d6b6aca882b7413", "znYBWsMPdeUJfwbKbMdXNPVD9THysCgzFhu");
}

ipcRenderer.on("get-transaction-response", function (event, resp) {
    let data = JSON.parse(resp);

    /* FIXME: @nonghost response OK/ERR */
    console.log(data.msg);
});

ipcRenderer.on("get-transaction-update", function (event, address, resp) {
    let data = JSON.parse(resp);

    /* FIXME: @nonghost response from api */
    let amount = (data.vout[0].scriptPubKey.addresses[0] === address) ? data.vout[0].value : data.vout[1].value;
    console.log("transaction from: " + data.vin[0].addr + " amount: " + amount + " fee: " + data.fees);
});

function generateNewWallet() {
    ipcRenderer.send("generate-wallet");
}

ipcRenderer.on("generate-wallet-response", function (event, resp) {
    let data = JSON.parse(resp);

    /* FIXME: @nonghost response OK/ERR, msg new address if OK */
    console.log(data.msg);
});
