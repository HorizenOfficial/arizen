// @flow
/*jshint esversion: 6 */
/*jslint node: true */
'use strict';

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
