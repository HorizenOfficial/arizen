// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {app, Menu, ipcMain} = require("electron");
const BrowserWindow = electron.BrowserWindow;
const path = require("path");
const url = require("url");
const os = require("os");
const fs = require("fs-extra");
const passwordHash = require("password-hash");
const crypto = require("crypto");
const updater = require("electron-simple-updater");
updater.init({checkUpdateOnStart: true, autoDownload: true,
        url: "https://raw.githubusercontent.com/ZencashOfficial/arizen/master/updates.json"});

// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let loggedIn = false;
let walletDecrypted;

function getLoginPath() {
    return getRootConfigPath() + "login.txt";
}

function getWalletPath() {
    return getRootConfigPath() + "wallets/";
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

function encryptWallet(login, password, inputBytes) {
    let iv = Buffer.concat([Buffer.from(login, "utf8"), crypto.randomBytes(64)]);
    let salt = crypto.randomBytes(64);
    let key = crypto.pbkdf2Sync(password, salt, 2145, 32, "sha512");
    let cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
    let encrypted = Buffer.concat([cipher.update(inputBytes), cipher.final()]);

    return Buffer.concat([iv, salt, cipher.getAuthTag(), encrypted]);
}

function decryptWallet(login, password) {
    let i = login.length;
    let inputBytes = fs.readFileSync(getWalletPath() + "wallet.dat." + login);
    let outputBytes = [];
    let recoveredLogin = inputBytes.slice(0, i).toString("utf8");

    if (login === recoveredLogin)
    {
        let iv = inputBytes.slice(0, i + 64);
        i += 64;
        let salt = inputBytes.slice(i, i + 64);
        i += 64;
        let tag = inputBytes.slice(i, i + 16);
        i += 16;
        let encrypted = inputBytes.slice(i);
        let key = crypto.pbkdf2Sync(password, salt , 2145, 32, "sha512");
        let decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

        decipher.setAuthTag(tag);
        outputBytes = decipher.update(encrypted);
        /* FIXME: handle error */
        outputBytes += decipher.final();
    }

    return outputBytes;
}

function generateNewWallet(login, password) {
    fs.writeFileSync(getWalletPath() + "wallet.dat." + login, encryptWallet(login, password, Buffer.from("TESTING ONLY!", "utf8")));
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

    //win.loadURL("file://" + __dirname + "/index.html");

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
    fs.removeSync(getTmpPath());
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

ipcMain.on("write-login-info", function (event, login, pass, wallet) {
    let path = getLoginPath();
    let data;
    let passHash = passwordHash.generate(pass, {
        "algorithm": "sha256",
        "saltLength": 10
    });

    if (fs.existsSync(getLoginPath())) {
        data = JSON.parse(fs.readFileSync(path, "utf8"));
        data.users.push({
            login: login,
            password: passHash
        });
    } else {
        data = {
            users: [{
                login: login,
                password: passHash
            }]
        };
    }
    fs.writeFileSync(path, JSON.stringify(data), "utf8", function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
    if (!fs.existsSync(getWalletPath())) {
        fs.mkdirSync(getWalletPath());
    }
    if (wallet !== "") {
        if (fs.existsSync(wallet)) {
            let walletBytes = fs.readFileSync(wallet);
            let walletEncrypted = encryptWallet(login, pass, walletBytes);
            fs.writeFileSync(getWalletPath() + "wallet.dat." + login, walletEncrypted, function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });
        }
    } else {
        generateNewWallet(login, pass);
    }
});

ipcMain.on("verify-login-info", function (event, login, pass) {
    let path = getLoginPath();
    let data = JSON.parse(fs.readFileSync(path, 'utf8'));
    let resp;
    let user = data.users.filter(function (user) {
        return user.login === login;
    });

    if (user.length === 1 && user[0].login === login) {
        if (passwordHash.verify(pass, user[0].password)) {
            walletDecrypted = decryptWallet(login, pass);
            if (walletDecrypted.length > 0)
            {
                loggedIn = true;
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
    event.sender.send("check-login-response", JSON.stringify(resp));
});

ipcMain.on("do-logout", function (event) {
    loggedIn = false;
    walletDecrypted = [];
});

ipcMain.on("exit-from-menu", function (event) {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    // if (process.platform !== "darwin") {
    //     app.quit()
    // }
    app.quit()
});

// ipcMain.on("get-password", function (event, user) {
//     event.returnValue = keytar.getPassword("Arizen", user);
// });
//
// ipcMain.on("set-password", function (event, user, pass) {
//     event.returnValue = keytar.setPassword("Arizen", user, pass);
// });