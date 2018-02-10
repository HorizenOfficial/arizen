// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {ipcRenderer} = electron;
const minLoginLen = 4;
const minPasswdLen = 8;

function doLogin() {
        ipcRenderer.send("verify-login-info", document.getElementById("username").value, document.getElementById("pswd").value);
}

function showCreateWallet() {
    let loginForm = document.getElementById("loginForm"),
    regForm = document.getElementById("registrationForm");
    loginForm.classList.toggle("login__form--hide");
    regForm.classList.toggle("registration__form--hide");
}

function showLogin() {
    let loginForm = document.getElementById("loginForm"),
    regForm = document.getElementById("registrationForm");

    loginForm.classList.toggle("login__form--hide");
    regForm.classList.toggle("registration__form--hide");
}

ipcRenderer.on("verify-login-response", function (event, resp) {
    let data = JSON.parse(resp);

    if (data.response === "OK") {
        location.href = "./zwallet.html";
        console.log("Login was successful - redirecting to wallet.html");
    } else {
      // Show error on login page.
        var loginError = document.getElementById("loginError");
        loginError.dataset.error = "visible";
    }
});

/**
  *  Begin create_wallet.js
 */
 let usr = false;
 let len = false;
 let lett = false;
 let capl = false;
 let num = false;
 let ide = false;
 let spec = false;

 function checkLoginInfo() {
     document.getElementById("btnCreateWallet").disabled = !(usr && len && lett && capl && num && spec);
 }

 function doCreateWallet() {
     document.getElementById("wallet_creation_info").innerHTML = "";
     document.getElementById("wallet_creation_info_area").style.display = "none";
     let resp = {
         username: document.getElementById("regUsername").value,
         password: document.getElementById("regPswd").value,
         walletPath: (document.getElementById("btnWallet").files.length > 0) ? document.getElementById("btnWallet").files[0].path : "",
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

 /**
   *  Show the wallet filename in the input field when a file is selected
  */
 function showFileInfo() {
     let wFile = document.getElementById("registrationWallet"),
         wFileLabel = document.getElementById("registrationWalletFileName");
     if (wFile.files.length > 0) {
         wFileLabel.value = wFile.files[0].name;
     }
 }

/**
  *  Toggle between text and password type on password input field
 */
 function pwToggle() {
   let pwToggle = document.getElementById("togglePw"),
     pwField = document.getElementById("regPswd");
   if (pwToggle.dataset.state == "show") {
     pwField.setAttribute("type", "password");
     pwToggle.dataset.state = "hide";
     pwToggle.setAttribute("src", "resources/icon-showPw.svg");
   } else if (pwToggle.dataset.state == "hide") {
     pwField.setAttribute("type", "text");
     pwToggle.dataset.state = "show";
     pwToggle.setAttribute("src", "resources/icon-hidePw.svg");
   }
 }

 /**
   *  Button functionality for login button
  */
  function loginToggle(e) {
    console.log("1");
    e.preventDefault();
    let btnLogin = document.getElementById("btnLogin"),
    btnCw = document.getElementById("btnCreateWallet");
    btnLogin.preventDefault;
    btnLogin.disabled = false;
    btnCw.disabled = false;
    if (btnLogin.dataset.state == "hide") {
      showCreateWallet();
      btnLogin.dataset.state = "active";
      btnCw.dataset.state = "hide";
    } else if (btnLogin.dataset.state == "active") {
      doLogin();
    }
  }

/**
  *  Button functionality for create wallet button
 */
  function createWalletToggle(e) {
    console.log("2");
    e.preventDefault();
    let btnCw = document.getElementById("btnCreateWallet"),
    btnLogin = document.getElementById("btnLogin");
    btnCw.preventDefault;
    btnLogin.disabled = false;
    btnCw.disabled = false;
    if (btnCw.dataset.state == "hide") {
      showLogin();
      btnCw.dataset.state = "active";
      btnCw.disabled = !(usr && len && lett && capl && num && spec);
      btnLogin.dataset.state = "hide";
    } else if (btnCw.dataset.state == "active") {
        doLogin();
    }
  }

 function checkLogin() {
     // validate the length
     usr = (document.getElementById("regUsername").value.length >= minLoginLen);
     if (usr) {
         changeClass("usrnm_length_info", "valid", "invalid");
     } else {
         changeClass("usrnm_length_info", "invalid", "valid");
     }
     checkLoginInfo();
 }

 function checkPasswd() {
     let pswd_val = document.getElementById("regPswd").value;

     // validate the length
     len = (pswd_val.length >= minPasswdLen);
     if (len) {
         changeClass("length_info", "valid", "invalid");
     } else {
         changeClass("length_info", "invalid", "valid");
     }

     // validate letter
     lett = pswd_val.match(/[a-z]/);
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
     showFileInfo();

     let re =  /(?:\.([^.]+))?$/;
     let targetStyle = "none";

     document.getElementById("btnWalletFilename").textContent = document.getElementById("btnWallet").value;
     if (re.exec(document.getElementById("btnWallet").value)[1] === "awd") {
         targetStyle = "block";
     }
     document.getElementById("old_username_area").style.display = targetStyle;
 }
