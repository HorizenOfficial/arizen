// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {ipcRenderer} = electron;

ipcRenderer.send("check-login-info");

ipcRenderer.on("verify-login-response", function (event, resp) {
    let data = JSON.parse(resp);

    if (data.response !== "OK") {
        location.href = "./login.html";
        console.log("Login not performed!");
    }
    else {
        /* FIXED: 'blink' of wallet.html, page is hidden until login is performed. */
        document.body.style.display = "block";
    }
});

function openNav() {
    document.getElementById("mySidenav").style.width = "250px";
    //document.getElementById("darkContainer").style.width = "100%";
    document.getElementById("darkContainer").style.transition = "1.4s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
    document.getElementById("sidenavIMG").style.transition = "0.4s";
    document.getElementById("sidenavIMG").style.transitionDelay = "0.5s";
    document.getElementById("sidenavIMG").style.opacity = "0.9";
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
    //document.getElementById("darkContainer").style.width = "0";
    document.getElementById("darkContainer").style.transition = "0s";
    document.getElementById("darkContainer").style.opacity = "0";
    document.getElementById("darkContainer").style.zIndex = "-1";
    document.getElementById("sidenavIMG").style.transitionDelay = "0s";
    document.getElementById("sidenavIMG").style.transition = "0s";
    document.getElementById("sidenavIMG").style.opacity = "0";
}

function showVersion() {
    let pckg = require("./package.json");
    console.log("Arizen version: " + pckg.version);
    window.alert("Arizen version: " + pckg.version);
}

function logout() {
    ipcRenderer.send("do-logout");
    location.href = "./login.html";
}

function exitApp() {
    ipcRenderer.send("exit-from-menu");
}

function showSend() {
    document.getElementById("receive").style.display = "none";
    document.getElementById("send").style.display = "block";
    document.getElementById("sendButtonMenu").style.borderRadius = "2px";
    document.getElementById("sendButtonMenu").style.backgroundColor = "transparent";
    document.getElementById("sendButtonMenu").style.border = "1px #f88900 solid";
    document.getElementById("sendButtonMenu").style.color = "#f88900";

    document.getElementById("receiveButtonMenu").style.borderRadius = "0px";
    document.getElementById("receiveButtonMenu").style.backgroundColor = "#f88900";
    document.getElementById("receiveButtonMenu").style.border = "1px #fefefe solid";
    document.getElementById("receiveButtonMenu").style.color = "#fefefe";
}

function showReceive() {
    document.getElementById("send").style.display = "none";
    document.getElementById("receive").style.display = "block";
    document.getElementById("receiveButtonMenu").style.borderRadius = "2px";
    document.getElementById("receiveButtonMenu").style.backgroundColor = "transparent";
    document.getElementById("receiveButtonMenu").style.border = "1px #f88900 solid";
    document.getElementById("receiveButtonMenu").style.color = "#f88900";

    document.getElementById("sendButtonMenu").style.borderRadius = "0px";
    document.getElementById("sendButtonMenu").style.backgroundColor = "#f88900";
    document.getElementById("sendButtonMenu").style.border = "1px #fefefe solid";
    document.getElementById("sendButtonMenu").style.color = "#fefefe";
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


function send() {
    return 0;
}