// // @flow
// /*jshint esversion: 6 */
// /*jslint node: true */
// "use strict";
//
// const {app, BrowserWindow, Menu} = require("electron");
// // const path = require("path");
// const os = require("os");
//
// function getRootConfigPath() {
//     let rootPath;
//     if (os.platform() === "win32" || os.platform() === "darwin") {
//         rootPath = app.getPath("appData") + "/" + "Zen/";
//     }
//     if (os.platform() === "linux") {
//         rootPath = app.getPath("home") + "/" + "./zen/";
//     }
//     return rootPath;
// }
//
// function getLoginPath() {
//     let rootPath = getRootConfigPath();
//     let loginPath = rootPath + "loginInfo.txt";
//     return loginPath;
// }
//
// module.exports = {getRootConfigPath, getLoginPath};