// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {app, Menu, ipcMain} = require("electron");
const BrowserWindow = electron.BrowserWindow;

// const keytar = require('keytar'); -
const path = require("path");
const url = require("url");
const os = require("os");
const fs = require("fs-extra");
const crypto = require("crypto");
const request = require('request');
const unzip = require('unzip');
const { spawn } = require('child_process');

// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the JavaScript object is garbage collected.
/* FIXME: this should be done automatically */
const zendVersion = "v2.0.9-4";
const zendCommit = "2045d34";
let win;
let loggedIn = false;
let username;
let daemon;
let rpcPassword;

function delaySync(msec) {
    let waitTill = new Date(new Date().getTime() + msec);
    while (waitTill > new Date()){}
}

function getLoginPath() {
    return getRootConfigPath() + "login.txt";
}

function getRootConfigPath() {
    let rootPath;
    if (os.platform() === "win32" || os.platform() === "darwin") {
        rootPath = app.getPath("appData") + "/Arizen/";
    } else if (os.platform() === "linux") {
        rootPath = app.getPath("home") + "/" + "/.arizen/";
        if (!fs.existsSync(rootPath)) {
            fs.mkdirSync(rootPath);
        }
    } else {
        console.log("Unidentified OS.");
        app.exit(0);
    }
    return rootPath;
}

function getZenPath() {
    let zenPath;
    if (os.platform() === "win32" || os.platform() === "darwin") {
        zenPath = app.getPath("appData") + "/Zen/";
    } else if (os.platform() === "linux") {
        zenPath = app.getPath("home") + "/.zen/";
    } else {
        console.log("Unidentified OS.");
        app.exit(0);
    }
    return zenPath;
}

function getTmpPath() {
    let tmpPath = os.tmpdir() + "/arizen";
    console.log(tmpPath);
    if (!fs.existsSync(tmpPath)) {
        fs.mkdirSync(tmpPath);
    }
    return tmpPath;
}

function getLatestZend() {
    let zendPlatform;

    if (os.platform() === "win32") {
        zendPlatform = "Win";
    } else if (os.platform() === "darwin") {
        zendPlatform = "Mac";
/*    } else if (os.platform() === "linux") {
        zenPath = app.getPath("home") + "/.zen/";*/
    } else {
        console.log("Unidentified OS.");
        app.exit(0);
    }
    
    let link = "https://github.com/ZencashOfficial/zen/releases/download/" + zendVersion + "/Zen_" + zendPlatform + "_binaries_" + zendVersion + "-" + zendCommit + ".zip";
    let file = fs.createWriteStream("./daemon/zend.zip");
    let sendReq = request.get(link);
    /* FIXME: this can block for some time */
    sendReq.pipe(file);
    
    file.on('finish', function() {
        file.close(extractLatestZend);
    });
}

function extractLatestZend() {
    let readStream = fs.createReadStream('./daemon/zend.zip');

    /* FIXME: this can block for some time */
    readStream.pipe(unzip.Extract({ path: './daemon' }));
    console.log("unzip done");
}

function checkLatestZend() {
    if (!fs.existsSync("./daemon")) {
        fs.mkdirSync("./daemon");
        getLatestZend();
    }
}

function startZend() {
    let cmd;

    if (os.platform() === "win32") {
        cmd = "./daemon/zend.exe";
    }
    else if (os.platform() === "darwin") {
        cmd = "./daemon/zend";
    } else {
        console.log("Unidentified OS.");
        app.exit(0);
    }
    if (!fs.existsSync(cmd)) {
        getLatestZend();
    } else {
        daemon = spawn(cmd, ["--datadir=" + getTmpPath()]);
        daemon.on('close', (code) => {
            fs.copySync(getTmpPath() + "/wallet.dat", "./wallets/wallet.dat." + username);
            fs.removeSync(getTmpPath());
        });
    }
}

function zendQuery(query, callback) {
    let options = {
        method: "POST",
        url: encodeURI("http://zenrpc:" + rpcPassword + "@127.0.0.1:8231"),
        headers: {
            "Content-type": "text/plain"
        },
        json: query
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode === 401) { // we have an error
            console.log("Cannot authenticate with wallet RPC service. Check username and password.");
            callback(response.body);
        } else if (!error) {
            try {
                callback(response.body);
            } catch (err) {
                console.log(err.message);
            }
        }
    });
}

function closeZend() {
    console.log("stopping zend");

    zendQuery({"jsonrpc": "1.0", "id": "stop", "method": "stop", "params": []},
        function (text) {
            console.log(text.result);
        });
}

function createWindow() {
    const template = [
        {
            label: "File",
            submenu: [
                {
                    label: "Backup wallet",
                    click() {
                        console.log("Backuping wallet is not implemented.");
                        //dialog.showOpenDialog(getFileLocationOpts("Import eleos-wallets.tar"), function (path) {
                        //});
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Import wallet",
                    click() {
                        console.log("Importing wallet is not implemented.");
                        //dialog.showSaveDialog(getSaveLocationOpts("Save Eleos wallets", "eleos-wallets.tar"), function (path) {
                        //);
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Exit",
                    click() {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: "Edit",
            submenu: [
                {label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:"},
                {label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:"},
                {type: "separator"},
                {label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:"},
                {label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:"},
                {label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:"},
                {label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:"}
            ]
        }
    ];

    if (os.platform() === "darwin") {
        template.unshift({
            label: app.getName(),
            submenu: [
                {
                    role: "about"
                },
                {
                    type: "separator"
                },
                {
                    role: "services",
                    submenu: []
                },
                {
                    type: "separator"
                },
                {
                    role: "hide"
                },
                {
                    role: "hideothers"
                },
                {
                    role: "unhide"
                },
                {
                    type: "separator"
                },
                {
                    role: "quit"
                }
            ]
        });
    }
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    win = new BrowserWindow({width: 1050, height: 730, resizable: false, icon: "resources/zen_icon.png"});

    if (fs.existsSync(getLoginPath())) {
        win.loadURL(url.format({
            pathname: path.join(__dirname, "login.html"),
            protocol: "file:",
            slashes: true
        }));
    } else {
        win.loadURL(url.format({
            pathname: path.join(__dirname, "register.html"),
            protocol: "file:",
            slashes: true
        }));
    }

    // Open the DevTools.
    win.webContents.openDevTools();

    // Emitted when the window is closed.
    win.on("closed", function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", function () {
    // On macOS it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
        // checkAll();
    }
});

app.on("before-quit", function () {
    console.log("quitting");
    
    if (loggedIn) {
        closeZend();
    } else {
        fs.removeSync(getTmpPath());
    }

    console.log("before-quit finished");
    // dialog.showMessageBox({
    //     type: "question",
    //     buttons: ["Yes", "No"],
    //     title: "Confirm",
    //     message: "Are you sure you want to quit?"
    // }, function (response) {
    //     if (response === 0) {
    //         app.showExitPrompt = false;
    //         win.close();
    //     }
    // });
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on("write-login-info", function (event, login, pass) {
    let path = getLoginPath();
    let data;
    if (fs.existsSync(getLoginPath())) {
        data = JSON.parse(fs.readFileSync(path, 'utf8'));
        data.users.push({
            login: login,
            password: pass
        });
    } else {
        data = {
            users: [{
                login: login,
                password: pass
            }]
        };
    }
    fs.writeFileSync(path, JSON.stringify(data), 'utf8', function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
});

ipcMain.on("verify-login-info", function (event, login, pass) {
    let path = getLoginPath();
    let data = JSON.parse(fs.readFileSync(path, 'utf8'));
    let passwordHash = require('password-hash');
    let resp;
    let user = data.users.filter(function (user) {
        return user.login === login;
    });

    if (user.length === 1 && user[0].login === login) {
        if (passwordHash.verify(pass, user[0].password)) {
            rpcPassword = crypto.randomBytes(8).toString("hex");
            let config = [
                "rpcuser=zenrpc",
                "rpcpassword=" + rpcPassword,
                "rpcport=8231"
            ];

            fs.writeFileSync(getTmpPath() + "/zen.conf", config.join("\n"), 'utf8');
            /* FIXME: decryption should be done here */
            if (fs.existsSync("./wallets/wallet.dat." + login)) {
                fs.copySync("./wallets/wallet.dat." + login, getTmpPath() + "/wallet.dat");
            }
            startZend();
            loggedIn = true;
            username = user[0].login;
            resp = {
                response: "OK"
            };
        } else {
            loggedIn = false;
            resp = {
                response: "ERR"
            };
        }
    } else {
        loggedIn = false;
        resp = {
            response: "ERR"
        };
    }
    event.sender.send("verify-login-response", JSON.stringify(resp));
});

ipcMain.on("check-login-info", function (event, login, pass) {
    let resp;

    if (loggedIn) {
        resp = {
            response: "OK"
        };
    } else {
        resp = {
            response: "ERR"
        };
    }
    event.sender.send("verify-login-response", JSON.stringify(resp));
});

ipcMain.on("do-logout", function (event) {
    loggedIn = false;
    closeZend();
});

ipcMain.on("exit-from-menu", function (event) {
    app.quit();
});

// ipcMain.on("get-password", function (event, user) {
//     event.returnValue = keytar.getPassword("Arizen", user);
// });
//
// ipcMain.on("set-password", function (event, user, pass) {
//     event.returnValue = keytar.setPassword("Arizen", user, pass);
// });