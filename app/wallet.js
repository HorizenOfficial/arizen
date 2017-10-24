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
    let address = document.getElementById("receiveAddressText").value;
    let amount = document.getElementById("receiveCoinAmount").value;
    ipcRenderer.send("generate-qr-code", address, amount);
}

ipcRenderer.on("render-qr-code", function (event, url) {
    let img = document.getElementById("qr_image");
    img.src = url;
});


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
        document.getElementById("walletList").childNodes.forEach(function(element) {
            if (element.childNodes[1].innerText === "0.00000000") {
                element.classList.add("walletListItemZero");
            }
        }, this);
        document.getElementById("hideZeroBalancesButton").textContent = "Show Zero Balances";
        document.getElementById("hideZeroBalancesButton").classList.remove("balancesButtonHide");
        document.getElementById("hideZeroBalancesButton").classList.add("balancesButtonShow");
    } else {
        document.getElementById("walletList").childNodes.forEach(function(element) {
            element.classList.remove("walletListItemZero");
        }, this);
        document.getElementById("hideZeroBalancesButton").textContent = "Hide Zero Balances";
        document.getElementById("hideZeroBalancesButton").classList.remove("balancesButtonShow");
        document.getElementById("hideZeroBalancesButton").classList.add("balancesButtonHide");
    }
}

function send() {
    showSendStart();
    ipcRenderer.send("send",
        document.getElementById("sendFromAddressText").value,
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

function pickWalletDialog(elem, show, hide) {
    showDarkContainer();
    document.getElementById("pickWalletDialog").style.zIndex = "2";
    document.getElementById("pickWalletDialog").style.opacity = "1";
    document.getElementById("pickWalletDialogElem").innerHTML = elem;
    document.getElementById(show).style.display = "block";
    document.getElementById(hide).style.display = "none";
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
    closeDialog("progressBarDialog");
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
    document.getElementById(elem + "Text").value = address;
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
    for (let i = 0; i < data.wallets.length; i += 1) {
        wAddress = data.wallets[i][2];
        wBalance = data.wallets[i][3];
        wName = data.wallets[i][4];
        let walletPick = "";

        walletClass = "<div name=\"block_" + wAddress + "\" class=\"walletListItem";
        /* wallet is ordered by amount */
        if (i % 2 === 0) {
            walletClass += " walletListItemOdd";
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
        document.getElementById("pickWalletDialogContentFull").innerHTML += walletPick + walletClass + walletTitle + walletBalance + "</div></div>";
    }
    document.getElementById("walletFooterBalance").innerHTML = Number(data.total).toFixed(8);

    document.getElementById("walletList").childNodes.forEach(function(element) {
        if (element.nodeName === "DIV") {
            if (element.childNodes[1].innerText === "0.00000000") element.classList.add("walletListItemZero");
        }
    }, this);
    document.getElementById("pickWalletDialogContent").childNodes.forEach(function(element) {
        if (element.nodeName === "DIV") {
            if (element.childNodes[0].childNodes[1].innerText === "0.00000000") element.childNodes[0].classList.add("walletListItemZero");
        }
    }, this);

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
        while (document.getElementById("walletList").childElementCount > i && document.getElementById("walletList").childNodes[i].childNodes[1].innerText !== "0.00000000") {
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
        if (i % 2 === 0) {
            newItem.classList.add("walletListItemOdd");
        }
        newItem.name = elemName;
        document.getElementById("walletList").insertBefore(newItem, list[i]);
        document.getElementById("newWalletAddress").value = wAddress;
        for (i = i + 1; i < document.getElementById("walletList").childElementCount; i += 1) {
            document.getElementById("walletList").childNodes[i].classList.toggle("walletListItemOdd");
        }
    }
});

// FIXME remove this silly callback to main
//ipcRenderer.on("zz-get-wallets", (event, resp) => {
// 	ipcRenderer.send("get-wallets");
//});

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
    document.getElementById(elem).innerHTML = oldHtml + transactionText;
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
    transactionText += "<div class=\"center\"><a href=\"javascript:void(0)\" onclick=\"openUrl('https://explorer.zensystem.io/tx/"+ txId +"')\" class=\"walletListItemDetails transactionExplorer\" target=\"_blank\">"+txId+"</a></div></div>";
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


function showProgressBar() {
    document.removeEventListener("keydown", escKeyDown, false);
    document.getElementById( "darkContainer" ).setAttribute( "onClick", "" );
    showDarkContainer();
    document.getElementById("progressBarDialog").style.zIndex = "2";
    document.getElementById("progressBarDialog").style.opacity = "1";
    document.getElementById("progressBar").style.width = 0 + "%";
    document.getElementById("progressBarDialogLabel").innerHTML = "Starting...";
}

ipcRenderer.on("show-progress-bar", function() {
    document.removeEventListener("keydown", escKeyDown, false);
    document.getElementById( "darkContainer" ).setAttribute( "onClick", "" );
    showDarkContainer();
    document.getElementById("progressBarDialog").style.zIndex = "2";
    document.getElementById("progressBarDialog").style.opacity = "1";
    document.getElementById("progressBar").style.width = 0 + "%";
    document.getElementById("progressBarDialogLabel").innerHTML = "Starting...";
});

ipcRenderer.on("close-progress-bar", function() {
    document.getElementById( "darkContainer" ).setAttribute( "onClick", "javascript: closeAllWalletsDialogs();");
    document.addEventListener("keydown", escKeyDown, false);
    closeAllWalletsDialogs();
});

ipcRenderer.on("update-progress-bar", function(event, label, value) {
    document.getElementById("progressBar").style.width = value + "%";
    document.getElementById("progressBarDialogLabel").innerHTML = label;
});

function showSendStart() {
    document.removeEventListener("keydown", escKeyDown, false);
    document.getElementById( "darkContainer" ).setAttribute( "onClick", "" );
    showDarkContainer();
}

function showSendFinish(type, text) {
    document.getElementById( "darkContainer" ).setAttribute( "onClick", "javascript: closeAllWalletsDialogs();");
    document.addEventListener("keydown", escKeyDown, false);
    closeAllWalletsDialogs();
    document.getElementById("sendFromAddressText").value = "";
    document.getElementById("sendToAddress").value = "address";
    document.getElementById("coinFee").value = "0.00010000";
    document.getElementById("coinAmount").value = "0.00000000";

    if(type === "error") {
        let elem = document.getElementById("sendResultText");
        let title= document.getElementById("sendResultTitle");

        title.style.color = "#aa0000";
        title.innerHTML = "<b>Error:</b>";
        elem.innerHTML = text;
    } else if (type === "ok") {
        let elem = document.getElementById("sendResultText");
        let title= document.getElementById("sendResultTitle");
        title.style.color = "#008800";
        title.innerHTML = "<b>Transaction has been successfully sent</b>";
        elem.innerHTML = text;
    }

}


ipcRenderer.on("send-finish", function(event, type, text) {
    showSendFinish(type, text);
});
