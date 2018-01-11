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
const fetch = require("node-fetch");
const {List} = require("immutable");
const {translate} = require("./util.js");
const {DateTime} = require("luxon");

// Press F12 to open the DevTools. See https://github.com/sindresorhus/electron-debug.
require("electron-debug")();

// Uncomment if you want to run in production
// process.env.NODE_ENV !== "production"

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

const defaultSettings = {
    notifications: 1,
    explorerUrl: "https://explorer.zensystem.io",
    apiUrls: [
        "https://explorer.zensystem.io/insight-api-zen",
        "http://explorer.zenmine.pro/insight-api-zen"
    ],
    txHistory: 50,
    fiatCurrency: "USD",
    lang: "en"
};
let settings = defaultSettings;
let langDict;

const dbStructWallet = "CREATE TABLE wallet (id INTEGER PRIMARY KEY AUTOINCREMENT, pk TEXT, addr TEXT UNIQUE, lastbalance REAL, name TEXT);";
// FIXME: dbStructContacts is unused
const dbStructContacts = "CREATE TABLE contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, addr TEXT UNIQUE, name TEXT, nick TEXT);";
const dbStructSettings = "CREATE TABLE settings (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, value TEXT);";
const dbStructTransactions = "CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, txid TEXT, time INTEGER, address TEXT, vins TEXT, vouts TEXT, amount REAL, block INTEGER);";

function tr(key, defaultVal) {
    return (settings && settings.lang) ? translate(langDict, key, defaultVal) : defaultVal;
}

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

function decryptWallet(login, password, path) {
    let i = Buffer.byteLength(login);
    let inputBytes = fs.readFileSync(path);
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
        try {
            outputBytes += decipher.final("binary");
        } catch (err) {
            /*
             * Let's hope node.js crypto won't change error messages.
             * https://github.com/nodejs/node/blob/ee76f3153b51c60c74e7e4b0882a99f3a3745294/src/node_crypto.cc#L3705
             * https://github.com/nodejs/node/blob/ee76f3153b51c60c74e7e4b0882a99f3a3745294/src/node_crypto.cc#L312
             */
            if (err.message.match(/Unsupported state/)) {
                /*
                 * User should be notified that wallet couldn't be decrypted because of an invalid
                 * password or because the wallet file is corrupted.
                 */
                outputBytes = [];
            } else {
                // FIXME: handle other errors
                throw err;
            }
        }
    }
    return outputBytes;
}

function importWallet(filename, encrypt) {
    let data;
    if (encrypt === true) {
        data = decryptWallet(userInfo.login, userInfo.pass, filename);
    } else {
        data = fs.readFileSync(filename);
    }

    if (data.length > 0)
    {
        if (encrypt) {
            fs.copy(filename, getWalletPath() + userInfo.login + ".awd");
        }
        userInfo.dbChanged = true;
        userInfo.walletDb = new sql.Database(data);
        mainWindow.webContents.send("call-get-wallets");
        mainWindow.webContents.send("show-notification-response", "Import", tr("login.walletImported","Wallet imported succesfully"), 3);
    } else {
        dialog.showErrorBox(tr("login.walletImportFailed", "Import failed"), tr("login.dataImportFailed","Data import failed, possible reason is wrong credentials"));
    }
}

function exportWallet(filename, encrypt) {
    let data = userInfo.walletDb.export();
    if (encrypt === true) {
        data = encryptWallet(userInfo.login, userInfo.pass, data);
    }
    storeFile(filename, data);
}

function saveWallet() {
    const walletPath = getWalletPath() + userInfo.login + ".awd";

    if (fs.existsSync(walletPath)) {
        const backupDir = getWalletPath() + "backups";
        if (!fs.existsSync(backupDir))
            fs.mkdirSync(backupDir);
        const timestamp = DateTime.local().toFormat("yyyyLLddHHmmss");
        const backupPath = backupDir + "/" + userInfo.login + "-" + timestamp + ".awd";
        //fs.copyFileSync(walletPath, backupPath);
        // piece of shit node.js ecosystem, why the fuck do we have to deal with fs-extra crap here?
        fs.copySync(walletPath, backupPath);
    }

    exportWallet(walletPath, true);
    userInfo.dbChanged = false;
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
    db.run(dbStructTransactions);
    db.run(dbStructSettings);
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
    saveWallet();

    return { addr: addr, name: name, lastbalance: 0, pk: pk, wif: privateKeys[0]};
}

function tableExists(table) {
    return sqlSelectColumns(`select count(*) from sqlite_master where type = 'table' and name = '${table}'`)[0][0] === 1;
}

function loadSettings() {
    /* Remove settings row from settings table. Old versions chceks row count in
     * the table and inserts missing settings if the count isn't 6. By inserting
     * another setting we fucked up its fucked up upgrade logic. This only
     * happens in old versions after new version (f422bfff) run. */
    if (tableExists("settings"))
        sqlRun("delete from settings where name = 'settings'");

    /* In future we'll ditch SQLite and use encrypted JSONs for storage. For now
     * store settings in temporary table "new_settings". */
    if (!tableExists("new_settings"))
        sqlRun("create table new_settings (name text unique, value text)");

    const b64settings = sqlSelectColumns("select value from new_settings where name = 'settings'");
    if (b64settings.length === 0)
        return defaultSettings;

    /* Later we'll want to merge user settings with default settings. */
    return JSON.parse(Buffer.from(b64settings[0][0], "base64").toString("ascii"));
}

function saveSettings(settings) {
    const b64settings = Buffer.from(JSON.stringify(settings)).toString("base64");
    sqlRun("insert or replace into new_settings (name, value) values ('settings', ?)", [b64settings]);
    saveWallet();
}

function upgradeDb() {
    // expects DB to be prefilled with addresses
    let addr = sqlSelectObjects("select * from wallet limit 1")[0];
    if (!("name" in addr))
        sqlRun("ALTER TABLE wallet ADD COLUMN name TEXT DEFAULT ''");
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

function updateMenuForDarwin(template) {
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

function createEditSubmenu() {
    return [
        {
            label: tr("menu.editSubmenu.undo", "Undo"),
            accelerator: "CmdOrCtrl+Z",
            selector: "undo:"
        },
        {
            label: tr("menu.editSubmenu.redo", "Redo"),
            accelerator: "Shift+CmdOrCtrl+Z",
            selector: "redo:"
        },
        { type: "separator" },
        {
            label: tr("menu.editSubmenu.cut", "Cut"),
            accelerator: "CmdOrCtrl+X",
            selector: "cut:"
        },
        {
            label: tr("menu.editSubmenu.copy", "Copy"),
            accelerator: "CmdOrCtrl+C",
            selector: "copy:"
        },
        {
            label: tr("menu.editSubmenu.paste", "Paste"),
            accelerator: "CmdOrCtrl+V",
            selector: "paste:"
        },
        {
            label: tr("menu.editSubmenu.selectAll", "Select All"),
            accelerator: "CmdOrCtrl+A",
            selector: "selectAll:"
        }
    ];
}

function updateMenuAtLogin(langData) {
    const template = [
        {
            label: tr("menu.file", "File"),
            submenu: [
                {
                    label: tr("menu.backupEncrypted", "Backup ENCRYPTED wallet"),
                    click() {
                        exportWalletArizen("awd", true);
                    }
                },
                {
                    label: tr("menu.backupUnencrypted", "Backup UNENCRYPTED wallet"),
                    click() {
                        exportWalletArizen("uawd", false);
                    }
                },
                { type: "separator" },
                {
                    label: tr("menu.importEncrypted", "Import ENCRYPTED Arizen wallet"),
                    click() {
                        importWalletArizen("awd", true);
                    }
                },
                {
                    label: tr("menu.importUnencrypted", "Import UNENCRYPTED Arizen wallet"),
                    click() {
                        importWalletArizen("uawd", false);
                    }
                },
                { type: "separator" },
                {
                    label: tr("menu.exportPrivateKeys", "Export private keys"),
                    click() { exportPKs() }
                },
                {
                    label: tr("menu.importPrivateKeys", "Import private keys"),
                    click() { importPKs() }
                },
                { type: "separator" },
                {
                    label: tr("menu.exit", "Exit"),
                    click() {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: tr("menu.edit", "Edit"),
            submenu: createEditSubmenu()
        }
    ];

    updateMenuForDarwin(template);
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function updateMenuAtLogout() {
    const template = [
        {
            label: tr("menu.file", "File"),
            submenu: [
                {
                    label: tr("menu.exit", "Exit"),
                    click() {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: tr("menu.edit", "Edit"),
            submenu: createEditSubmenu()
        }
    ];
    updateMenuForDarwin(template);
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
    updateMenuAtLogout();
    mainWindow = new BrowserWindow({width: 1000, height: 730, resizable: true, icon: "resources/zen_icon.png"});


    if (fs.existsSync(getWalletPath())) {
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, "login.html"),
            protocol: "file:",
            slashes: true
        }));
    } else {
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, "create_wallet.html"),
            protocol: "file:",
            slashes: true
        }));
    }

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
    if (true === userInfo.loggedIn && true === userInfo.dbChanged)
        saveWallet();
});

ipcMain.on("set-lang", function (event, lang) {
    langDict = require("./lang/lang_" + lang + ".json");
    updateMenuAtLogin();
});

ipcMain.on("write-login-info", function (event, data) {
    let inputs = JSON.parse(data);
    let resp = {
        response: "ERR",
        msg: ""
    };
    let path = getWalletPath();

    /* create wallet path if necessary */
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }

    path += inputs.username + ".awd";
    /* check if user exists */
    if (!fs.existsSync(path))
    {
        if (inputs.walletPath !== "") {
            if (fs.existsSync(inputs.walletPath)) {
                let walletBytes = [];
                if (inputs.encrypted) {
                    walletBytes = decryptWallet(inputs.olduser, inputs.oldpass, inputs.walletPath);
                    resp.msg = "Wallet decrypt failed";
                } else {
                    walletBytes = fs.readFileSync(inputs.walletPath);
                    resp.msg = "Wallet read failed";
                }
                if (walletBytes.length > 0) {
                    let db = new sql.Database(walletBytes);
                    let walletEncrypted = encryptWallet(inputs.username, inputs.password, db.export());
                    storeFile(path, walletEncrypted);
                    resp.response = "OK";
                    resp.msg = "";
                }
            } else {
                resp.msg = "Original file is missing";
            }
        } else {
            generateNewWallet(inputs.username, inputs.password);
            resp.response = "OK";
        }
    } else {
        resp.msg = "User is already registered";
    }
    event.sender.send("write-login-response", JSON.stringify(resp));
});

ipcMain.on("verify-login-info", function (event, login, pass) {
    let resp = {
        response: "ERR"
    };
    let path = getWalletPath() + login + ".awd";

    if (fs.existsSync(path)) {
        let walletBytes = decryptWallet(login, pass, path);
        if (walletBytes.length > 0) {
            userInfo.loggedIn = true;
            userInfo.login = login;
            userInfo.pass = pass;
            userInfo.walletDb = new sql.Database(walletBytes);
            upgradeDb();
            settings = loadSettings();
            updateMenuAtLogin();
            resp = {
                response: "OK",
                user: login
            };
        }
    }

    event.sender.send("verify-login-response", JSON.stringify(resp));
});

ipcMain.on("check-login-info", function (event) {
    let resp = {
        response: "ERR",
        user: ""
    };

    if (userInfo.loggedIn) {
        resp.response= "OK";
        resp.user = userInfo.login;
    }
    event.sender.send("check-login-response", JSON.stringify(resp));
});

ipcMain.on("do-logout", function () {
    updateMenuAtLogout();
    if (true === userInfo.dbChanged)
        saveWallet();
    userInfo.login = "";
    userInfo.pass = "";
    userInfo.walletDb = [];
    userInfo.loggedIn = false;
});

ipcMain.on("exit-from-menu", function () {
    app.quit();
});

function sqlResultToObjectArray(res) {
    return res[0].values.map(columns => {
        const obj = {};
        for (let i = 0; i < columns.length; i++)
            obj[res[0].columns[i]] = columns[i];
        return obj;
    });
}

function sqlSelect(sql) {
    let result = userInfo.walletDb.exec(sql);
    if (!result) // XXX what exactly happens on error?
        throw new Error(`SQL query failed\n  Query: ${sql}`);
    if (!result.length)
        result[0] = { values: [] };
    return result;
}

function sqlSelectColumns(sql) {
    return sqlSelect(sql)[0].values;
}

function sqlSelectObjects(sql) {
    return sqlResultToObjectArray(sqlSelect(sql));
}

function sqlRun(sql, args) {
    const result = userInfo.walletDb.run(sql, args);
    userInfo.dbChanged = true;
    return result;
}

function fetchJson(url) {
    // console.log("GET " + url);
    return fetch(url).then(resp => {
        // console.log(`GET ${url} done, status: ${resp.status} ${resp.statusText}`);
        if (!resp.ok)
            throw new Error(`HTTP GET status: ${resp.status} ${resp.statusText}, URL: ${url}`);
        return resp.json()
    });
}

function fetchApi(path) {
    const urls = settings.apiUrls;
    let errors = [];
    const fetchApiFrom = (i) => {
        if (i < urls.length)
            return fetchJson(urls[i] + '/' + path).catch(err => {
                console.log(`ERROR fetching from: ${urls[i]}: `, err);
                errors.push(err);
                return fetchApiFrom(i + 1);
            });
        else
            return Promise.reject(errors);
    };
    return fetchApiFrom(0);
}

// TODO 1: better name
// TODO 2: use async
function mapSync(seq, asyncFunc) {
    let results = [];
    return seq.reduce(
            (promise, item) => promise.then(() =>
                asyncFunc(item)
                    .then(r => results.push(r))
                    .catch(() => promise) // skip this item
            ),
            Promise.resolve())
        .then(() => results);
}

function fetchTransactions(txIds, myAddrs) {
    return mapSync(txIds, txId => fetchApi("tx/" + txId)).then(txInfos => {
        // TODO
        //txInfos.sort(tx => tx.blockheight)
        const myAddrSet = new Set(myAddrs);

        return txInfos.map(info => {
            let txBalance = 0;
            const vins = [];
            const vouts = [];

            // Address field in transaction rows is meaningless. Pick something sane.
            let firstMyAddr;

            for (const vout of info.vout) {
                if (!vout.scriptPubKey) // XXX can it be something else?
                    continue;
                let balanceAccounted = false;
                for (const addr of vout.scriptPubKey.addresses) {
                    if (!balanceAccounted && myAddrSet.has(addr)) {
                        balanceAccounted = true;
                        txBalance += parseFloat(vout.value);
                        if (!firstMyAddr)
                            firstMyAddr = addr;
                    }
                    if (!vouts.includes(addr))
                        vouts.push(addr);
                }
            }

            for (const vin of info.vin) {
                const addr = vin.addr;
                if (myAddrSet.has(addr)) {
                    txBalance -= parseFloat(vin.value);
                    if (!firstMyAddr)
                        firstMyAddr = addr;
                }
                if (!vins.includes(addr))
                    vins.push(addr);
            }

            const tx = {
                txid: info.txid,
                time: info.blocktime,
                address: firstMyAddr,
                vins: vins.join(','),
                vouts: vouts.join(','),
                amount: txBalance,
                block: info.blockheight
            };
            return tx;
        });
    });
}

function fetchBlockchainChanges(addrObjs, knownTxIds) {
    return mapSync(addrObjs, obj => fetchApi("addr/" + obj.addr).then(info => [obj, info])).then(results => {
        const result = {
            changedAddrs: [],
            newTxs: []
        };
        const txIdSet = new Set();

        for (const [obj, info] of results) {
            if (obj.lastbalance !== info.balance) {
                obj.balanceDiff = info.balance - (obj.lastbalance || 0);
                obj.lastbalance = info.balance;
                result.changedAddrs.push(obj);
            }
            info.transactions.forEach(txId => txIdSet.add(txId));
        }

        knownTxIds.forEach(txId => txIdSet.delete(txId));
        return fetchTransactions([...txIdSet], addrObjs.map(obj => obj.addr))
            .then(newTxs => {
                result.newTxs = List(newTxs).sortBy(tx => tx.block).toArray();
                return result;
            });
	});
}

function updateBlockchainView(webContents) {
    const addrObjs = sqlSelectObjects('SELECT addr, name, lastbalance FROM wallet');
    const knownTxIds = sqlSelectColumns('SELECT DISTINCT txid FROM transactions').map(row => row[0]);
    let totalBalance = addrObjs.filter(obj => obj.lastbalance).reduce((sum, a) => sum + a.lastbalance, 0);

    fetchBlockchainChanges(addrObjs, knownTxIds).then(result => {
        for (const addrObj of result.changedAddrs) {
            sqlRun('UPDATE wallet SET lastbalance = ? WHERE addr = ?', [addrObj.lastbalance, addrObj.addr]);
            totalBalance += addrObj.balanceDiff;
            webContents.send('update-wallet-balance', JSON.stringify({
                response: 'OK',
                addrObj: addrObj,
                diff: addrObj.balanceDiff,
                total: totalBalance
            }));
        }

        // Why here ? In case balance is unchanged the 'update-wallet-balance' is never sent, but the Zen/Fiat balance will change.
        webContents.send('send-refreshed-wallet-balance', totalBalance);

        for (const tx of result.newTxs) {
            if (tx.block >= 0) {
                sqlRun('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?)',
                    [null, tx.txid, tx.time, tx.address, tx.vins, tx.vouts, tx.amount, tx.block]);
            }
            webContents.send('get-transaction-update', JSON.stringify(tx));
        }
    })
	.catch(err => {
        console.log('Failed to fetch blockchain changes: ', err);
    });
}


function exportPKs() {
    function exportToFile(filename, overwrite = false) {
        fs.open(filename, 'w', 0o600, (err, fd) => {
            if (err)
                console.error(`Couldn't open "${filename}" for writing: `, err);
            else {
                const keys = sqlSelectObjects("select pk, addr from wallet");
                for (let k of keys)
                    fs.write(fd, k.pk + " " + k.addr + "\n");
            }
        });
    }

    dialog.showSaveDialog({
        title: "Choose file for private keys",
        defaultPath: "arizen-private-keys.txt"
    }, filename => {
        if (filename)
            exportToFile(filename);
    });
}

function importPKs() {
    function importFromFile(filename) {
        let i = 1;
        fs.readFileSync(filename).toString().split('\n').filter(x => x).forEach(line => {
            const matches = line.match(/^\w+/);
            if (!matches)
                console.log(`Invalid line ${i} in private keys file "${filename}"`);
            else {
                const pk = matches[0];
                try {
                    const pub = zencashjs.address.privKeyToPubKey(pk, true);
                    const addr = zencashjs.address.pubKeyToAddr(pub);
                    sqlRun("insert or ignore into wallet (pk, addr) values (?, ?)", [pk, addr]);
                } catch(err) {
                    console.log(`Invalid private key on line ${i} in private keys file "${filename}": `, err);
                }
            }
            i++;
        });
    }

    dialog.showOpenDialog({
        title: "Choose file with private keys"
    }, filenames => {
        if (filenames) {
            for (let f of filenames)
                importFromFile(f);
            // TODO: save only if at least one key was inserted
            saveWallet();
            updateBlockchainView(mainWindow.webContents);
        }
    });
}

ipcMain.on("get-wallets", function (event) {
    if (!userInfo.loggedIn)
        return;
    const resp = {};
    resp.response = 'OK';
    resp.autorefresh = settings.autorefresh;
    resp.wallets = sqlSelectObjects('SELECT * FROM wallet ORDER BY lastbalance DESC, id DESC');
    resp.transactions = sqlSelectObjects('SELECT * FROM transactions ORDER BY time DESC LIMIT ' + settings.txHistory);
    resp.total =  resp.wallets.reduce((sum, a) => sum + a.lastbalance, 0);

    event.sender.send("get-wallets-response", JSON.stringify(resp));
    event.sender.send("settings", JSON.stringify(settings));
    updateBlockchainView(event.sender);
});

ipcMain.on("refresh-wallet", function (event) {
    let resp = { response: 'ERR' };

    if (userInfo.loggedIn) {
        updateBlockchainView(event.sender);
        resp.response = "OK";
        resp.autorefresh = settings.autorefresh;
    }

    event.sender.send("refresh-wallet-response", JSON.stringify(resp));
});

ipcMain.on("rename-wallet", function (event, address, name) {
    let sqlRes;
    let resp = {
        response: "ERR",
        msg: "not logged in"
    };

    if (userInfo.loggedIn) {
        sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet WHERE addr = '" + address + "'");
        if (sqlRes.length > 0) {
            userInfo.walletDb.exec("UPDATE wallet SET name = '" + name + "' WHERE addr = '" + address + "'");
            saveWallet();
            resp = {
                response: "OK",
                msg: "address " + address + " set to " + name,
                addr: address,
                newname: name
            };
        } else {
            resp.msg = "address not found";
        }
    }
    event.sender.send("rename-wallet-response", JSON.stringify(resp));
});

ipcMain.on("get-wallet-by-name", function (event, name) {
    let sqlRes;
    let resp = {
        response: "ERR",
        msg: "not logged in"
    };

    if (userInfo.loggedIn) {
        sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet WHERE name = '" + name + "'");
        if (sqlRes.length > 0) {
            resp = {
                response: "OK",
                wallets: sqlRes[0].values,
                msg: "found: " + sqlRes.length
            };
        } else {
            resp.msg = "name not found";
        }
    }
    event.sender.send("get-wallet-by-name-response", JSON.stringify(resp));
});

ipcMain.on("generate-wallet", function (event, name) {
    let resp = {
        response: "ERR",
        msg: "not logged in"
    };

    if (userInfo.loggedIn) {
        resp.response = "OK";
        resp.addr = getNewAddress(name);
    }

    event.sender.send("generate-wallet-response", JSON.stringify(resp));
});

ipcMain.on("save-settings", function (event, newSettingsStr) {
    if (!userInfo.loggedIn)
        return;
    const newSettings = JSON.parse(newSettingsStr);
    saveSettings(newSettings);
    settings = newSettings;
    event.sender.send("save-settings-response", JSON.stringify({response: "OK"}));
    event.sender.send("settings", newSettingsStr);
});

ipcMain.on("show-notification", function (event, title, message, duration) {
    if (settings.notifications === 1) {
        event.sender.send("show-notification-response", title, message, duration);
    } else {
        console.log(title + ": " + message);
    }
});

function checkSendParameters(fromAddresses, toAddresses, fee) {
    let errors = [];

    for (const fromAddress of fromAddresses) {
        if (fromAddress.length !== 35) {
            errors.push(tr("wallet.tabWithdraw.messages.fromAddressBadLength", "Bad length of the source address!"));
        }

        if (fromAddress.substring(0, 2) !== "zn") {
            errors.push(tr("wallet.tabWithdraw.messages.fromAddressBadPrefix", "Bad source address prefix - it has to be 'zn'!"));
        }
    }

    for (const toAddress of toAddresses) {
        if (toAddress.length !== 35) {
            errors.push(tr("wallet.tabWithdraw.messages.toAddressBadLength", "Bad length of the destination address!"));
        }

        if (toAddress.substring(0, 2) !== "zn") {
            errors.push(tr("wallet.tabWithdraw.messages.toAddressBadPrefix", "Bad destination address prefix - it has to be 'zn'!"));
        }
    }

    if (typeof parseInt(fee, 10) !== "number" || fee === "") {
        errors.push(tr("wallet.tabWithdraw.messages.feeNotNumber", "Fee is NOT a number!"));
    }

    // fee can be zero, in block can be few transactions with zero fee
    if (fee < 0) {
        errors.push(tr("wallet.tabWithdraw.messages.feeIsNegative", "Fee has to be greater than or equal to zero!"));
    }

    return errors;
}

function checkStandardSendParameters(fromAddress, toAddress, fee, amount) {
    let errors = checkSendParameters([fromAddress], [toAddress], fee);

    if (typeof parseInt(amount, 10) !== "number" || amount === "") {
        errors.push(tr("wallet.tabWithdraw.messages.amountNotNumber", "Amount is NOT a number"));
    }

    if (amount <= 0) {
        errors.push(tr("wallet.tabWithdraw.messages.amountIsZero", "Amount has to be greater than zero!"));
    }

    return errors;
}

function checkSweepSendParameters(fromAddresses, toAddress, fee, thresholdLimit) {
    let errors = checkSendParameters(fromAddresses, [toAddress], fee);

    if (thresholdLimit < 0) {
        errors.push(tr("wallet.tabWithdraw.messages.amountIsZero", "Threshold limit has to be greater than or equal to zero!"));
    }

    return errors;
}

ipcMain.on("send", function (event, fromAddress, toAddress, fee, amount){
    let paramErrors = checkStandardSendParameters(fromAddress, toAddress, fee, amount);
    if (paramErrors.length) {
        // TODO: Come up with better message. For now, just make a HTML out of it.
        const errString = paramErrors.join("<br/>\n\n");
        event.sender.send("send-finish", "error", errString);
    } else {
        // Convert to satoshi
        let amountInSatoshi = Math.round(amount * 100000000);
        let feeInSatoshi = Math.round(fee * 100000000);
        let sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet WHERE addr = '" + fromAddress + "'");
		if (!sqlRes.length) {
			event.sender.send("send-finish", "error",  tr("wallet.tabWithdraw.messages.unknownAddress","Source address is not in your wallet!"));
			return;
        }
        if (sqlRes[0].values[0][3] < (parseFloat(amount) + parseFloat(fee))) {
			event.sender.send("send-finish", "error", tr("wallet.tabWithdraw.messages.insufficientFundsSourceAddr", "Insufficient funds on source address!"));
			return;
        }
        let privateKey = sqlRes[0].values[0][1];

        // Get previous transactions
        let zenApi = settings.apiUrls[0];
        if (!zenApi) {
            console.log( tr("wallet.tabWithdraw.messages.zenApi","No Zen api in settings"));
            return;
        }
        if ((zenApi.substr(zenApi.length - 1)) === "/"){
            zenApi = zenApi.substr(0, zenApi.length - 1);
        }

        const prevTxURL = zenApi + "/addr/" + fromAddress + "/utxo";
        const infoURL = zenApi + "/status?q=getInfo";
        const sendRawTxURL = zenApi + "/tx/send";

        // Building our transaction TXOBJ
        // Calculate maximum ZEN satoshis that we have
        let satoshisSoFar = 0;
        let history = [];
        let recipients = [{address: toAddress, satoshis: amountInSatoshi}];
        request.get(prevTxURL, function (tx_err, tx_resp, tx_body) {
            if (tx_err) {
                console.log(tx_err);
                event.sender.send("send-finish", "error", "tx_err: " + String(tx_err));
            } else if (tx_resp && tx_resp.statusCode === 200) {
                let tx_data = JSON.parse(tx_body);
                request.get(infoURL, function (info_err, info_resp, info_body) {
                    if (info_err) {
                        console.log(info_err);
                        event.sender.send("send-finish", "error", "info_err: " + String(info_err));
                    } else if (info_resp && info_resp.statusCode === 200) {
                        let info_data = JSON.parse(info_body);
                        const blockHeight = info_data.info.blocks - 300;
                        const blockHashURL = zenApi + "/block-index/" + blockHeight;

                        // Get block hash
                        request.get(blockHashURL, function (bhash_err, bhash_resp, bhash_body) {
                            if (bhash_err) {
                                console.log(bhash_err);
                                event.sender.send("send-finish", "error", "bhash_err: " + String(bhash_err));
                            } else if (bhash_resp && bhash_resp.statusCode === 200) {
                                const blockHash = JSON.parse(bhash_body).blockHash;

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
                                    let errStr = tr("wallet.tabWithdraw.messages.insufficientFundsSourceAddr", "Insufficient funds on source address!");
                                    /*let errStr = "You don't have so many funds! You wanted to send: " +
                                        Number((amountInSatoshi + feeInSatoshi) / 100000000).toFixed(8) + " ZEN, but your balance is only: " +
                                        Number(satoshisSoFar / 100000000).toFixed(8) + " ZEN.";*/
                                    console.log(errStr);
                                    event.sender.send("send-finish", "error", errStr);
                                } else {
                                    // If we don't have exact amount - refund remaining to current address
                                    if (satoshisSoFar !== (amountInSatoshi + feeInSatoshi)) {
                                        let refundSatoshis = satoshisSoFar - amountInSatoshi - feeInSatoshi;
                                        recipients = recipients.concat({address: fromAddress, satoshis: refundSatoshis})
                                    }

                                    // Create transaction
                                    let txObj = zencashjs.transaction.createRawTx(history, recipients, blockHeight, blockHash);

                                    // Sign each history transcation
                                    for (let i = 0; i < history.length; i ++) {
                                        txObj = zencashjs.transaction.signTx(txObj, i, privateKey, true)
                                    }

                                    // Convert it to hex string
                                    const txHexString = zencashjs.transaction.serializeTx(txObj);
                                    request.post({url: sendRawTxURL, form: {rawtx: txHexString}}, function(sendtx_err, sendtx_resp, sendtx_body) {
                                        if (sendtx_err) {
                                            console.log(sendtx_err);
                                            event.sender.send("send-finish", "error", "sendtx_err: " + String(sendtx_err));
                                        } else if(sendtx_resp && sendtx_resp.statusCode === 200) {
                                            const tx_resp_data = JSON.parse(sendtx_body);
                                            let message = "TXid:\n\n<small><small>" + tx_resp_data.txid +
                                                "</small></small><br /><a href=\"javascript:void(0)\" onclick=\"openUrl('" + settings.explorerUrl + "/tx/" + tx_resp_data.txid +"')\" class=\"walletListItemDetails transactionExplorer\" target=\"_blank\">Show Transaction in Explorer</a>";
                                            event.sender.send("send-finish", "ok", message);
                                        } else {
                                            console.log(sendtx_resp);
                                            event.sender.send("send-finish", "error", "sendtx_resp: " + String(sendtx_resp));
                                        }
                                    });
                                }
                            } else {
                                console.log(bhash_resp);
                                event.sender.send("send-finish", "error", "bhash_resp: " + String(bhash_resp));
                            }
                        });
                    } else {
                        console.log(info_resp);
                        event.sender.send("send-finish", "error", "info_resp: " + String(info_resp));
                    }
                });
            } else {
                console.log(tx_resp);
                event.sender.send("send-finish", "error", "tx_resp: " + String(tx_resp));
            }
        });
    }
});

/**
 * @param event
 * @param {array} fromAddresses - Array of strings, array of ZEN addresses
 * @param toAddress - one destination ZEN address
 * @param fee - fee for the whole transaction
 * @param thresholdLimit - How many ZENs will remain in every fromAddresses
 */
ipcMain.on("send-many", function (event, fromAddresses, toAddress, fee, thresholdLimit = 42.0) {
    let paramErrors = checkSweepSendParameters(fromAddresses, toAddress, fee, thresholdLimit);
    if (paramErrors.length) {
        // TODO: Come up with better message. For now, just make a HTML out of it.
        const errString = paramErrors.join("<br/>\n\n");
        event.sender.send("send-finish", "error", errString);
    } else {
        // VARIABLES ---------------------------------------------------------------------------------------------------
        let err = "";
        const nFromAddresses = fromAddresses.length;
        const satoshi = 100000000;
        let privateKeys = new Array(nFromAddresses);
        let amountsInSatoshi = new Array(nFromAddresses);

        // CHECK ZEN API -----------------------------------------------------------------------------------------------
        let zenApi = settings.apiUrls[0];
        if (!zenApi) {
            err = tr("wallet.tabWithdraw.messages.zenApi", "Zen API is not set in settings!");
            console.log(err);
            event.sender.send("send-finish", "error", err);
            return;
        }
        if ((zenApi.substr(zenApi.length - 1)) === "/") {
            zenApi = zenApi.substr(0, zenApi.length - 1);
        }

        // CONVERT TO SATOSHI ------------------------------------------------------------------------------------------
        let feeInSatoshi = Math.round(fee * satoshi);
        let thresholdLimitInSatoshi = Math.round(thresholdLimit * satoshi);
        let balanceInSatoshi = 0;
        for (let i = 0; i < nFromAddresses; i++) {
            let sqlRes = userInfo.walletDb.exec("SELECT * FROM wallet WHERE addr = '" + fromAddresses[i] + "'");

            if (!sqlRes.length) {
                err = tr("wallet.tabWithdraw.messages.unknownAddress", "Source address is not in your wallet!");
                console.log(err);
                event.sender.send("send-finish", "error", err);
                return;
            }

            balanceInSatoshi = sqlRes[0].values[0][3];
            if (i === 0) {
                if (balanceInSatoshi < (parseFloat(thresholdLimit) + parseFloat(fee))) {
                    err = tr("wallet.tabWithdraw.messages.insufficientFirstSource", "Insufficient funds on 1st source (Minimum: threshold limit + fee)!");
                    console.log(err);
                    event.sender.send("send-finish", "error", err);
                    return;
                }
                amountsInSatoshi[i] = Math.round((balanceInSatoshi - parseFloat(fee)) * satoshi);
            } else {
                if (balanceInSatoshi < (parseFloat(thresholdLimit))) {
                    err = tr("wallet.tabWithdraw.messages.insufficientNextSource", "Insufficient funds on 2nd or next source (Minimum: threshold limit + fee)!");
                    console.log(err);
                    event.sender.send("send-finish", "error", err);
                    return;
                }
                amountsInSatoshi[i] = Math.round(balanceInSatoshi * satoshi);
            }
            privateKeys[i] = sqlRes[0].values[0][1];
        }

        if (privateKeys.length !== nFromAddresses) {
            err = tr("wallet.tabWithdraw.messages.numberOfKeys", "# private keys and # addresses are not equal!");
            console.log(err);
            event.sender.send("send-finish", "error", err);
            return;
        }

        // GET PREVIOUS TRANSACTIONS -----------------------------------------------------------------------------------
        let prevTxURL = zenApi + "/addrs/";
        for (let i = 0; i < nFromAddresses; i++) {
            prevTxURL += fromAddresses[i] + ",";
        }
        prevTxURL = prevTxURL.substring(0, prevTxURL.length - 1);
        prevTxURL += "/utxo";
        const infoURL = zenApi + "/status?q=getInfo";
        const sendRawTxURL = zenApi + "/tx/send";

        // BUILDING OUR TRANSACTION TXOBJ ------------------------------------------------------------------------------
        // Calculate maximum ZEN satoshis that we have
        let satoshisSoFar = 0;
        let history = [];
        let belongToAddress;

        request.get(prevTxURL, function (tx_err, tx_resp, tx_body) {
            if (tx_err) {
                console.log(tx_err);
                event.sender.send("send-finish", "error", "tx_err: " + String(tx_err));
            } else if (tx_resp && tx_resp.statusCode === 200) {
                let tx_data = JSON.parse(tx_body);

                request.get(infoURL, function (info_err, info_resp, info_body) {
                    if (info_err) {
                        console.log(info_err);
                        event.sender.send("send-finish", "error", "info_err: " + String(info_err));
                    } else if (info_resp && info_resp.statusCode === 200) {
                        let info_data = JSON.parse(info_body);
                        const blockHeight = info_data.info.blocks - 300;
                        const blockHashURL = zenApi + "/block-index/" + blockHeight;

                        // Get block hash
                        request.get(blockHashURL, function (bhash_err, bhash_resp, bhash_body) {
                            if (bhash_err) {
                                console.log(bhash_err);
                                event.sender.send("send-finish", "error", "bhash_err: " + String(bhash_err));
                            } else if (bhash_resp && bhash_resp.statusCode === 200) {
                                const blockHash = JSON.parse(bhash_body).blockHash;

                                belongToAddress = new Array(tx_data.length);
                                // Iterate through each utxo and append it to history
                                for (let i = 0; i < tx_data.length; i++) {
                                    if (tx_data[i].confirmations === 0) {
                                        continue;
                                    }

                                    history = history.concat({
                                        txid: tx_data[i].txid,
                                        vout: tx_data[i].vout,
                                        scriptPubKey: tx_data[i].scriptPubKey
                                    });

                                    // to which address bellog this data
                                    belongToAddress[i] = tx_data[i].address;

                                    // How many satoshis we have so far
                                    satoshisSoFar += tx_data[i].satoshis;
                                }

                                if ((satoshisSoFar - (nFromAddresses * thresholdLimitInSatoshi)) < feeInSatoshi) {
                                    err = tr("wallet.tabWithdraw.messages.sumLowerThanFee", "Your summed balance over all source addresses is lower than the fee!");
                                    console.log(err);
                                    event.sender.send("send-finish", "error", err);
                                } else {
                                    let amountInSatoshiToSend = satoshisSoFar - (nFromAddresses * thresholdLimitInSatoshi) - feeInSatoshi;
                                    let recipients = [{address: toAddress, satoshis: amountInSatoshiToSend}];

                                    // Refund thresholdLimitInSatoshi amount to current address
                                    if (thresholdLimitInSatoshi > 0) {
                                        for (let i = 0; i < nFromAddresses; i++) {
                                            recipients = recipients.concat({
                                                address: fromAddresses[i],
                                                satoshis: thresholdLimitInSatoshi
                                            })
                                        }
                                    }

                                    // Create transaction
                                    let txObj = zencashjs.transaction.createRawTx(history, recipients, blockHeight, blockHash);

                                    // Sign each history transcation
                                    let index;
                                    for (let i = 0; i < history.length; i++) {
                                        index = fromAddresses.indexOf(belongToAddress[i]);
                                        txObj = zencashjs.transaction.signTx(txObj, i, privateKeys[index], true)
                                    }

                                    // Convert it to hex string
                                    const txHexString = zencashjs.transaction.serializeTx(txObj);

                                    request.post({
                                        url: sendRawTxURL,
                                        form: {rawtx: txHexString}
                                    }, function (sendtx_err, sendtx_resp, sendtx_body) {
                                        if (sendtx_err) {
                                            console.log(sendtx_err);
                                            event.sender.send("send-finish", "error", "sendtx_err: " + String(sendtx_err));
                                        } else if (sendtx_resp && sendtx_resp.statusCode === 200) {
                                            const tx_resp_data = JSON.parse(sendtx_body);
                                            let message = "TXid:\n\n<small><small>" + tx_resp_data.txid +
                                                "</small></small><br /><a href=\"javascript:void(0)\" onclick=\"openUrl('" + settings.explorerUrl + "/tx/" + tx_resp_data.txid + "')\" class=\"walletListItemDetails transactionExplorer\" target=\"_blank\">Show Transaction in Explorer</a>";
                                            event.sender.send("send-finish", "ok", message);
                                        } else {
                                            console.log(sendtx_resp);
                                            event.sender.send("send-finish", "error", "sendtx_resp: " + String(sendtx_resp));
                                        }
                                    });
                                }
                            } else {
                                console.log(bhash_resp);
                                event.sender.send("send-finish", "error", "bhash_resp: " + String(bhash_resp));
                            }
                        });
                    } else {
                        console.log(info_resp);
                        event.sender.send("send-finish", "error", "info_resp: " + String(info_resp));
                    }
                });
            } else {
                console.log(tx_resp);
                event.sender.send("send-finish", "error", "tx_resp: " + String(tx_resp));
            }
        });
    }
});

ipcMain.on("get-me-settings", function (event) {
    event.returnValue = loadSettings();
});

ipcMain.on("export-pdf", function (event, newWalletNamePaper) {
    const win = BrowserWindow.fromWebContents(event.sender);
    console.log(win);
    const app = require("electron");
    const dialog = app.dialog;
    console.log("print-to-pdf received");
    console.log(newWalletNamePaper);

    let defaultPathPDF;
    if (!(newWalletNamePaper === "")) {
        defaultPathPDF = "*/" + newWalletNamePaper + " Wallet - " + userInfo.login;
    } else {
        defaultPathPDF = "*/ZenCash Wallet - " + userInfo.login;
    }

    dialog.showSaveDialog(win, {
        title: "Save",
        filters: [{name: "PDF", extensions: ["pdf"]}],
        defaultPath: defaultPathPDF
    }, (fileName) => {
        if (fileName === undefined) {
            console.log("Cancel pressed");
            event.sender.send("export-pdf-done", "PDF export: Canceled by user.");
            return;
        }
        win.webContents.printToPDF({landscape: false}, function (error, data) {
            fs.writeFile(fileName, data, function (err) {
                if (err) return console.log(err.message);
                shell.openExternal("file://" + fileName);
                event.sender.send("export-pdf-done", "PDF exported")
            });
        });
    });
});

ipcMain.on("get-paper-address-wif", function (event, addressInWallet, name) {
    if (!addressInWallet) {
        let wifTmp = generateNewAddress(1, userInfo.pass);
        let wif = wifTmp[0];
        event.returnValue = {wif: wif, resp: null};
    } else if (addressInWallet) {
        let resp = getNewAddress(name);
        //ipcMain.send("generate-wallet-response", JSON.stringify(resp));
        event.returnValue = {wif: resp.wif, resp: resp};
    }
});

// Unused

// function importWalletDat(login, pass, wallet) {
//     let walletBytes = fs.readFileSync(wallet, "binary");
//     let re = /\x30\x81\xD3\x02\x01\x01\x04\x20(.{32})/gm;
//     let privateKeys = walletBytes.match(re);
//     privateKeys = privateKeys.map(function (x) {
//         x = x.replace("\x30\x81\xD3\x02\x01\x01\x04\x20", "");
//         x = Buffer.from(x, "latin1").toString("hex");
//         return x;
//     });
//
//     let pk;
//     let pubKey;
//     //Create the database
//     let db = new sql.Database();
//     // Run a query without reading the results
//     db.run(dbStructWallet);
//
//     for (let i = 0; i < privateKeys.length; i += 1) {
//         // If not 64 length, probs WIF format
//         if (privateKeys[i].length !== 64) {
//             pk = zencashjs.address.WIFToPrivKey(privateKeys[i]);
//         } else {
//             pk = privateKeys[i];
//         }
//         pubKey = zencashjs.address.privKeyToPubKey(pk, true);
//         db.run("INSERT OR IGNORE INTO wallet VALUES (?,?,?,?,?)", [null, pk, zencashjs.address.pubKeyToAddr(pubKey), 0, ""]);
//     }
//
//     let data = db.export();
//     let walletEncrypted = encryptWallet(login, pass, data);
//     storeFile(getWalletPath() + login + ".awd", walletEncrypted);
//
//     userInfo.walletDb = db;
//     loadSettings();
//     // mainWindow.webContents.send("zz-get-wallets");
//     // loadTransactions(mainWindow.webContents);
// }
