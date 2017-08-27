// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {ipcRenderer} = electron;

ipcRenderer.send("check-login-info");

ipcRenderer.on("check-login-response", function (event, resp) {
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

function aboutDialog() {
    let pckg = require("./package.json");
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("sidenavIMG").style.transitionDelay = "0s";
    document.getElementById("sidenavIMG").style.transition = "0s";
    document.getElementById("sidenavIMG").style.opacity = "0";
    document.getElementById("aboutContent").textContent = "Arizen version: " + pckg.version;
    document.getElementById("darkContainer").style.transition = "0.5s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
    document.getElementById("aboutDialog").style.zIndex = "2";
    document.getElementById("aboutDialog").style.opacity = "1";
}

function closeAboutDialog() {
    document.getElementById("darkContainer").style.transition = "0s";
    document.getElementById("darkContainer").style.opacity = "0";
    document.getElementById("darkContainer").style.zIndex = "-1";
    document.getElementById("aboutDialog").style.zIndex = "-1";
    document.getElementById("aboutDialog").style.opacity = "0";
}

function logout() {
    ipcRenderer.send("do-logout");
    location.href = "./login.html";
}

function exitApp() {
    ipcRenderer.send("exit-from-menu");
}

//
// function getRootConfigPath() {
//     let rootPath;
//     if (os.platform() === "win32" || os.platform() === "darwin") {
//         rootPath = app.getPath("appData") + "/" + "Arizen/";
//     }
//     if (os.platform() === "linux") {
//         rootPath = app.getPath("home") + "/" + "./arizen/";
//     }
//     return rootPath;
// }
//
// function getLoginPath() {
//     let rootPath = getRootConfigPath();
//     return `${rootPath}loginInfo.txt`;
// }
//
// module.exports = {getRootConfigPath, getLoginPath};
