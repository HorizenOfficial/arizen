// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const {app, Menu, ipcMain, dialog} = require("electron");
const BrowserWindow = electron.BrowserWindow;
const path = require("path");
const url = require("url");
const os = require("os");
const fs = require("fs-extra");
const passwordHash = require("password-hash");
const crypto = require("crypto");
const bitcoin = require("bitcoinjs-lib");
const bip32utils = require("bip32-utils");
const zencashjs = require("zencashjs");
const sql = require('sql.js');
const updater = require("electron-simple-updater");
updater.init({
    checkUpdateOnStart: true, autoDownload: true,
    url: "https://raw.githubusercontent.com/ZencashOfficial/arizen/master/updates.json"
});

// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let userInfo = {
    loggedIn: false,
    login: "",
    pass: "",
    walletDb: [],
    dbChanged: false
}

const dbstruct = "CREATE TABLE wallet (id integer, pk text, addr text, lastbalance real, name text);"

function getLoginPath() {
    return getRootConfigPath() + "users.arizen";
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
    let inputBytes = fs.readFileSync(getWalletPath() + login + ".awd");
    let recoveredLogin = inputBytes.slice(0, i).toString("utf8");
    let outputBytes = [];

    if (login === recoveredLogin) {
        let iv = inputBytes.slice(0, i + 64);
        i += 64;
        let salt = inputBytes.slice(i, i + 64);
        i += 64;
        let tag = inputBytes.slice(i, i + 16);
        i += 16;
        let encrypted = inputBytes.slice(i);
        let key = crypto.pbkdf2Sync(password, salt, 2145, 32, "sha512");
        let decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

        decipher.setAuthTag(tag);
        outputBytes = decipher.update(encrypted, "binary", "binary");
        // FIXME: handle error
        outputBytes += decipher.final();
    }
    
    return outputBytes;
}

function importWalletDat(login, pass, wallet) {
    let walletBytes = fs.readFileSync(wallet, "binary");
    let re = /\x30\x81\xD3\x02\x01\x01\x04\x20(.{32})/gm;
    let privateKeys = walletBytes.match(re);
    privateKeys = privateKeys.map(function (x) {
      x = x.replace('\x30\x81\xD3\x02\x01\x01\x04\x20', '');
      x = Buffer.from(x, 'latin1').toString('hex');
      return x;
    });

    let pk;
    let pubKey;
    //Create the database
    let db = new sql.Database();
    // Run a query without reading the results
    db.run(dbstruct);

    for (let i = 0; i < privateKeys.length; i += 1) {
        // If not 64 length, probs WIF format
        if (privateKeys[i].length !== 64) {
            pk = zencashjs.address.WIFToPrivKey(privateKeys[i]);
        } else {
            pk = privateKeys[i];
        }
        pubKey = zencashjs.address.privKeyToPubKey(pk, true);
        db.run("INSERT INTO wallet VALUES (?,?,?,?,?)", [i + 1, pk, zencashjs.address.pubKeyToAddr(pubKey), 0, ""]);
    }

    let data = db.export();
    let walletEncrypted = encryptWallet(login, pass, data);
    fs.writeFileSync(getWalletPath() + login + ".awd", walletEncrypted, function (err) {
        if (err) {
            return console.log(err);
        }
    });
}

function importWallet(filename, encrypt) {
    let data;
    if (encrypt === true) {
        fs.copy(filename, getWalletPath() + userInfo.login + ".awd");
        data = decryptWallet(login, pass);
    } else {
        data = fs.readFileSync(filename);
    }
    userInfo.walletDb = new sql.Database(walletBytes);
}

function exportWallet(filename, encrypt) {
    let data = userInfo.walletDb.export();
    if (encrypt === true) {
        data = encryptWallet(userInfo.login, userInfo.pass, data);
    }
    fs.writeFileSync(filename, data, function (err) {
        if (err) {
            return console.log(err);
        }
    });
}

/* wallet generation from kendricktan */
function generateNewWallet(login, password) {
    let i;
    let seedHex = passwordHash.generate(password, {
        "algorithm": "sha512",
        "saltLength": 32
    }).split("$")[3];

    // chains
    let hdNode = bitcoin.HDNode.fromSeedHex(seedHex);
    let chain = new bip32utils.Chain(hdNode);

    for (i = 0; i < 42; i += 1) {
        chain.next();
    }

    // Get private keys from them
    let privateKeys = chain.getAll().map(function (x) {
        return chain.derive(x).keyPair.toWIF();
    });

    let pk;
    let pubKey;
    let db = new sql.Database();
    // Run a query without reading the results
    db.run(dbstruct);
    for (i = 0; i <= 42; i += 1) {
        pk = zencashjs.address.WIFToPrivKey(privateKeys[i]);
        pubKey = zencashjs.address.privKeyToPubKey(pk, true);
        db.run("INSERT INTO wallet VALUES (?,?,?,?,?)", [i + 1, pk, zencashjs.address.pubKeyToAddr(pubKey), 0, ""]);
    }

    let data = db.export();
    let walletEncrypted = encryptWallet(login, password, data);
    fs.writeFileSync(getWalletPath() + login + ".awd", walletEncrypted, function (err) {
        if (err) {
            return console.log(err);
        }
    });
}

function updateMenuAtLogin()
{
    const template = [
        {
            label: "File",
            submenu: [
                {
                    label: "Backup encrypted wallet",
                    click() {
                        dialog.showSaveDialog({title: "Save wallet.awd", filters: [{name: 'Wallet', extensions: ['awd']}]}, function (filename) {
                            if (typeof filename != "undefined" && filename !== ""){
                                if (!fs.exists(filename)) {
                                     dialog.showMessageBox({
                                        type: "warning",
                                        message: "Do you want to replace file?",
                                        buttons: ["Yes", "No"],
                                        title:"Replace wallet?"}, function (response) {
                                        if (response == 0) {
                                            exportWallet(filename, true);
                                        }                                
                                    });
                                } else {
                                    exportWallet(filename, true);
                                }
                            }
                        });
                    }
                },{
                    label: "Backup unencrypted wallet",
                    click() {
                        dialog.showSaveDialog({title: "Save wallet.uawd", filters: [{name: 'Wallet', extensions: ['uawd']}]}, function (filename) {
                            if (typeof filename != "undefined" && filename !== ""){
                                if (!fs.exists(filename)) {
                                     dialog.showMessageBox({
                                        type: "warning",
                                        message: "Do you want to replace file?",
                                        buttons: ["Yes", "No"],
                                        title:"Replace wallet?"}, function (response) {
                                        if (response == 0) {
                                            exportWallet(filename, false);
                                        }                                
                                    });
                                } else {
                                    exportWallet(filename, false);
                                }
                            }
                        });
                    }
                },{
                    type: "separator"
                },{
                    label: "Import ZEND wallet",
                    click() {
                        if (userInfo.loggedIn) {
                            dialog.showOpenDialog({title: "Import wallet.dat", filters: [{name: 'Wallet', extensions: ['dat']}]}, function (filePaths) {
                                if (filePaths) dialog.showMessageBox({
                                    type: "warning",
                                    message: "This will replace your actual wallet. Are you sure?",
                                    buttons: ["Yes", "No"],
                                    title:"Replace wallet?"}, function (response) {
                                        if (response == 0) {
                                            importWalletDat(userInfo.login, userInfo.pass, filePaths[0]);
                                        }
                                    })
                            });
                        }
                    }
                },{
                    label: "Import UNENCRYPTED Arizen wallet",
                    click() {
                        if (userInfo.loggedIn) {
                            dialog.showOpenDialog({title: "Import wallet.uawd", filters: [{name: 'Wallet', extensions: ['uawd']}]}, function (filePaths) {
                                if (filePaths) dialog.showMessageBox({
                                    type: "warning",
                                    message: "This will replace your actual wallet. Are you sure?",
                                    buttons: ["Yes", "No"],
                                    title:"Replace wallet?"}, function (response) {
                                        if (response == 0) {
                                            importWallet(filePaths[0], false);
                                        }
                                    })
                            });
                        }
                    }
                },{
                    label: "Import ENCRYPTED Arizen wallet",
                    click() {
                        if (userInfo.loggedIn) {
                            dialog.showOpenDialog({title: "Import wallet.awd", filters: [{name: 'Wallet', extensions: ['awd']}]}, function (filePaths) {
                                if (filePaths) dialog.showMessageBox({
                                    type: "warning",
                                    message: "This will replace your actual wallet. Are you sure?",
                                    buttons: ["Yes", "No"],
                                    title:"Replace wallet?"}, function (response) {
                                        if (response == 0) {
                                            importWallet(filePaths[0], true);
                                        }
                                    })
                            });
                        }
                    }
                },{
                    type: "separator"
                },{
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
}

function updateMenuAtLogout() {
    const template = [
        {
            label: "File",
            submenu: [
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
}

function createWindow() {
    updateMenuAtLogout();
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
    // FIXME: comment this for release versions!
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
    
    if (true === userInfo.loggedIn && true === userInfo.dbChanged)
    {
        userInfo.dbChanged = false;
        exportWallet(getWalletPath() + userInfo.login + ".awd", true);
    }
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
        "algorithm": "sha512",
        "saltLength": 32
    });

    if (fs.existsSync(path)) {
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
    fs.writeFileSync(path, JSON.stringify(data), function (err) {
        if (err) {
            return console.log(err);
        }
    });

    path = getWalletPath();
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    if (wallet !== "") {
        if (fs.existsSync(wallet)) {
            importWalletDat(login, pass, wallet);
        }
    } else {
        generateNewWallet(login, pass);
    }
});

ipcMain.on("verify-login-info", function (event, login, pass) {
    let path = getLoginPath();
    let data = JSON.parse(fs.readFileSync(path, "utf8"));
    let user = data.users.filter(function (user) {
        return user.login === login;
    });
    let resp = {
        response: "ERR"
    };

    if (user.length === 1 && user[0].login === login) {
        if (passwordHash.verify(pass, user[0].password)) {
            let walletBytes = decryptWallet(login, pass);
            if (walletBytes.length > 0) {
                userInfo.loggedIn = true;
                userInfo.login = login;
                userInfo.pass = pass;
                userInfo.walletDb = new sql.Database(walletBytes);
                updateMenuAtLogin();
                resp = {
                    response: "OK",
                    user: login
                };
            }
        }
    }
    event.sender.send("verify-login-response", JSON.stringify(resp));
});

ipcMain.on("check-login-info", function (event) {
    let resp;

    if (userInfo.loggedIn) {
        resp = {
            response: "OK",
            user: userInfo.login
        };
    } else {
        resp = {
            response: "ERR",
            user: ""
        };
    }
    event.sender.send("check-login-response", JSON.stringify(resp));
});

ipcMain.on("do-logout", function (event) {
    updateMenuAtLogout();
    if (true === userInfo.dbChanged)
    {
        userInfo.dbChanged = false;
        exportWallet(getWalletPath() + userInfo.login + ".awd", true);
    }
    userInfo.login = "";
    userInfo.pass = "";
    userInfo.walletDb = [];
    userInfo.loggedIn = false;
    
});

ipcMain.on("exit-from-menu", function (event) {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit()
    }
});

ipcMain.on("get-wallets", function (event) {
    let resp;
    let sqlRes;

    if (userInfo.loggedIn) {
        sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet");
        if (sqlRes[0].columns.includes("name") === false) {
            userInfo.walletDb.exec("ALTER TABLE wallet ADD COLUMN name text DEFAULT ''")
            sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet");
        }
        resp = {
            response: "OK",
            wallets: sqlRes[0].values,
            total: 0
        };
        for (let i = 0; i < resp.wallets.length; i += 1) {
            resp.total += resp.wallets[i][3];
        }
    } else {
        resp = {
            response: "ERR",
            wallets: [],
            total: 0
        };
    }

    event.sender.send("get-wallets-response", JSON.stringify(resp));
});

ipcMain.on("rename-wallet", function (event, address, name) {
    let resp;
    let sqlRes;

    if (userInfo.loggedIn) {
        sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet WHERE addr = '" + address + "'");
        if (sqlRes.length > 0) {
            userInfo.walletDb.exec("UPDATE wallet SET name = '" + name + "' WHERE addr = '" + address + "'");
            userInfo.dbChanged = true;
            resp = {
                response: "OK",
                msg: "address " + address + " set to " + name
            };
        } else {
            resp = {
                response: "ERR",
                msg: "address not found"
            };
        }
    } else {
        resp = {
            response: "ERR",
            msg: "not logged in"
        };
    }
    event.sender.send("rename-wallet-response", JSON.stringify(resp));
});