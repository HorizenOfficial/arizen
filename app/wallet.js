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
        getWallets();
    } else {
        document.getElementById("hideZeroBalancesButton").textContent = "Hide Zero Balances";
        document.getElementById("hideZeroBalancesButton").classList.remove("balancesButtonShow");
        document.getElementById("hideZeroBalancesButton").classList.add("balancesButtonHide");
        getWallets();
    }
}

function send() {
    return 0;
}

function addWalletDialog() {
    document.getElementById("darkContainer").style.transition = "0.5s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
    document.getElementById("addWalletDialog").style.zIndex = "2";
    document.getElementById("addWalletDialog").style.opacity = "1";
}

function pickWalletDialog() {
    document.getElementById("darkContainer").style.transition = "0.5s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
    document.getElementById("pickWalletDialog").style.zIndex = "2";
    document.getElementById("pickWalletDialog").style.opacity = "1";
}

function getNonZeroBalance(walletList) {
    let non_zero = [];
    for (let i = 0; i < walletList.wallets.length; i++) {
        if (walletList.wallets[i][3] > 0) {
            non_zero.push(walletList.wallets[i]);
        }
    }
    non_zero.sort(function (a, b) {
        return b[3] - a[3];
    });
    return non_zero;
}

function getZeroBalance(walletList) {
    console.log(walletList);
    let zero = [];
    for (let i = walletList.wallets.length - 1; i >= 0; i--) {
        if (walletList.wallets[i][3] === 0) {
            zero.push(walletList.wallets[i]);
        }
    }
    return zero;
}

function walletDetailsDialog(id) {
    document.getElementById("darkContainer").style.transition = "0.5s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
    document.getElementById("walletDetailsDialog").style.zIndex = "2";
    document.getElementById("walletDetailsDialog").style.opacity = "1";
    document.getElementById("walletDetailsDialogContent").innerHTML = "";
    /*let walletList = JSON.parse(walletListStr.replace(/'/g,/"/));
    let j = 1;
    for (let i = walletList.length; i >= 0; i--) {
        if (walletList[i].id === id) {
            document.getElementById("walletDetailsDialogContent").innerHTML += printWallet(j, walletList[i].address, walletList[i].balance,"", false);
            j++;
        }
    }*/
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
        walletAddress = "<span class=\"walletListItemAddress\"><b>Actual address </b> " + wAddress + "</span><a href=\"javascript:void(0)\" class=\"walletListItemDetails\" onclick=\"walletDetailsDialog(" + wId + ")\">Details</a>";
    }
    return walletClass + walletTitle + walletBalance + walletAddress + walletEnd;
}

function isUnique(walletId, ids) {
    for (let i = 0; i < ids.length; i++) {
        if (ids[i] === walletId) {
            return false;
        }
    }
    return true;
}

function printWalletList(non_zero, zero, elem, verbose = true) {
    let walletElem = document.getElementById(elem);
    let hide_balances = document.getElementById("hideZeroBalancesButton");
    let ids = [];
    walletElem.innerHTML = "";
    for (let i = 0; i < non_zero.length; i++) {

        if (isUnique(non_zero[i][2], ids)) {
            walletElem.innerHTML += printWallet(i, non_zero[i][4], non_zero[i][3], non_zero[i][2], verbose);
            ids.push(non_zero[i][2]);
        }
    }
    if ((elem === "walletList") && (hide_balances.textContent === "Show Zero Balances")) {
        return;
    }
    for (let i = 0; i < zero.length; i++) {
        if (isUnique(zero[i][2], ids)) {
            walletElem.innerHTML += printWallet(i, zero[i][4], zero[i][3], zero[i][2], verbose);
            ids.push(zero[i][2]);
        }
    }
}


function renderWallet(walletList, wNames) {
    /*printWalletList(walletList, wNames, "pickWalletDialogContent", false);
    printWalletList(walletList, wNames, "walletList", true);
    printWalletList(walletList, wNames, "walletListReceive", true);*/
}


function getWallets() {
    ipcRenderer.send("get-wallets");
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

getWallets();
