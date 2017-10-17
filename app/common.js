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

function closeDarkContainer() {
    document.getElementById("darkContainer").style.transition = "0s";
    document.getElementById("darkContainer").style.opacity = "0";
    document.getElementById("darkContainer").style.zIndex = "-1";
}

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
    closeDarkContainer();
    document.getElementById("sidenavIMG").style.transitionDelay = "0s";
    document.getElementById("sidenavIMG").style.transition = "0s";
    document.getElementById("sidenavIMG").style.opacity = "0";
}

function aboutDialog() {
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("sidenavIMG").style.transitionDelay = "0s";
    document.getElementById("sidenavIMG").style.transition = "0s";
    document.getElementById("sidenavIMG").style.opacity = "0";
    document.getElementById("aboutContent").innerHTML = "";
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
    closeDarkContainer();
    document.getElementById("aboutDialog").style.zIndex = "-1";
    document.getElementById("aboutDialog").style.opacity = "0";
}

function closeSettingsDialog() {
    closeDarkContainer();
    document.getElementById("settingsDialog").style.zIndex = "-1";
    document.getElementById("settingsDialog").style.opacity = "0";
}

function logout() {
    ipcRenderer.send("do-logout");
    location.href = "./login.html";
}

function exitApp() {
    ipcRenderer.send("exit-from-menu");
}

function openUrl(url) {
    ipcRenderer.send('open-explorer', url);
}

function openHomepageInDefaultBrowser() {
    openUrl(pckg.homepage);
}

function settingsDialog() {
    ipcRenderer.send("get-settings");
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("sidenavIMG").style.transitionDelay = "0s";
    document.getElementById("sidenavIMG").style.transition = "0s";
    document.getElementById("sidenavIMG").style.opacity = "0";

    document.getElementById("darkContainer").style.transition = "0.5s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
    document.getElementById("settingsDialog").style.zIndex = "2";
    document.getElementById("settingsDialog").style.opacity = "1";
    document.getElementById("settingsContent").innerHTML = "<label for=\"settingsNotifications\">Desktop notifications</label><input type=\"checkbox\" id=\"settingsNotifications\" name=\"notifications\"><br>";
    document.getElementById("settingsContent").innerHTML += "<label for=\"settingsAutorefresh\">Auto-refresh</label><input type=\"number\" id=\"settingsAutorefresh\" class=\"wallet_inputs settings_input\"  name=\"refresh\" value=\"30\" step=\"15\" min=\"15\"> seconds<br>";
    document.getElementById("settingsContent").innerHTML += "<label for=\"settingsRefreshTimeout\">Auto-refresh timeout</label><input type=\"number\" id=\"settingsRefreshTimeout\" class=\"wallet_inputs settings_input\" name=\"timeout\" value=\"10\" step=\"5\" min=\"5\"> seconds<br>";
    document.getElementById("settingsContent").innerHTML += "<label for=\"settingsTxHistory\">Transaction history items</label><input type=\"number\" id=\"settingsTxHistory\" class=\"wallet_inputs settings_input\" name=\"transactions\" value=\"50\" step=\"5\" min=\"5\"> items<br>";
    document.getElementById("settingsContent").innerHTML += "<p class=\"titleSettings\">HELP for settings will be added soon.</p>";
    document.getElementById("settingsContent").innerHTML += "<label for=\"settingsExplorer\">Explorer</label><br><input type=\"text\" id=\"settingsExplorer\" class=\"wallet_inputs settings_input\" name=\"explorer\"><br>";
    document.getElementById("settingsContent").innerHTML += "<label for=\"settingsApi\">API</label><br><input type=\"text\" id=\"settingsApi\" class=\"wallet_inputs settings_input\" name=\"api\">";
    document.getElementById("settingsContent").innerHTML += "<button class=\"buttons settingsSaveButton\" onclick=\"saveSettings()\">Save settings</button>";
}

ipcRenderer.on("get-settings-response", function (event, resp) {
    let data = JSON.parse(resp);
    let elem;

    if (data.response === "OK") {
        data.settings.forEach(function(node) {
            elem = document.getElementById(node[1]);
            if (elem.type === "text" || elem.type === "number") {
                elem.value = node[2];
            } else if (elem.type === "checkbox") {
                elem.checked = (node[2] === "1");
            } else {
                console.log("unknown elem type");
            }
        }, this);
    } else {
        console.log(data.msg);
    }
});

function saveSettings() {
    let settings = [
        {
            name: "settingsNotifications",
            value: document.getElementById("settingsNotifications").checked ? "1" : "0"
        },   
        {
            name: "settingsExplorer",
            value: document.getElementById("settingsExplorer").value
        },
        {
            name: "settingsApi",
            value: document.getElementById("settingsApi").value
        },
        {
            name: "settingsAutorefresh",
            value: document.getElementById("settingsAutorefresh").value
        },
        {
            name: "settingsRefreshTimeout",
            value: document.getElementById("settingsRefreshTimeout").value
        },
        {
            name: "settingsTxHistory",
            value: document.getElementById("settingsTxHistory").value
        }
    ];
    ipcRenderer.send("save-settings", JSON.stringify(settings));
    closeSettingsDialog("settingsDialog");
}

ipcRenderer.on("save-settings-response", function (event, resp) {
    let data = JSON.parse(resp);

    /* FIXME: @nonghost on ok close window */
    console.log(data.msg);
});

function doNotify(title, message, duration = 2) {
    ipcRenderer.send("show-notification", title, message, duration);
}

ipcRenderer.on("show-notification-response", function (event, title, message, duration) {
    let notif = new Notification(title, {
        body: message,
        icon: "resources/zen_icon.png",
        duration: duration
    });

    notif.onclick = () => {
        notif.close();
    }
});