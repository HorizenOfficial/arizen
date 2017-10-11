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
        location.href = "./wallet.html";
        console.log("Login was successful - redirecting to wallet.html");
    } else {
        document.getElementById("login_pswd_info").style.display = "block";
    }
});
