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
    const {shell} = require('electron');
    shell.openExternal(url);
}

function openZenExplorer(path) {
    openUrl('https://explorer.zensystem.io/' + path);
}

function fixLinks() {
    document.querySelectorAll('a[href^="http"]').forEach(link =>
        link.addEventListener('click', event => {
            event.preventDefault();
            shell.openExternal(link.href);
        }));
}

function formatBalance(balance) {
    return balance.toFixed(8);
}

function hideElement(node, yes) {
    if (yes)
        node.classList.add('hidden')
    else
        node.classList.remove('hidden')
}

function clearChildNodes(parent) {
    parent.childNodes.forEach(p => parent.removeChild(p));
}

function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

