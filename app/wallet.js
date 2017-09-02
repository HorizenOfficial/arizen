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

function clearValue(){
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

function closeDialog(clasname) {
    document.getElementById("darkContainer").style.transition = "0s";
    document.getElementById("darkContainer").style.opacity = "0";
    document.getElementById("darkContainer").style.zIndex = "-1";
    document.getElementById(clasname).style.zIndex = "-1";
    document.getElementById(clasname).style.opacity = "0";
}

function printWalletListToPickDialog(walletList, wNames){
    let walletListText;
    walletListText = "";
    for (let i = 0; i < walletList.length; i++) {
        if ((i%2) == 0)
        {
            walletListText += "<div class=\"walletListItem walletListItemOdd\">";
        } else {
            walletListText += "<div class=\"walletListItem\">";
        }
        walletListText += "<span class=\"walletListItemAddress walletListItemTitle\">"+ wNames[walletList[i].id] +"</span>";
        walletListText += "<div class=\"right\"><span class=\"walletListItemAddress walletListItemBalance\">"+ walletList[i].balance +"</span> ZEN</div>";
        walletListText += "</div>";
    }
    document.getElementById("pickWalletDialogContent").innerHTML = walletListText;
}

function renderWallet(walletList, wNames) {
    printWalletListToPickDialog(walletList, wNames);
}


function getWallets() {
    ipcRenderer.send("get-wallets");
}

ipcRenderer.on("get-wallets-response", function (event, resp) {
    let walletElem = document.getElementById("walletList");
    let data = JSON.parse(resp);

    if (walletElem.children.length > 0) {
        walletElem.innerHTML = walletElem.children[0].outerHTML;
        for (let i = 0; i < data.wallets.length; i += 1) {
            walletElem.innerHTML += '<div class="walletListItem"><span class="walletListItemAddress">' + data.wallets[i].id
                                 +'</span><span class="walletListItemBalance">' + data.wallets[i].balance + '</span></div>';
            if (i % 2 == 0) {
                walletElem.children[i].className += " walletListItemOdd";
            }
        }
        document.getElementById("walletFooterBalance").innerHTML = data.total;
    }
});

getWallets();
