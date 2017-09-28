// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {ipcRenderer} = electron;
const pckg = require("../package.json");

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
    document.getElementById("darkContainer").style.transition = "1.4s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
    document.getElementById("sidenavIMG").style.transition = "0.4s";
    document.getElementById("sidenavIMG").style.transitionDelay = "0.5s";
    document.getElementById("sidenavIMG").style.opacity = "0.9";
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("darkContainer").style.transition = "0s";
    document.getElementById("darkContainer").style.opacity = "0";
    document.getElementById("darkContainer").style.zIndex = "-1";
    document.getElementById("sidenavIMG").style.transitionDelay = "0s";
    document.getElementById("sidenavIMG").style.transition = "0s";
    document.getElementById("sidenavIMG").style.opacity = "0";
}

function aboutDialog() {
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("sidenavIMG").style.transitionDelay = "0s";
    document.getElementById("sidenavIMG").style.transition = "0s";
    document.getElementById("sidenavIMG").style.opacity = "0";
    document.getElementById("aboutContent").innerHTML += "\<b\>Arizen version: \</b\>" + pckg.version + "\<br\>";
    document.getElementById("aboutContent").innerHTML += "\<b\>License: \</b\>" + pckg.license + "\<br\>";
    let authors = "\<b\>Authors:\</b>\<br\>";
    pckg.contributors.forEach(function (person) {
        authors += person.name + ", " + person.email + "\<br\>";
    });
    document.getElementById("aboutContent").innerHTML += authors;
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

function openHomepageInDefaultBrowser() {
    electron.shell.openExternal(pckg.homepage)
}

function doNotify(title, message, duration = 2) {
    let notif = new Notification(title, {
        body: message,
        icon: "resources/zen_icon.png",
        duration: duration
    });

    notif.onclick = () => {
        notif.close();
    }
}

function settingsDialog() {
    // TODO: @nonghost create dialog for settings
    // radiobutton - disable/enable desktop notification, default = enable, where to store settings?
    // TODO: delete this - only test
    doNotify("ZEN", "Awesome Arizen wallet");
}
