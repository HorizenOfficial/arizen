// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const BrowserWindow = electron.BrowserWindow;
const {app, Menu, ipcMain, dialog} = require("electron");
const shell = require("electron").shell;
const path = require("path");
const url = require("url");
const os = require("os");
const fs = require("fs-extra");
const passwordHash = require("password-hash");
const crypto = require("crypto");
const bitcoin = require("bitcoinjs-lib");
const bip32utils = require("bip32-utils");
const zencashjs = require("zencashjs");
const sql = require("sql.js");
const request = require("request");
const updater = require("electron-simple-updater");
const QRCode = require("qrcode");

updater.init({checkUpdateOnStart: true, autoDownload: true});
attachUpdaterHandlers();

// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let userInfo = {
    loggedIn: false,
    login: "",
    pass: "",
    walletDb: [],
    dbChanged: false
};

let settings = {
    notifications: 1,
    explorer: "https://explorer.zensystem.io/",
    api: "https://explorer.zensystem.io/insight-api-zen/",
    autorefresh: 180,
    refreshTimeout: 10,
    txHistory: 50
};

const dbStructWallet = "CREATE TABLE wallet (id INTEGER PRIMARY KEY AUTOINCREMENT, pk TEXT, addr TEXT UNIQUE, lastbalance REAL, name TEXT);";
// FIXME: dbStructContacts is unused
const dbStructContacts = "CREATE TABLE contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, addr TEXT UNIQUE, name TEXT, nick TEXT);";
const dbStructSettings = "CREATE TABLE settings (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, value TEXT);";
const dbStructTransactions = "CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, txid TEXT, time INTEGER, address TEXT, vins TEXT, vouts TEXT, amount REAL, block INTEGER);";

function attachUpdaterHandlers() {
    updater.on("update-downloaded", onUpdateDownloaded);

    function onUpdateDownloaded() {
        dialog.showMessageBox({
            type: "info",
            title: "Update is here!",
            message: "Exiting and installing new update ..."
        }, function () {
            // application forces to update itself
            updater.quitAndInstall();
        });
    }
}

function getLoginPath() {
    return getRootConfigPath() + "users.arizen";
}

function getWalletPath() {
    return getRootConfigPath() + "wallets/";
}

function getRootConfigPath() {
    let rootPath = "";
    if (os.platform() === "win32" || os.platform() === "darwin") {
        rootPath = app.getPath("appData") + "/Arizen/";
    } else if (os.platform() === "linux") {
        rootPath = app.getPath("home") + "/.arizen/";
        if (!fs.existsSync(rootPath)) {
            fs.mkdirSync(rootPath);
        }
    } else {
        console.log("Unidentified OS.");
        app.exit(0);
    }
    return rootPath;
}

function storeFile(filename, data) {
    fs.writeFileSync(filename, data, function (err) {
        if (err) {
            return console.log(err);
        }
    });
}

function encryptWallet(login, password, inputBytes) {
    let iv = Buffer.concat([Buffer.from(login, "utf8"), crypto.randomBytes(64)]);
    let salt = crypto.randomBytes(64);
    let key = crypto.pbkdf2Sync(password, salt, 2145, 32, "sha512");
    let cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
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
        outputBytes += decipher.final("binary");
    }
    return outputBytes;
}

function importWalletDat(login, pass, wallet) {
    let walletBytes = fs.readFileSync(wallet, "binary");
    let re = /\x30\x81\xD3\x02\x01\x01\x04\x20(.{32})/gm;
    let privateKeys = walletBytes.match(re);
    privateKeys = privateKeys.map(function (x) {
        x = x.replace("\x30\x81\xD3\x02\x01\x01\x04\x20", "");
        x = Buffer.from(x, "latin1").toString("hex");
        return x;
    });

    let pk;
    let pubKey;
    //Create the database
    let db = new sql.Database();
    // Run a query without reading the results
    db.run(dbStructWallet);

    for (let i = 0; i < privateKeys.length; i += 1) {
        // If not 64 length, probs WIF format
        if (privateKeys[i].length !== 64) {
            pk = zencashjs.address.WIFToPrivKey(privateKeys[i]);
        } else {
            pk = privateKeys[i];
        }
        pubKey = zencashjs.address.privKeyToPubKey(pk, true);
        db.run("INSERT OR IGNORE INTO wallet VALUES (?,?,?,?,?)", [null, pk, zencashjs.address.pubKeyToAddr(pubKey), 0, ""]);
    }

    let data = db.export();
    let walletEncrypted = encryptWallet(login, pass, data);
    storeFile(getWalletPath() + login + ".awd", walletEncrypted);

    userInfo.walletDb = db;
    loadSettings();
    mainWindow.webContents.send("zz-get-wallets");
    loadTransactions(mainWindow.webContents);
}

function importWallet(filename, encrypt) {
    let data;
    if (encrypt === true) {
        fs.copy(filename, getWalletPath() + userInfo.login + ".awd");
        data = decryptWallet(userInfo.login, userInfo.pass);
    } else {
        data = fs.readFileSync(filename);
        userInfo.dbChanged = true;
    }
    userInfo.walletDb = new sql.Database(data);
}

function exportWallet(filename, encrypt) {
    let data = userInfo.walletDb.export();
    if (encrypt === true) {
        data = encryptWallet(userInfo.login, userInfo.pass, data);
    }
    storeFile(filename, data);
}

function generateNewAddress(count, password) {
    let i;
    let seedHex = passwordHash.generate(password, {
        "algorithm": "sha512",
        "saltLength": 32
    }).split("$")[3];

    // chains
    let hdNode = bitcoin.HDNode.fromSeedHex(seedHex);
    let chain = new bip32utils.Chain(hdNode);

    for (i = 0; i < count; i += 1) {
        chain.next();
    }

    // Get private keys from them - return privateKeys
    return chain.getAll().map(function (x) {
        return chain.derive(x).keyPair.toWIF();
    });
}

/* wallet generation from kendricktan */
function generateNewWallet(login, password) {
    let i;
    let pk;
    let pubKey;
    let db = new sql.Database();
    let privateKeys = generateNewAddress(42, password);

    // Run a query without reading the results
    db.run(dbStructWallet);
    for (i = 0; i <= 42; i += 1) {
        pk = zencashjs.address.WIFToPrivKey(privateKeys[i]);
        pubKey = zencashjs.address.privKeyToPubKey(pk, true);
        db.run("INSERT INTO wallet VALUES (?,?,?,?,?)", [null, pk, zencashjs.address.pubKeyToAddr(pubKey), 0, ""]);
    }

    let data = db.export();
    let walletEncrypted = encryptWallet(login, password, data);
    storeFile(getWalletPath() + login + ".awd", walletEncrypted);
}

function getNewAddress(name) {
    let pk;
    let addr;
    let privateKeys = generateNewAddress(1, userInfo.pass);

    pk = zencashjs.address.WIFToPrivKey(privateKeys[0]);
    addr = zencashjs.address.pubKeyToAddr(zencashjs.address.privKeyToPubKey(pk, true));
    userInfo.walletDb.run("INSERT INTO wallet VALUES (?,?,?,?,?)", [null, pk, addr, 0, name]);
    userInfo.dbChanged = true;

    return addr;
}

function loadSettings() {
    let sqlRes = userInfo.walletDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='settings';");
    if (sqlRes.length === 0) {
        userInfo.walletDb.run(dbStructSettings);
        userInfo.walletDb.run("INSERT INTO settings VALUES (?, ?, ?)", [null, "settingsNotifications", settings.notifications.toString(10)]);
        userInfo.walletDb.run("INSERT INTO settings VALUES (?, ?, ?)", [null, "settingsExplorer", settings.explorer]);
        userInfo.walletDb.run("INSERT INTO settings VALUES (?, ?, ?)", [null, "settingsApi", settings.api]);
        userInfo.dbChanged = true;
    }

    sqlRes = userInfo.walletDb.exec("SELECT * FROM settings");
    if (sqlRes[0].values.length === 2) {
        userInfo.walletDb.run("UPDATE settings SET value = ? WHERE name = ?", ["settingsExplorer", settings.explorer]);
        userInfo.walletDb.run("INSERT INTO settings VALUES (?, ?, ?)", [null, "settingsApi", settings.api]);
        userInfo.dbChanged = true;
    }
    sqlRes = userInfo.walletDb.exec("SELECT * FROM settings");
    if (sqlRes[0].values.length !== 6) {
        userInfo.walletDb.run("INSERT INTO settings VALUES (?, ?, ?)", [null, "settingsAutorefresh", settings.autorefresh]);
        userInfo.walletDb.run("INSERT INTO settings VALUES (?, ?, ?)", [null, "settingsRefreshTimeout", settings.refreshTimeout]);
        userInfo.walletDb.run("INSERT INTO settings VALUES (?, ?, ?)", [null, "settingsTxHistory", settings.txHistory]);
    }

    sqlRes = userInfo.walletDb.exec("SELECT * FROM settings WHERE name = 'settingsNotifications'");
    settings.notifications = Number(sqlRes[0].values[0][2]);
    sqlRes = userInfo.walletDb.exec("SELECT * FROM settings WHERE name = 'settingsExplorer'");
    settings.explorer = sqlRes[0].values[0][2];
    sqlRes = userInfo.walletDb.exec("SELECT * FROM settings WHERE name = 'settingsApi'");
    settings.api = sqlRes[0].values[0][2];
    sqlRes = userInfo.walletDb.exec("SELECT * FROM settings WHERE name = 'settingsAutorefresh'");
    settings.autorefresh = sqlRes[0].values[0][2];
    sqlRes = userInfo.walletDb.exec("SELECT * FROM settings WHERE name = 'settingsRefreshTimeout'");
    settings.refreshTimeout = sqlRes[0].values[0][2];
    sqlRes = userInfo.walletDb.exec("SELECT * FROM settings WHERE name = 'settingsTxHistory'");
    settings.txHistory = sqlRes[0].values[0][2];
}

function loadTransactions(webContents) {
    let sqlRes = userInfo.walletDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions';");
    if (sqlRes.length === 0) {
        userInfo.walletDb.run(dbStructTransactions);
        sqlRes = userInfo.walletDb.exec("SELECT addr FROM wallet;");
        sqlRes[0].values.forEach(function(address) {
            request.get(settings.api + "addrs/" + address[0] + "/txs", function (err, res, body) {
                if (err) {
                    console.log("transaction readout failed");
                } else if (res && res.statusCode === 200) {
                    let data = JSON.parse(body);
                    data.items.forEach(function(element) {
                        parseTransactionResponse(JSON.stringify(element), address[0], webContents);
                    }, this);
                }
            });
        }, this);
    }
}

function setDarwin(template) {
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
}

function exportWalletArizen(ext, encrypt) {
    dialog.showSaveDialog({
        title: "Save wallet." + ext,
        filters: [{name: "Wallet", extensions: [ext]}]
    }, function(filename) {
        if (typeof filename !== "undefined" && filename !== "") {
            if (!fs.exists(filename)) {
                dialog.showMessageBox({
                    type: "warning",
                    message: "Do you want to replace file?",
                    buttons: ["Yes", "No"],
                    title: "Replace wallet?"
                }, function (response) {
                    if (response === 0) {
                        exportWallet(filename, encrypt);
                    }
                });
            } else {
                exportWallet(filename, encrypt);
            }
        }
    });
}

function importWalletArizen(ext, encrypted) {
    if (userInfo.loggedIn) {
        dialog.showOpenDialog({
            title: "Import wallet." + ext,
            filters: [{name: "Wallet", extensions: [ext]}]
        }, function(filePaths) {
            if (filePaths) dialog.showMessageBox({
                type: "warning",
                message: "This will replace your actual wallet. Are you sure?",
                buttons: ["Yes", "No"],
                title: "Replace wallet?"
            }, function (response) {
                if (response === 0) {
                    importWallet(filePaths[0], encrypted);
                }
            });
        });
    }
}

function updateMenuAtLogin() {
    const template = [
        {
            label: "File",
            submenu: [
                {
                    label: "Backup ENCRYPTED wallet",
                    click() {
                        exportWalletArizen("awd", true);
                    }
                }, {
                    label: "Backup UNENCRYPTED wallet",
                    click() {
                        exportWalletArizen("uawd", false);
                    }
                }, {
                    type: "separator"
                }, {
                    label: "Import ZEND wallet.dat",
                    click() {
                        if (userInfo.loggedIn) {
                            dialog.showOpenDialog({
                                title: "Import wallet.dat",
                                filters: [{name: "Wallet", extensions: ["dat"]}]
                            }, function (filePaths) {
                                if (filePaths) dialog.showMessageBox({
                                    type: "warning",
                                    message: "This will replace your actual wallet. Are you sure?",
                                    buttons: ["Yes", "No"],
                                    title: "Replace wallet?"
                                }, function (response) {
                                    if (response === 0) {
                                        importWalletDat(userInfo.login, userInfo.pass, filePaths[0]);
                                    }
                                });
                            });
                        }
                    }
                }, {
                    label: "Import UNENCRYPTED Arizen wallet",
                    click() {
                        importWalletArizen("uawd", false);
                    }
                }, {
                    label: "Import ENCRYPTED Arizen wallet",
                    click() {
                        importWalletArizen("awd", true);
                    }
                }, {
                    type: "separator"
                }, {
                    /* FIXME: remove after test - not for production */
                    label: "Force transaction reload",
                    click() {
                        userInfo.walletDb.run("DROP TABLE transactions;");
                        loadTransactions(mainWindow.webContents);
                    }
                }, {
                    type: "separator"
                }, {
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

    setDarwin(template);
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
        }
    ];

    setDarwin(template);
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
    updateMenuAtLogout();
    mainWindow = new BrowserWindow({width: 1050, height: 730, resizable: false, icon: "resources/zen_icon.png"});

    if (fs.existsSync(getLoginPath())) {
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, "login.html"),
            protocol: "file:",
            slashes: true
        }));
    } else {
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, "register.html"),
            protocol: "file:",
            slashes: true
        }));
    }

    // Open the DevTools.
    // FIXME: comment this for release versions!
    // mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on("closed", function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    app.quit();
});

app.on("activate", function () {
    // On macOS it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
        // checkAll();
    }
});

app.on("before-quit", function () {
    console.log("quitting");
    if (true === userInfo.loggedIn && true === userInfo.dbChanged) {
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
    //         mainWindow.close();
    //     }
    // });
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on("write-login-info", function (event, login, pass, wallet) {
    let path = getLoginPath();
    let data;
    //let passHash: { algorithm: string, saltLength: number };
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
    storeFile(path, JSON.stringify(data));

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
                loadSettings();
                loadTransactions(mainWindow.webContents);
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

ipcMain.on("do-logout", function () {
    updateMenuAtLogout();
    if (true === userInfo.dbChanged) {
        userInfo.dbChanged = false;
        exportWallet(getWalletPath() + userInfo.login + ".awd", true);
    }
    userInfo.login = "";
    userInfo.pass = "";
    userInfo.walletDb = [];
    userInfo.loggedIn = false;
});

ipcMain.on("exit-from-menu", function () {
    app.quit();
});

function parseTransactionResponse(transaction, address, webContents) {
    let data = JSON.parse(transaction);
    let inAmount = 0;
    let amount = 0;
    let isSending = 0;
    let vouts = [];
    /* find my address in send transaction */
    data.vin.forEach(function(element) {
        /* my address is sending */
        if (element.addr === address) {
            isSending = 1;
        }
    }, this);
    /* find my address in recv transaction */
    data.vout.forEach(function(element) {
        /* my address is receiving */
        if (element.scriptPubKey.addresses[0] === address) {
            if (isSending === 0) {
                vouts.push(address);
                amount = element.value;
            } else {
                amount = -1 * (data.valueOut - element.value);
            }
        } else {
            /* dont show my address in transaction to */
            vouts.push(element.scriptPubKey.addresses[0]);
        }
    }, this);
    /* we are sending but amount is not set -> address hits 0 */
    if (amount === 0 && isSending === 1)
    {
        amount = -1 * data.valueOut;
    }
    /* find unique input addresses */
    let vins = [...new Set(data.vin.map(item => item.addr))];

    userInfo.walletDb.run("INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?)", [null, data.txid, data.time, address, vins.join(","), vouts.join(","), amount, data.blockheight]);
    userInfo.dbChanged = true;

    if (webContents !== null) {
        let resp = {
            txid: data.txid,
            time: data.time,
            address: address, 
            vins: vins,
            vouts: vouts,
            amount: amount,
            block: data.blockheight
        }
        webContents.send("get-transaction-update", JSON.stringify(resp));
    }
}

function updateBalance(address, oldBalance, event) {
    request.get(settings.api + "addr/" + address, function (err, res, body) {
        if (err) {
            console.log("balance update failed");
            setTimeout(updateBalance, 5000, address, oldBalance, event);
        } else if (res && res.statusCode === 200) {
            let data = JSON.parse(body);
            if (oldBalance !== data.balance) {
                userInfo.walletDb.run("UPDATE wallet SET lastbalance = " + data.balance + " WHERE addr = '" + data.addrStr + "'");
                userInfo.dbChanged = true;
                let sqlRes = userInfo.walletDb.exec("SELECT total(lastbalance) FROM wallet");
                let update = {
                    response: "OK",
                    wallet: data.addrStr,
                    balance: data.balance,
                    total: sqlRes[0].values[0][0]
                };
                event.sender.send("update-wallet-balance", JSON.stringify(update));
                /* update latest transaction */
                request.get(settings.api + "tx/" + data.transactions[0], function (err, res, body) {
                    if (err) {
                        console.log("transaction readout failed");
                    } else if (res && res.statusCode === 200) {
                        parseTransactionResponse(body, address, event.sender);
                    }
                });
            }
        }
    });
}

ipcMain.on("get-wallets", function (event) {
    let resp;
    let sqlRes;

    if (userInfo.loggedIn) {
        sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet ORDER BY lastbalance DESC, id DESC");
        /* update wallet 0.1 if necessary */
        if (sqlRes[0].columns.includes("name") === false) {
            userInfo.walletDb.exec("ALTER TABLE wallet ADD COLUMN name TEXT DEFAULT ''");
            sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet");
        }
        resp = {
            response: "OK",
            wallets: sqlRes[0].values,
            transactions: [],
            total: 0,
            autorefresh: settings.autorefresh
        };
        sqlRes = userInfo.walletDb.exec("SELECT * FROM transactions ORDER BY time DESC LIMIT " + settings.txHistory);
        if (sqlRes.length > 0) {
            resp.transactions = sqlRes[0].values;
        }
        resp.wallets.forEach(function(element) {
            resp.total += element[3];
            updateBalance(element[2], element[3], event);
        }, this);
    } else {
        resp = {
            response: "ERR",
            wallets: [],
            transactions: [],
            total: 0,
            autorefresh: 0
        };
    }

    event.sender.send("get-wallets-response", JSON.stringify(resp));
});

ipcMain.on("refresh-wallet", function (event) {
    let resp;
    let sqlRes;

    if (userInfo.loggedIn) {
        sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet");
        for (let i = 0; i < sqlRes[0].values.length; i += 1) {
            updateBalance(sqlRes[0].values[i][2], sqlRes[0].values[i][3], event);
        }
        resp = {
            response: "OK",
            autorefresh: settings.autorefresh
        }
    } else {
        resp = {
            response: "ERR",
            autorefresh: 0
        }
    }

    event.sender.send("refresh-wallet-response", JSON.stringify(resp));    
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
                msg: "address " + address + " set to " + name,
                addr: address,
                newname: name
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

ipcMain.on("get-wallet-by-name", function (event, name) {
    let resp;
    let sqlRes;

    if (userInfo.loggedIn) {
        sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet WHERE name = '" + name + "'");
        if (sqlRes.length > 0) {
            resp = {
                response: "OK",
                wallets: sqlRes[0].values,
                msg: "found: " + sqlRes.length
            };
        } else {
            resp = {
                response: "ERR",
                msg: "name not found"
            };
        }
    } else {
        resp = {
            response: "ERR",
            msg: "not logged in"
        };
    }
    event.sender.send("get-wallet-by-name-response", JSON.stringify(resp));
});

ipcMain.on("get-transaction", function (event, txId, address) {
    if (userInfo.loggedIn) {
        request.get(settings.api + "tx/" + txId, function (err, res, body) {
            if (err) {
                console.log("transaction readout failed");
            } else if (res && res.statusCode === 200) {
                event.sender.send("get-transaction-update", address, body);
            }
        });
    }
});

ipcMain.on("generate-wallet", function (event, name) {
    let resp;
    let newAddr;

    if (userInfo.loggedIn) {
        newAddr = getNewAddress(name);
        resp = {
            response: "OK",
            msg: newAddr
        };
    } else {
        resp = {
            response: "ERR",
            msg: "not logged in"
        };
    }

    event.sender.send("generate-wallet-response", JSON.stringify(resp));
});

ipcMain.on("get-settings", function (event) {
    let resp;
    let sqlRes;

    if (userInfo.loggedIn) {
        sqlRes = userInfo.walletDb.exec("SELECT * FROM settings");
        if (sqlRes.length > 0) {
            resp = {
                response: "OK",
                settings: sqlRes[0].values
            };
        } else {
            resp = {
                response: "ERR",
                msg: "issue with db"
            };
        }
    } else {
        resp = {
            response: "ERR",
            msg: "not logged in"
        };
    }

    event.sender.send("get-settings-response", JSON.stringify(resp));
});

ipcMain.on("save-settings", function (event, settings) {
    let data = JSON.parse(settings);
    let resp;

    if (userInfo.loggedIn) {
        data.forEach(function(element) {
            userInfo.walletDb.run("UPDATE settings SET value = ? WHERE name = ?", [element.value, element.name]);
        }, this);
        userInfo.dbChanged = true;
        loadSettings();
        resp = {
            response: "OK",
            msg: "saved"
        };
    } else {
        resp = {
            response: "ERR",
            msg: "not logged in"
        };
    }

    event.sender.send("save-settings-response", JSON.stringify(resp));
});

ipcMain.on("show-notification", function (event, title, message, duration) {
    if (settings.notifications === 1) {
        event.sender.send("show-notification-response", title, message, duration);
    } else {
        console.log(title + ": " + message);
    }
});

function checkSendParameters(fromAddress, toAddress, fee, amount){
    let errString = "";
    if (fromAddress.length !== 35) {
        errString += "Bad length of source address!";
        errString += "\n\n";
    }

    if (fromAddress.substring(0, 2) !== "zn") {
        errString += "Bad source address prefix - have to be 'zn'!";
        errString += "\n\n";
    }

    if (toAddress.length !== 35) {
        errString += "Bad length of destination address!";
        errString += "\n\n";
    }

    if (toAddress.substring(0, 2) !== "zn") {
        errString += "Bad destination address prefix - have to be 'zn'!";
        errString += "\n\n";
    }

    if (typeof parseInt(amount, 10) !== "number" || amount === "") {
        errString += "Amount is NOT number!";
        errString += "\n\n";
    }

    if (amount <= 0){
        errString += "Amount has to be greater than zero!";
        errString += "\n\n";
    }

    if (typeof parseInt(fee, 10) !== "number" || fee === ""){
        errString += "Fee is NOT number!";
        errString += "\n\n";
    }

    if (fee < 0){
        errString += "Fee has to be greater or equal zero!";
        errString += "\n\n";
    }

    // fee can be zero, in block can be one transaction with zero fee

    return errString;
}

ipcMain.on("send", function (event, fromAddress, toAddress, fee, amount){
    event.sender.send("show-progress-bar");
    event.sender.send("update-progress-bar", "Checking inputs ...", 5);
    let errString = checkSendParameters(fromAddress, toAddress, fee, amount);
    if (errString !== ""){
        event.sender.send("close-progress-bar");
        dialog.showErrorBox("Parameter check:", errString);
    }else{
        event.sender.send("update-progress-bar", "Preparing data ...", 10);
        // Convert to satoshi
        let amountInSatoshi = Math.round(amount * 100000000);
        let feeInSatoshi = Math.round(fee * 100000000);
        let sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet WHERE addr = '" + fromAddress + "'");
        let privateKey = sqlRes[0].values[0][1];

        // Get previous transactions
        let zenApi = settings.api;
        const prevTxURL = zenApi + "addr/" + fromAddress + "/utxo";
        const infoURL = zenApi + "status?q=getInfo";
        const sendRawTxURL = zenApi + "tx/send";

        // Building our transaction TXOBJ
        // Calculate maximum ZEN satoshis that we have
        let satoshisSoFar = 0;
        let history = [];
        let recipients = [{address: toAddress, satoshis: amountInSatoshi}];

        event.sender.send("update-progress-bar", "Querying transaction history ...", 15);
        request.get(prevTxURL, function (tx_err, tx_resp, tx_body) {
            if (tx_err) {
                event.sender.send("close-progress-bar");
                console.log(tx_err);
                dialog.showErrorBox("tx_err", tx_err);
            } else if (tx_resp && tx_resp.statusCode === 200) {
                let tx_data = JSON.parse(tx_body);
                event.sender.send("update-progress-bar", "Querying information ...", 30);
                request.get(infoURL, function (info_err, info_resp, info_body) {
                    if (info_err) {
                        event.sender.send("close-progress-bar");
                        console.log(info_err);
                        dialog.showErrorBox("info_err", info_err);
                    } else if (info_resp && info_resp.statusCode === 200) {
                        let info_data = JSON.parse(info_body);
                        const blockHeight = info_data.info.blocks - 300;
                        const blockHashURL = zenApi + "block-index/" + blockHeight;

                        // Get block hash
                        event.sender.send("update-progress-bar", "Querying block hashes ...", 45);
                        request.get(blockHashURL, function (bhash_err, bhash_resp, bhash_body) {
                            if (bhash_err) {
                                event.sender.send("close-progress-bar");
                                console.log(bhash_err);
                                dialog.showErrorBox("bhash_err", bhash_err);
                            } else if (bhash_resp && bhash_resp.statusCode === 200) {
                                const blockHash = JSON.parse(bhash_body).blockHash;

                                event.sender.send("update-progress-bar", "Looking for spendable funds ...", 60);
                                // Iterate through each utxo and append it to history
                                for (let i = 0; i < tx_data.length; i++) {
                                    if (tx_data[i].confirmations === 0) {
                                        continue;
                                    }

                                    history = history.concat( {
                                        txid: tx_data[i].txid,
                                        vout: tx_data[i].vout,
                                        scriptPubKey: tx_data[i].scriptPubKey
                                    });

                                    // How many satoshis we have so far
                                    satoshisSoFar = satoshisSoFar + tx_data[i].satoshis;
                                    if (satoshisSoFar >= amountInSatoshi + feeInSatoshi) {
                                        break;
                                    }
                                }

                                // If we don't have enough address - fail and tell it to the user
                                if (satoshisSoFar < amountInSatoshi + feeInSatoshi) {
                                    event.sender.send("close-progress-bar");
                                    console.log("You don't have so many funds!");
                                    dialog.showErrorBox("You don't have so many funds!", "You wanted to send: " +
                                        Number((amountInSatoshi + feeInSatoshi) / 100000000).toFixed(8) + " ZEN, but your balance is only: " +
                                        Number(satoshisSoFar / 100000000).toFixed(8) + " ZEN.");
                                } else {
                                    event.sender.send("update-progress-bar", "Querying information ...", 70);
                                    // If we don't have exact amount - refund remaining to current address
                                    if (satoshisSoFar !== (amountInSatoshi + feeInSatoshi)) {
                                        let refundSatoshis = satoshisSoFar - amountInSatoshi - feeInSatoshi;
                                        recipients = recipients.concat({address: fromAddress, satoshis: refundSatoshis})
                                    }

                                    event.sender.send("update-progress-bar", "Creating transaction ...", 80);
                                    // Create transaction
                                    let txObj = zencashjs.transaction.createRawTx(history, recipients, blockHeight, blockHash);

                                    event.sender.send("update-progress-bar", "Signing transaction ...", 85);
                                    // Sign each history transcation
                                    for (let i = 0; i < history.length; i ++) {
                                        txObj = zencashjs.transaction.signTx(txObj, i, privateKey, true)
                                    }

                                    // Convert it to hex string
                                    event.sender.send("update-progress-bar", "Sending transaction ...", 90);
                                    const txHexString = zencashjs.transaction.serializeTx(txObj);
                                    request.post({url: sendRawTxURL, form: {rawtx: txHexString}}, function(sendtx_err, sendtx_resp, sendtx_body) {
                                        if (sendtx_err) {
                                            event.sender.send("close-progress-bar");
                                            console.log(sendtx_err);
                                            dialog.showErrorBox("sendtx_err", sendtx_err);
                                        } else if(sendtx_resp && sendtx_resp.statusCode === 200) {
                                            const tx_resp_data = JSON.parse(sendtx_body);
                                            event.sender.send("update-progress-bar", "Done!", 100);
                                            event.sender.send("close-progress-bar");
                                            dialog.showMessageBox({
                                                type: "question",
                                                buttons: ["Yes", "No"],
                                                title: "Sucess!",
                                                message: "TXid:\n\n" + tx_resp_data.txid + "\n\nDo you want to open your transaction in explorer?"
                                            }, function (response) {
                                                if (response === 0) {
                                                    electron.shell.openExternal(settings.explorer + "tx/" + tx_resp_data.txid);
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });
    }
    event.sender.send("close-progress-bar");
});

ipcMain.on("open-explorer", function (event, url) {
    event.preventDefault();
    shell.openExternal(url);
});

ipcMain.on("generate-qr-code", function(event, address, amount){
    let qrcode_data = "{ \"symbol\": \"zen\", \"tAddr\": \""+ address +"\", \"amount\": \""+ amount +"\" }";
    QRCode.toDataURL(qrcode_data, { errorCorrectionLevel: "H", scale: 5, color: {dark:"#000000ff", light: "#fefefeff"}}, function(err, url) {
        if(err) {
            console.log(err);
        }
        event.sender.send("render-qr-code", url);
    });
});
