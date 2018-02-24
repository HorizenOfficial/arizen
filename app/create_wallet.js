// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {ipcRenderer} = electron;
const minLoginLen = 4;
const minPasswdLen = 8;

let usr = false;
let len = false;
let lett = false;
let capl = false;
let num = false;
let ide = false;
let spec = false;

const userWarningCreateWallet = "To make sure that you will never lose your wallet make sure to keep backup of your wallet(s) file. (.uawd or .awd + username + password). \\ By clicking OK you declare that you fully understand this. If you are not sure please refer to the Arizen manual for further information. You can always contact the contributor of Arizen in the official github account: https://github.com/ZencashOfficial/arizen/."


function checkLoginInfo() {
    document.getElementById("btSubmit").disabled = !(usr && len && lett && capl && num && ide && spec);
}

function doCreateWallet() {
    document.getElementById("wallet_creation_info").innerHTML = "";
    document.getElementById("wallet_creation_info_area").style.display = "none";
    let resp = {
        username: document.getElementById("username").value,
        password: document.getElementById("pswd").value,
        walletPath: (document.getElementById("btWallet").files.length > 0) ? document.getElementById("btWallet").files[0].path : "",
        encrypted: (document.getElementById("old_username_area").style.display === "block"),
        olduser: document.getElementById("old_username").value,
        oldpass: document.getElementById("old_pswd").value
    };
    ipcRenderer.send("write-login-info", JSON.stringify(resp));
}

ipcRenderer.on("write-login-response", function (event, resp) {
    let data = JSON.parse(resp);

    if (data.response === "OK") {
        location.href = "./login.html";
        console.log("Wallet creation was successful - redirecting to login.html");
        alert(userWarningCreateWallet)
    } else {
        console.log("Wallet creation failed");
        document.getElementById("wallet_creation_info").innerHTML = data.msg;
        document.getElementById("wallet_creation_info_area").style.display = "block";
    }
});

function changeClass(objectid, newClass, oldClass) {
    /* FIXME: use classList.replace when electron uses chrome 61 */
    document.getElementById(objectid).classList.add(newClass);
    document.getElementById(objectid).classList.remove(oldClass);
}

function checkLogin() {
    // validate the length
    usr = (document.getElementById("username").value.length >= minLoginLen);
    if (usr) {
        changeClass("usrnm_length_info", "valid", "invalid");
    } else {
        changeClass("usrnm_length_info", "invalid", "valid");
    }
    checkLoginInfo();
}

function checkPasswd() {
    let pswd_val = document.getElementById("pswd").value;

    // validate the length
    len = (pswd_val.length >= minPasswdLen);
    if (len) {
        changeClass("length_info", "valid", "invalid");
    } else {
        changeClass("length_info", "invalid", "valid");
    }

    // validate letter
    lett = pswd_val.match(/[A-z]/);
    if (lett) {
        changeClass("letter_info", "valid", "invalid");
    } else {
        changeClass("letter_info", "invalid", "valid");
    }

    // validate capital letter
    capl = pswd_val.match(/[A-Z]/);
    if (capl) {
        changeClass("capital_info", "valid", "invalid");
    } else {
        changeClass("capital_info", "invalid", "valid");
    }

    // validate number
    num = pswd_val.match(/\d/);
    if (num) {
        changeClass("number_info", "valid", "invalid");
    } else {
        changeClass("number_info", "invalid", "valid");
    }

    // validate special character
    spec = pswd_val.match(/[\-!$%\^&*()_+\|~=`{}\[\]:";<>?,.\/@#]/);
    if (spec) {
        changeClass("special_info", "valid", "invalid");
    } else {
        changeClass("special_info", "invalid", "valid");
    }
    checkLoginInfo();
}

function checkPasswdAgain() {
    ide = (document.getElementById("pswd").value === document.getElementById("pswd_again").value) &&
        (document.getElementById("pswd").value !== "" || document.getElementById("pswd_again").value !== "");
    if (ide) {
        changeClass("identical_info", "valid", "invalid");
    } else {
        changeClass("identical_info", "invalid", "valid");
    }
    checkLoginInfo();
}

function selectColumn(username, pswd, pswd_again) {
    let username_info = "none";
    let pswd_info = "none";
    let pswd_identical_info = "none";
    if (username === true) {
        username_info = "block";
    } else if (pswd === true) {
        pswd_info = "block";
    } else if (pswd_again === true) {
        pswd_identical_info = "block";
    }
    document.getElementById("username_info").style.display = username_info;
    document.getElementById("pswd_info").style.display = pswd_info;
    document.getElementById("pswd_identical_info").style.display = pswd_identical_info;
}

function handleWalletFile() {
    let re = /(?:\.([^.]+))?$/;
    let targetStyle = "none";

    document.getElementById("btWalletFilename").textContent = document.getElementById("btWallet").value;
    if (re.exec(document.getElementById("btWallet").value)[1] === "awd") {
        targetStyle = "block";
    }
    document.getElementById("old_username_area").style.display = targetStyle;
}
