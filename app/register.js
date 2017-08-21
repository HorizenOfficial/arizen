// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {ipcRenderer} = electron;
const minLoginLen = 0;
const minPasswdLen = 0;

let usr = false;
let len = false;
let lett = false;
let capl = false;
let num = false;
let ide = false;
let spec = false;

function checkLoginInfo() {
    if (usr && len && lett && capl && num && ide && spec) {
        document.getElementById("btSubmit").disabled = false;
    } else {
        document.getElementById("btSubmit").disabled = true;
    }
}

function doRegister() {
    ipcRenderer.send("write-login-info", document.getElementById("username").value, document.getElementById("pswd").value,
        document.getElementById("btWallet").files[0].path ? document.getElementById("btWallet").files[0].path : ""
    );
    location.href = "./login.html";
    console.log("Registration was successful - redirecting to wallet.html");
}

function checkLogin() {
    // validate the length
    if (document.getElementById("username").value.length < minLoginLen) {
        document.getElementById("usrnm_length_info").classList.add("invalid");
        document.getElementById("usrnm_length_info").classList.remove("valid");
        usr = false;
    } else {
        document.getElementById("usrnm_length_info").classList.add("valid");
        document.getElementById("usrnm_length_info").classList.remove("invalid");
        usr = true;
    }
    checkLoginInfo();
}

function checkPasswd() {
    let pswd_val = document.getElementById("pswd").value;

    // validate the length
    if (pswd_val.length < minPasswdLen) {
        document.getElementById("length_info").classList.add("invalid");
        document.getElementById("length_info").classList.remove("valid");
        len = false;
    } else {
        document.getElementById("length_info").classList.add("valid");
        document.getElementById("length_info").classList.remove("invalid");
        len = true;
    }

    // validate letter
    if (pswd_val.match(/[A-z]/)) {
        document.getElementById("letter_info").classList.add("valid");
        document.getElementById("letter_info").classList.remove("invalid");
        lett = true;
    } else {
        document.getElementById("letter_info").classList.add("invalid");
        document.getElementById("letter_info").classList.remove("valid");
        lett = false;
    }

    // validate capital letter
    if (pswd_val.match(/[A-Z]/)) {
        document.getElementById("capital_info").classList.add("valid");
        document.getElementById("capital_info").classList.remove("invalid");
        capl = true;
    } else {
        document.getElementById("capital_info").classList.add("invalid");
        document.getElementById("capital_info").classList.remove("valid");
        capl = false;
    }

    // validate number
    if (pswd_val.match(/\d/)) {
        document.getElementById("number_info").classList.add("valid");
        document.getElementById("number_info").classList.remove("invalid");
        num = true;
    } else {
        document.getElementById("number_info").classList.add("invalid");
        document.getElementById("number_info").classList.remove("valid");
        num = false;
    }

    // validate special character
    if (pswd_val.match(/[-!$%^&*()_+|~=`{}\[\]:";"<>?,.\/@#]/)) {
        document.getElementById("special_info").classList.add("valid");
        document.getElementById("special_info").classList.remove("invalid");
        spec = true;
    } else {
        document.getElementById("special_info").classList.add("invalid");
        document.getElementById("special_info").classList.remove("valid");
        spec = false;
    }
    checkLoginInfo();
}

function checkPasswdAgain() {
    if (document.getElementById("pswd").value === document.getElementById("pswd_again").value) {
        document.getElementById("identical_info").classList.add("valid");
        document.getElementById("identical_info").classList.remove("invalid");
        ide = true;
    } else {
        document.getElementById("identical_info").classList.add("invalid");
        document.getElementById("identical_info").classList.remove("valid");
        ide = false;
    }
    checkLoginInfo();
}

function selectColumn(username, pswd, pswd_again) {
    if (username === true) {
        document.getElementById("username_info").style.display = "block";
        document.getElementById("pswd_info").style.display = "none";
        document.getElementById("pswd_identical_info").style.display = "none";
    } else if (pswd === true) {
        document.getElementById("username_info").style.display = "none";
        document.getElementById("pswd_info").style.display = "block";
        document.getElementById("pswd_identical_info").style.display = "none";
    } else if (pswd_again === true) {
        document.getElementById("username_info").style.display = "none";
        document.getElementById("pswd_info").style.display = "none";
        document.getElementById("pswd_identical_info").style.display = "block";
    }

}