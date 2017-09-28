// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

// const electron = require("electron");
// const {ipcRenderer} = electron;

// var options = [
//     {
//         title: "Basic Notification",
//         body: "Short message part"
//     }
// ]
const notifier = require("electron-notifications");

function doNotify() {
    notifier.notify("Calendar", {
        message: "Event begins in 10 minutes",
        icon: "http://placekitten.com/g/300/300",
        buttons: ["Dismiss", "Snooze"]
    });
}



// document.addEventListener('DOMContentLoaded', function() {
//     document.getElementById("basic").addEventListener("click", doNotify);
//     document.getElementById("image").addEventListener("click", doNotify);
// })
