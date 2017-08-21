// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {ipcRenderer} = electron;
const minLoginLen = 4;
const minPasswdLen = 8;

function checkLoginInfo() {
    if (document.getElementById("username").value.length >= minLoginLen && document.getElementById("pswd").value.length >= minPasswdLen)
    {
        document.getElementById("btSubmit").disabled = false;
    } else {
        document.getElementById("btSubmit").disabled = true;
    }
}

function doLogin() {
    ipcRenderer.send("verify-login-info", document.getElementById("username").value, document.getElementById("pswd").value);
}

ipcRenderer.on('verify-login-response', function (event, resp) {
    let data = JSON.parse(resp);

    if (data.response === "OK") {
        location.href = "./wallet.html";
        console.log("Login was successful - redirecting to wallet.html");
    } else {
        document.getElementById("pswd_info").style.display = "block";
    }
});