// // @flow
// /*jshint esversion: 6 */
// /*jslint node: true */
// "use strict";
//
// const {app} = require("electron");
// const os = require("os");
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