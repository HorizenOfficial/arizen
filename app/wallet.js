// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

document.addEventListener("keydown", escKeyDown, false);

function escKeyDown(e) {
    let keyCode = e.keyCode;
    if(keyCode===27) {
        closeAllWalletsDialogs();
    }
}


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

function changeAmount(elem) {
    let number = document.getElementById(elem).value;
    // Input value is Not A Number
    if (Number.isNaN(Number(number))) {
        document.getElementById(elem).value = Number(0).toFixed(8);
        return;
    }
    // Number has to be greater or equal to zero
    if (number < 0) {
        document.getElementById(elem).value = Number(0).toFixed(8);
        return;
    }
    document.getElementById(elem).value = Number(number).toFixed(8);
}

function generateQR() {
    // TODO: generate QR code with info from receiveAddressText and receiveCoinAmount
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
        for (let i = 0, j = 1; i < document.getElementById("walletList").childElementCount; i += 1) {
            if (document.getElementById("walletList").childNodes[i].childNodes[1].innerText === "0.00000000") {
                document.getElementById("walletList").childNodes[i].classList.add("walletListItemZero");
            } else {
                document.getElementById("walletList").childNodes[i].classList.remove("walletListItemOdd");
                if (j === 2) {
                    j = 0;
                    document.getElementById("walletList").childNodes[i].classList.add("walletListItemOdd");
                }
                j++;
            }
        }
        document.getElementById("hideZeroBalancesButton").textContent = "Show Zero Balances";
        document.getElementById("hideZeroBalancesButton").classList.remove("balancesButtonHide");
        document.getElementById("hideZeroBalancesButton").classList.add("balancesButtonShow");
    } else {
        for (let i = 0; i < document.getElementById("walletList").childElementCount; i += 1) {
            document.getElementById("walletList").childNodes[i].classList.remove("walletListItemZero");
            document.getElementById("walletList").childNodes[i].classList.remove("walletListItemOdd");
            if (i % 2 === 0) document.getElementById("walletList").childNodes[i].classList.add("walletListItemOdd");
        }
        document.getElementById("hideZeroBalancesButton").textContent = "Hide Zero Balances";
        document.getElementById("hideZeroBalancesButton").classList.remove("balancesButtonShow");
        document.getElementById("hideZeroBalancesButton").classList.add("balancesButtonHide");
    }
}

function send() {
    ipcRenderer.send("send",
        document.getElementById("sendFromAddressText").textContent,
        document.getElementById("sendToAddress").value,
        document.getElementById("coinFee").value,
        document.getElementById("coinAmount").value);
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

function pickWalletDialog(elem) {
    showDarkContainer();
    document.getElementById("pickWalletDialog").style.zIndex = "2";
    document.getElementById("pickWalletDialog").style.opacity = "1";
    document.getElementById("pickWalletDialogElem").innerHTML = elem;
}

function renameWallet() {
    let wName = document.getElementById("walletName").value;
    let wAddress = document.getElementById("walletAddress").innerHTML;
    ipcRenderer.send("rename-wallet", wAddress, wName);
}

function walletDetailsDialog(address, balance) {
    showDarkContainer();
    document.getElementById("walletDetailsDialog").style.zIndex = "2";
    document.getElementById("walletDetailsDialog").style.opacity = "1";
    document.getElementById("walletDetailsDialogContent").innerHTML = "";
    let name = document.getElementById("listName_" + address).innerText;
    if (name !== "") {
        document.getElementById("walletDetailsDialogContent").innerHTML += "<label class=\"walletDetailsItemLabel\" for=\"walletName\">Name: </label> <div class=\"right\"><input id=\"walletName\" class=\"wallet_inputs\" align=\"right\" value=\""+ name +"\"></div>";
    } else {
        document.getElementById("walletDetailsDialogContent").innerHTML += "<label class=\"walletDetailsItemLabel\" for=\"walletName\">Name: </label> <div class=\"right\"><input id=\"walletName\" class=\"wallet_inputs\" align=\"right\" value=\"Not defined\"></div>";
    }
    document.getElementById("walletDetailsDialogContent").innerHTML += "<div class=\"walletDetailsItemLabel\">Address:</div> <div class=\"right\"> <div id=\"walletAddress\" class=\"walletDetailsItem\">"+address+"</div></div>";
    document.getElementById("walletDetailsDialogContent").innerHTML += "<div class=\"walletDetailsItemLabel\">Balance:</div> <div class=\"right\"> <div class=\"walletDetailsItem walletDetailsItemBalance\">"+Number(balance).toFixed(8)+"</div></div>";
    document.getElementById("walletDetailsDialogContent").innerHTML += "<button class=\"buttons walletDetailsRenameButton\" onclick=\"renameWallet()\">Rename wallet</button>";
}

function closeAllWalletsDialogs() {
    closeDialog("settingsDialog");
    closeDialog("aboutDialog");
    closeDialog("transactionDetailsDialog");
    closeDialog("walletDetailsDialog");
    closeDialog("addWalletDialog");
    closeDialog("pickWalletDialog");
    closeNav();
}

function closeDialog(clasname) {
    closeDarkContainer();
    document.getElementById(clasname).style.zIndex = "-1";
    document.getElementById(clasname).style.opacity = "0";
}

function renderWallet() {
    ipcRenderer.send("get-wallets");
}

function refreshWallet() {
    ipcRenderer.send("refresh-wallet");
}

/* NOT FOR BETA VERSION
function getWalletWithName(name) {
    ipcRenderer.send("get-wallet-by-name", name);
}*/

function pickWallet(address) {
    let elem = document.getElementById("pickWalletDialogElem").innerHTML;
    document.getElementById(elem + "Text").innerHTML = address;
    closeDialog("pickWalletDialog");
}

function generateNewWallet() {
    ipcRenderer.send("generate-wallet", document.getElementById("newWalletName").value);
}

ipcRenderer.on("get-wallets-response", function (event, resp) {
    let data = JSON.parse(resp);
    let wId;
    let wAddress;
    let wBalance;
    let wName;
    let walletClass = "";
    let walletName = "";
    let walletTitle = "";
    let walletBalance;
    let walletAddress = "";

    showWallet();
    document.getElementById("walletList").innerHTML = "";
    for (let i = 0, j = 1; i < data.wallets.length; i += 1) {
        wAddress = data.wallets[i][2];
        wBalance = data.wallets[i][3];
        wName = data.wallets[i][4];
        let walletPick = "";

        walletClass = "<div name=\"block_" + wAddress + "\" class=\"walletListItem";
        if (wBalance === 0) {
            walletClass += " walletListItemZero";
        } else {
            if (j === 2) {
                j = 0;
                walletClass += " walletListItemOdd";
            }
            j++;
        }
        walletClass += "\">";
        walletName = "<span id=\"listName_"+ wAddress +"\" class=\"walletListItemAddress walletListItemTitle\">" + wName + "</span>";
        walletTitle = "<span id=\"pickName_"+ wAddress +"\" class=\"walletListItemAddress walletListItemTitle\">";
        if (wName !== "") {
            walletTitle += wName;
        } else {
            walletTitle += wAddress;
        }
        walletTitle += "</span>";
        walletPick = "<div onclick=\"pickWallet('"+wAddress+"')\">";
        walletBalance = "<span name=\"balance_" + wAddress + "\" class=\"walletListItemAddress walletListItemBalance\">" + Number(wBalance).toFixed(8) + "</span> ZEN";
        walletAddress = "<span class=\"walletListItemAddress\"><b>Address </b> " + wAddress + "</span><a href=\"javascript:void(0)\" class=\"walletListItemDetails\" onclick=\"walletDetailsDialog('" + wAddress + "', '"+ wBalance +"')\">Details</a>";
        document.getElementById("walletList").innerHTML += walletClass + walletName + walletBalance + walletAddress + "</div>";

        document.getElementById("pickWalletDialogContent").innerHTML += walletPick + walletClass + walletTitle + walletBalance + "</div></div>";
    }
    document.getElementById("walletFooterBalance").innerHTML = Number(data.total).toFixed(8);

    data.transactions.forEach(function(tx) {
        printTransactionElem("transactionHistory", tx[1], tx[2], tx[3], tx[4], tx[5], Number(tx[6]).toFixed(8), tx[7]);
    }, this);

    if (data.autorefresh > 0) {
        setTimeout(refreshWallet, data.autorefresh * 1000);
    }
});

ipcRenderer.on("update-wallet-balance", function (event, resp) {
    let data = JSON.parse(resp);

    document.getElementsByName("block_" + data.wallet).forEach(function(element) {
        element.classList.remove("walletListItemZero");
    }, this);
    document.getElementsByName("balance_" + data.wallet).forEach(function(element) {
        element.innerText = Number(data.balance).toFixed(8);
    }, this);
    doNotify("Balance has been updated", "New balance: " + data.balance + " " + data.wallet);

    document.getElementById("walletFooterBalance").innerHTML = Number(data.total).toFixed(8);
});

ipcRenderer.on("refresh-wallet-response", function (event, resp) {
    let data = JSON.parse(resp);

    if (data.response === "OK")
    {
        if (data.autorefresh > 0) {
            setTimeout(refreshWallet, data.autorefresh * 1000);
        }
    }
});

ipcRenderer.on("rename-wallet-response", function (event, resp) {
    let data = JSON.parse(resp);
    if (data.response === "OK") {
        doNotify("Wallet name has been updated", data.msg);
        document.getElementById("listName_" + data.addr).innerHTML = data.newname;
        document.getElementById("pickName_" + data.addr).innerHTML = data.newname;
    } else {
        doNotify("Rename wallet error", data.msg);
    }
    console.log(data.msg);
});

ipcRenderer.on("get-wallet-by-name-response", function (event, resp) {
    let data = JSON.parse(resp);
    /* NOT PLANED FOR BETA VERSION */
    /* FIXME: @nonghost if response=OK data.wallets else data.msg */
    console.log(data.msg);
});

ipcRenderer.on("get-transaction-update", function (event, resp) {
    let data = JSON.parse(resp);
    
    printTransactionElem("transactionHistory", data.txid, data.time, data.address, data.vins, data.vouts, Number(data.amount).toFixed(8), data.block);
});

ipcRenderer.on("generate-wallet-response", function (event, resp) {
    let data = JSON.parse(resp);

    if (data.response === "OK")
    {
        let i = 0;
        let list = document.getElementById("walletList").childNodes;
        while (document.getElementById("walletList").childNodes[i].childNodes[1].innerText !== "0.00000000") {
            i++;
        }
        let wAddress = data.msg;
        let wName = document.getElementById("newWalletName").value;
        let walletName;
        let walletBalance;
        let walletAddress;
        let elemName = "block_" + wAddress;

        walletName = "<span id=\"listName_"+ wAddress +"\" class=\"walletListItemAddress walletListItemTitle\">" + wName + "</span>";
        walletBalance = "<span name=\"balance_" + wAddress + "\" class=\"walletListItemAddress walletListItemBalance\">" + Number(0).toFixed(8) + "</span> ZEN";
        walletAddress = "<span class=\"walletListItemAddress\"><b>Address </b> " + wAddress + "</span><a href=\"javascript:void(0)\" class=\"walletListItemDetails\" onclick=\"walletDetailsDialog('" + wAddress + "', '0')\">Details</a>";
        let newItem = document.createElement("div");
        newItem.innerHTML = walletName + walletBalance + walletAddress;
        newItem.classList.add("walletListItem");
        newItem.name = elemName;
        document.getElementById("walletList").insertBefore(newItem, list[i]);
        document.getElementById("newWalletAddress").value = wAddress;
    }
});

function printTransactionElem(elem, txId, datetime, myAddress, addressesFrom, addressesTo, amount, block) {
    let date = new Date(datetime * 1000);
    let dateStr = date.toString().substring(0, 24);
    let transactionText = "<div class=\"walletTransaction\" onclick=\"transactionDetailsDialog('"+ txId+"', '"+date.toString()+"', '"+myAddress+"', '"+addressesFrom+"', '" + addressesTo + "','"+amount+"', '"+ block +"')\">";
    transactionText += "<div><span class=\"transactionItem\">"+dateStr +"</span> - <span class=\"wallet_labels\">Block</span> <span class=\"transactionItem\">"+ block +"</span></div>";
    transactionText += "<div class=\"";
    if (amount > 0) {
        transactionText += "transactionIncome";
    } else {
        transactionText += "transactionOutcome";
    }
    transactionText += "\">" + amount + " ZEN</div>";
    transactionText += "<span class=\"transactionItem\">"+ myAddress +"</span></div>";
    transactionText += "</div>";
    let oldHtml = document.getElementById(elem).innerHTML;
    document.getElementById(elem).innerHTML = transactionText + oldHtml;
}

function transactionDetailsDialog(txId, datetime, myAddress, addressesFrom, addressesTo, amount, block) {
    let addressesSend = addressesFrom.split(",");
    let addressesRecv = addressesTo.split(",");
    showDarkContainer();
    document.getElementById("transactionDetailsDialog").style.zIndex = "2";
    document.getElementById("transactionDetailsDialog").style.opacity = "1";
    document.getElementById("transactionDetailsDialogContent").innerHTML = "";
    let transactionText = "";
    transactionText += "<div class=\"transactionDetail\"><div class=\"center\"><span class=\"transactionItem\">"+ datetime +"</span></div>";
    if (amount > 0) {
        transactionText += "<div class=\"center\"><div class=\"transactionIncome\">" + amount + " ZEN</div></div>";
    } else {
        transactionText += "<div class=\"center\"><div class=\"transactionOutcome\">" + amount + " ZEN</div></div>";
    }
    transactionText += "<div class=\"center\"><span class=\"transactionItem\">"+ myAddress +"</span></div></div>";
    transactionText += "<div class=\"transactionItemLabel\">Transaction ID:</div>";
    transactionText += "<div class=\"center\"><a href=\"javascript:void(0)\" onclick=\"openUrl('https://explorer.zensystem.io/tx/"+ txId +"')\" class=\"walletListItemDetails transactionExlorer\" target=\"_blank\">"+txId+"</a></div></div>";
    transactionText += "<div class=\"transactionItemLabel\">From:</div>";
    for(let i = 0; i < addressesSend.length; i++ ) {
        transactionText += "<div class=\"center\"><div class=\"transactionItem\">" + addressesSend[i] + "</div></div>";
    }
    transactionText += "<div class=\"transactionItemLabel\">To:</div>";
    for(let i = 0; i < addressesRecv.length; i++ ) {
        transactionText += "<div class=\"center\"><div class=\"transactionItem\">" + addressesRecv[i] + "</div></div>";
    }
    transactionText += "<div class=\"transactionItemLabel\">Block height:</div>";

    transactionText += "<div class=\"center\"><div class=\"transactionItem transactionConfirms\">"+ block +"</div></div>";

    document.getElementById("transactionDetailsDialogContent").innerHTML = transactionText;
}

// --------------------------------------------------------------------------------------------------------
// // FIXME: check if unused
// function checkZeroList(walletList, zero=true) {
//     let list = [];
//     for (let i = 0; i < walletList.wallets.length; i++) {
//         if ((zero) && (walletList.wallets[i][3] === 0)) {
//             list.push(walletList.wallets[i]);
//         }
//         if ((!zero) && (walletList.wallets[i][3] > 0)) {
//             list.push(walletList.wallets[i]);
//         }
//     }
//     return list;
// }
//
// function getNonZeroBalance(walletList) {
//     let non_zero = checkZeroList(walletList, false);
//     non_zero.sort(function (a, b) {
//         return b[3] - a[3];
//     });
//     return non_zero;
// }
//
// function getZeroBalance(walletList) {
//     console.log(walletList);
//     return checkZeroList(walletList, true);
// }
//

//
// function printWalletList(non_zero, zero, elem, verbose = true) {
//     let walletElem = document.getElementById(elem);
//     walletElem.innerHTML = "";
//     let hide_balances = document.getElementById("hideZeroBalancesButton");
//     let ids = [];
//     ids = printList(non_zero, elem, ids, verbose);
//     if ((elem === "walletList") && (hide_balances.textContent === "Show Zero Balances")) {
//         return;
//     }
//     printList(zero, elem, ids, verbose);
// }
//
// /* FIXME: @nonghost transaction info usage */
// function testTransaction() {
//     ipcRenderer.send("get-transaction", "3098e8b87b1a54a5d3e60b60e2c888547f17cb8e8504b1e70d6b6aca882b7413", "znYBWsMPdeUJfwbKbMdXNPVD9THysCgzFhu");
// }

/*
function printTransactionList(data) {
    //        data.transactions - raw transactions from api
    //        data.addresses - my addresses [index coresponds with transactiond index]
    document.getElementById("transactionDetailsDialogContent").innerHTML = "";
    data.transactions.forEach(function(transaction, i) {
        let trAddresses = parseTransactionAddresses(transaction);
        let income = findUserAddress(trAddresses, data.addresses[i]);
        let amount;
        if (income === "in") {
            amount = (data.vout[0].scriptPubKey.addresses[0] === data.addresses[i]) ? transaction.vout[0].value : transaction.vout[1].value;
            printTransactionElem("transactionHistory", transaction.txid, transaction.time, data.addresses[i], trAddresses, amount, transaction.confirmations);
        } else {
            printTransactionElem("transactionHistory", transaction.txid, transaction.time, data.addresses[i], trAddresses, -transaction.valueOut, transaction.confirmations);
        }
    });
}
*/

/*

function parseTransactionAddresses(transaction) {
    let addresses = Array();
    addresses.push(transaction.vin.addr);
    transaction.vout.forEach(function(vout, index) {
       vout.scriptPubKey.addresses.forEach(function(address, index2) {
          addresses.push(address);
       });
    });
    return addresses;
}
*/
/**
 * Find user address in transaction with information about income/outcome
 * @param rawTransaction - transaction object
 * @param wallets - wallet list
 * @return address - pair [in/out, address]
 */
/*
function findUserAddress(trAddresses, address) {
    // FIXME: what to return if trAddresses is undefined ?
    if(trAddresses !== undefined) {
        trAddresses.forEach(function(txAddress, index){
                if (txAddress === address) {
                    if (index === 0) {
                        return "out";
                    }
                    return "in";
                }
        });
    }
}
*/

/*
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
*/

/*

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
        walletTitle = "<span class=\"walletListItemAddress walletListItemTitle\">";
        if (verbose) {
            walletTitle += wName;
        } else {
            if (wName !== "") {
                walletTitle += wName;
            } else {
                walletTitle += wAddress;
            }
        }
        walletTitle += "</span>";
    }
    walletBalance = "<span id=\"balance_" + wAddress + "\" class=\"walletListItemAddress walletListItemBalance\"><b>" + Number(wBalance).toFixed(8) + "</b></span> ZEN";
    if (verbose) {
        walletAddress = "<span class=\"walletListItemAddress\"><b>Address </b> " + wAddress + "</span><a href=\"javascript:void(0)\" class=\"walletListItemDetails\" onclick=\"walletDetailsDialog(" + wId + ")\">Details</a>";
    }
    return walletClass + walletTitle + walletBalance + walletAddress + walletEnd;
}
*/
