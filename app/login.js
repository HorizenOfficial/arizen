// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {ipcRenderer} = electron;

function doLogin() {
    ipcRenderer.send("verify-login-info", document.getElementById("username").value, document.getElementById("pswd").value);
}

ipcRenderer.on("verify-login-response", function (event, resp) {
    let data = JSON.parse(resp);

    if (data.response === "OK") {
        location.href = "./zwallet.html";
        console.log("Login was successful - redirecting to wallet.html");
    } else if (data.response === "ERR_corrupted_file") {
        document.getElementById("login_corrupted_file").style.display = "block";
    } else if (data.response === "ERR_wrong_credentials") {
        document.getElementById("login_wrong_credentials").style.display = "block";
    } else if (data.response === "ERR_nonexistent_wallet_name") {
        document.getElementById("login_nonexistent_wallet_name").style.display = "block";
    }
});

ipcRenderer.on("testnet", function(){
    document.getElementById("testnet").style.display = "block";
})