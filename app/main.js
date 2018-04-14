// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const electron = require("electron");
const BrowserWindow = electron.BrowserWindow;
const {app, Menu, ipcMain, dialog} = require("electron");
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
const updater = require("electron-simple-updater");
const axios = require("axios");
require("axios-debug-log");
const querystring = require("querystring");
const {List} = require("immutable");
const {translate} = require("./util.js");
const {DateTime} = require("luxon");

const userWarningImportFileWithPKs = "New address(es) and a private key(s) will be imported. Your previous back-ups do not include the newly imported addresses or the corresponding private keys. Please use the backup feature of Arizen to make new backup file and replace your existing Arizen wallet backup. By pressing 'I understand' you declare that you understand this. For further information please refer to the help menu of Arizen.";
const userWarningExportWalletUnencrypted = "You are going to export an UNENCRYPTED wallet ( ie your private keys) in plain text. That means that anyone with this file can control your ZENs. Store this file in a safe place. By pressing 'I understand' you declare that you understand this. For further information please refer to the help menu of Arizen.";
const userWarningExportWalletEncrypted = "You are going to export an ENCRYPTED wallet and your private keys will be encrypted. That means that in order to access your private keys you need to know the corresponding username and password. In case you don't know them you cannot control the ZENs that are controled by these private keys. By pressing 'I understand' you declare that you understand this. For further information please refer to the help menu of Arizen.";

// Press F12 to open the DevTools. See https://github.com/sindresorhus/electron-debug.
require("electron-debug")();

// Uncomment if you want to run in production
// process.env.NODE_ENV !== "production"

function attachUpdaterHandlers() {
    function onUpdateDownloaded() {
        let version = updater.meta.version;
        dialog.showMessageBox({
            type: "info",
            title: "Update is here!",
            message: `Arizen will be closed and the new ${version} version will be installed. When the update is complete, the Arizen wallet will be reopened itself.`
        }, function () {
            // application forces to update itself
            updater.quitAndInstall();
        });
    }

    updater.on("update-downloaded", onUpdateDownloaded);
}

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
    lang: "en",
    domainFronting: false
};
let settings = defaultSettings;
let langDict;

let axiosApi;

const DOMAIN_FRONTING_PUBLIC_URL = "https://www.google.com";
const DOMAIN_FRONTING_PRIVATE_HOST = "zendhide.appspot.com";

const dbStructWallet = "CREATE TABLE wallet (id INTEGER PRIMARY KEY AUTOINCREMENT, pk TEXT, addr TEXT UNIQUE, lastbalance REAL, name TEXT);";
const dbStructSettings = "CREATE TABLE settings (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, value TEXT);";
const dbStructTransactions = "CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, txid TEXT, time INTEGER, address TEXT, vins TEXT, vouts TEXT, amount REAL, block INTEGER);";

function tr(key, defaultVal) {
    return (settings && settings.lang) ? translate(langDict, key, defaultVal) : defaultVal;
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

function getWalletPath() {
    return getRootConfigPath() + "wallets/";
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
    // check if file format is correct. Allow only awd and uawd file formats.
    if (filename.indexOf("awd") === -1 && filename.indexOf("uawd") === -1) {
        // TODO: add it to translation
        dialog.showErrorBox(tr("login.walletImportFailedBadFileFormat", "Import failed"), tr("login.dataImportFailed", "Wallet data format is incorrect - only awd and uawd file formats are supported."));
    }

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
        mainWindow.webContents.send("show-notification-response", "Import", tr("login.walletImported", "Wallet imported succesfully"), 3);
    } else {
        dialog.showErrorBox(tr("login.walletImportFailed", "Import failed"), tr("login.dataImportFailed", "Data import failed, possible reason is wrong credentials"));
    }
}

function exportWallet(filename, encrypt) {
    let data = userInfo.walletDb.export();
    if (encrypt === true) {
        data = encryptWallet(userInfo.login, userInfo.pass, data);
    }
    storeFile(filename, data);
}

function pruneBackups(backupDir, walletName) {
    // shamelessly inspired by borg backup

    const pruneConfig = {
        last: 5,
        hourly: 10,
        daily: 10,
    };

    const PRUNING_PATTERNS = [
        ["secondly", "yyyy-LL-dd HH:mm:ss"],
        ["minutely", "yyyy-LL-dd HH:mm"],
        ["hourly",   "yyyy-LL-dd HH"],
        ["daily",    "yyyy-LL-dd"],
        ["weekly",   "kkkk-WW"],
        ["monthly",  "yyyy-LL"],
        ["yearly",   "yyyy"]];

    const PRUNING_PATTERNS_DICT = {};
    PRUNING_PATTERNS.forEach(x => PRUNING_PATTERNS_DICT[x[0]] = x[1]);

    function listBackupFiles() {
        const filterRE = new RegExp("^" + walletName + "-\\d{14}\\.awd$");
        let files = fs.readdirSync(backupDir);
        files = files.filter(filename => filterRE.test(filename));
        files.sort();
        files.reverse();
        return files;
    }

    function pruneLast(files, n) {
        return files.slice(0, n || 0);
    }

    function pruneSplit(files, rule, n) {
        let last = null;
        let keep = [];
        if (!n) {
            return keep;
        }
        for (let f of files) {
            let stats = fs.statSync(backupDir + "/" + f);
            let period = DateTime
                .fromJSDate(stats.mtime)
                .toFormat(PRUNING_PATTERNS_DICT[rule]);
            if (period !== last) {
                last = period;
                keep.push(f);
                if (keep.length === n){
                    break;
                }
            }
        }
        return keep;
    }

    let files = listBackupFiles();
    let toDelete = new Set(files);

    pruneLast(files, pruneConfig.last)
        .forEach(f => toDelete.delete(f));
    PRUNING_PATTERNS.forEach(rule =>
        pruneSplit(files, rule[0], pruneConfig[rule[0]])
            .forEach(f => toDelete.delete(f)));

    for (let f of toDelete) {
        fs.unlinkSync(backupDir + "/" + f);
    }
}

function saveWallet() {
    const walletPath = getWalletPath() + userInfo.login + ".awd";

    if (fs.existsSync(walletPath)) {
        const backupDir = getWalletPath() + "backups";
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        const timestamp = DateTime.local().toFormat("yyyyLLddHHmmss");
        const backupPath = backupDir + "/" + userInfo.login + "-" + timestamp + ".awd";
        //fs.copyFileSync(walletPath, backupPath);
        // piece of shit node.js ecosystem, why the fuck do we have to deal with fs-extra crap here?
        fs.copySync(walletPath, backupPath);
        pruneBackups(backupDir, userInfo.login);
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

function sqlSelect(asObjects, sql, ...args) {
    const stmt = userInfo.walletDb.prepare(sql);
    stmt.bind(args);
    const results = [];
    while (stmt.step()) {
        let row = asObjects ? stmt.getAsObject() : stmt.get();
        results.push(row);
    }
    return results;
}

function sqlSelectColumns(sql, ...args) {
    return sqlSelect(false, sql, ...args);
}

function sqlSelectObjects(sql, ...args) {
    return sqlSelect(true, sql, ...args);
}

function sqlRun(sql, ...args) {
    const result = userInfo.walletDb.run(sql, args);
    userInfo.dbChanged = true;
    return result;
}

function tableExists(table) {
    return sqlSelectColumns(`select count(*) from sqlite_master where type = 'table' and name = '${table}'`)[0][0] === 1;
}

function loadSettings() {
    /* Remove settings row from settings table. Old versions chceks row count in
     * the table and inserts missing settings if the count isn't 6. By inserting
     * another setting we fucked up its fucked up upgrade logic. This only
     * happens in old versions after new version (f422bfff) run. */
    if (tableExists("settings")) {
        sqlRun("delete from settings where name = 'settings'");
    }
    /* In future we'll ditch SQLite and use encrypted JSONs for storage. For now
     * store settings in temporary table "new_settings". */
    if (!tableExists("new_settings")) {
        sqlRun("create table new_settings (name text unique, value text)");
    }

    const b64settings = sqlSelectColumns("select value from new_settings where name = 'settings'");
    if (b64settings.length === 0) {
        return defaultSettings;
    }

    /* Later we'll want to merge user settings with default settings. */
    return JSON.parse(Buffer.from(b64settings[0][0], "base64").toString("ascii"));
}

function saveSettings(settings) {
    const b64settings = Buffer.from(JSON.stringify(settings)).toString("base64");
    sqlRun("insert or replace into new_settings (name, value) values ('settings', ?)", b64settings);
    saveWallet();
}

function setSettings(newSettings) {
    settings = newSettings;

    if (settings.domainFronting) {
        axiosApi = axios.create({
            baseURL: DOMAIN_FRONTING_PUBLIC_URL,
            headers: {
                "Host": DOMAIN_FRONTING_PRIVATE_HOST
            },
            timeout: 10000,
        });
    }
    else {
        axiosApi = axios.create({
            baseURL: "https://explorer.zensystem.io/insight-api-zen",
            timeout: 10000,
        });
    }
}

function upgradeDb() {
    // expects DB to be prefilled with addresses
    let addr = sqlSelectObjects("select * from wallet limit 1")[0];
    if (!("name" in addr)) {
        sqlRun("ALTER TABLE wallet ADD COLUMN name TEXT DEFAULT ''");
    }
}

function exportWalletArizen(ext, encrypt) {
    let showMessage = "";
    if(encrypt){
        showMessage = tr("warmingMessages.userWarningExportWalletEncrypted", userWarningExportWalletEncrypted);
    } else {
        showMessage = tr("warmingMessages.userWarningExportWalletUnencrypted", userWarningExportWalletUnencrypted);
    }
    dialog.showMessageBox({type: "warning", title: "Important Information", message: showMessage, buttons: [tr("warmingMessages.userWarningIUnderstand", "I understand"),tr("warmingMessages.cancel","Cancel")],  cancelId: -1 }, function(response) {
        if(response === 0){
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
    });
}

function importWalletArizen(ext, encrypted) {
    if (userInfo.loggedIn) {
        dialog.showOpenDialog({
            title: "Import wallet." + ext,
            filters: [{name: "Wallet", extensions: [ext]}]
        }, function(filePaths) {
            if (filePaths) {
                dialog.showMessageBox({
                    type: "warning",
                    message: "This will replace your actual wallet. Are you sure?",
                    buttons: ["Yes", "No"],
                    title: "Replace wallet?"
                }, function (response) {
                    if (response === 0) {
                        importWallet(filePaths[0], encrypted);
                    }
                });
            }
        });
    }
}

function exportPKs() {
    // function exportToFile(filename, override = False) {
    function exportToFile(filename) {
        fs.open(filename, "w", 0o600, (err, fd) => {
            if (err) {
                console.error(`Couldn't open "${filename}" for writing: `, err);
            } else {
                const keys = sqlSelectObjects("select pk, addr from wallet");
                for (let k of keys) {
                    const wif = zencashjs.address.privKeyToWIF(k.pk,true);
                    fs.write(fd, wif + " " + k.addr + "\n");
                }
            }
        });
    }
    dialog.showMessageBox({type: "warning", title: "Important Information", message: tr("warmingMessages.userWarningExportWalletUnencrypted", userWarningExportWalletUnencrypted), buttons: [tr("warmingMessages.userWarningIUnderstand", "I understand"),tr("warmingMessages.cancel","Cancel")],  cancelId: -1 }, function(response) {
        if(response===0){
            dialog.showSaveDialog({
                type: "warning",
                title: "Choose file for private keys",
                defaultPath: "arizen-private-keys.txt"
            }, filename => {
                if (filename) {
                    exportToFile(filename);
                }
            });
        }
    });
}

function importOnePK(pk, name = "") {
    try {
        if (pk.length !== 64) {
            pk = zencashjs.address.WIFToPrivKey(pk);
        }
        const pub = zencashjs.address.privKeyToPubKey(pk, true);
        const addr = zencashjs.address.pubKeyToAddr(pub);
        sqlRun("insert or ignore into wallet (pk, addr, lastbalance, name) values (?, ?, 0, ?)", pk, addr, name);
    } catch (err) {
        console.log(`Invalid private key on line in private keys file : `, err);
    }
}

async function apiGet(url) {
    const resp = await axiosApi(url);
    return resp.data;
}

async function apiPost(url, form) {
    const resp = await axiosApi.post(url, querystring.stringify(form));
    return resp.data;
}

async function fetchTransactions(txIds, myAddrs) {
    const txs = [];
    const myAddrSet = new Set(myAddrs);

    for (const txId of txIds) {
        const info = await apiGet("tx/" + txId);

        let txBalance = 0;
        const vins = [];
        const vouts = [];

        // Address field in transaction rows is meaningless. Pick something sane.
        let firstMyAddr;

        for (const vout of info.vout) {
            // XXX can it be something else?
            if (!vout.scriptPubKey) {
                continue;
            }
            let balanceAccounted = false;
            for (const addr of vout.scriptPubKey.addresses) {
                if (!balanceAccounted && myAddrSet.has(addr)) {
                    balanceAccounted = true;
                    txBalance += parseFloat(vout.value);
                    if (!firstMyAddr) {
                        firstMyAddr = addr;
                    }
                }
                if (!vouts.includes(addr)) {
                    vouts.push(addr);
                }
            }
        }

        for (const vin of info.vin) {
            const addr = vin.addr;
            if (myAddrSet.has(addr)) {
                txBalance -= parseFloat(vin.value);
                if (!firstMyAddr) {
                    firstMyAddr = addr;
                }
            }
            if (!vins.includes(addr)) {
                vins.push(addr);
            }
        }

        const tx = {
            txid: info.txid,
            time: info.blocktime,
            address: firstMyAddr,
            vins: vins.join(","),
            vouts: vouts.join(","),
            amount: txBalance,
            block: info.blockheight
        };

        txs.push(tx);
    }

    return txs;
}

async function fetchBlockchainChanges(addrObjs, knownTxIds) {
    const result = {
        changedAddrs: [],
        newTxs: []
    };
    const txIdSet = new Set();

    for (const obj of addrObjs) {
        const info = await apiGet("/addr/" + obj.addr);
        if (obj.lastbalance !== info.balance) {
            obj.balanceDiff = info.balance - (obj.lastbalance || 0);
            obj.lastbalance = info.balance;
            result.changedAddrs.push(obj);
        }
        info.transactions.forEach(txId => txIdSet.add(txId));
    }

    knownTxIds.forEach(txId => txIdSet.delete(txId));

    const newTxs = await fetchTransactions([...txIdSet], addrObjs.map(obj => obj.addr));
    result.newTxs = new List(newTxs).sortBy(tx => tx.block).toArray();

    return result;
}

async function updateBlockchainView(webContents) {
    webContents.send("add-loading-image");
    const addrObjs = sqlSelectObjects("SELECT addr, name, lastbalance FROM wallet where length(addr)=35");
    const knownTxIds = sqlSelectColumns("SELECT DISTINCT txid FROM transactions").map(row => row[0]);
    let totalBalance = addrObjs.filter(obj => obj.lastbalance).reduce((sum, a) => sum + a.lastbalance, 0);

    let result;
    try {
        result = await fetchBlockchainChanges(addrObjs, knownTxIds);
    } catch (e) {
        console.log("Update from API failed", e);
        return;
    }

    for (const addrObj of result.changedAddrs) {
        sqlRun("UPDATE wallet SET lastbalance = ? WHERE addr = ?", addrObj.lastbalance, addrObj.addr);
        totalBalance += addrObj.balanceDiff;
        webContents.send("update-wallet-balance", JSON.stringify({
            response: "OK",
            addrObj: addrObj,
            diff: addrObj.balanceDiff,
            total: totalBalance
        }));
    }

    const zAddrObjs = sqlSelectObjects("SELECT addr, name, lastbalance,pk FROM wallet where length(addr)=95");

    for (const addrObj of zAddrObjs) {
        let previousBalance = 0.0; // TODO: Should do something with this
        let balance = addrObj.lastbalance;
        let balanceDiff = balance - previousBalance;
        addrObj.lastbalance = balance;
        sqlRun("UPDATE wallet SET lastbalance = ? WHERE addr = ?", balance, addrObj.addr);
        totalBalance += balance; //not balanceDiff here
        webContents.send("update-wallet-balance", JSON.stringify({
            response: "OK",
            addrObj: addrObj,
            diff: balanceDiff,
            total: totalBalance
        }));
    }

    // Why here ? In case balance is unchanged the 'update-wallet-balance' is never sent, but the Zen/Fiat balance will change.
    webContents.send("send-refreshed-wallet-balance", totalBalance);

    for (const tx of result.newTxs) {
        if (tx.block >= 0) {
            sqlRun("INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?)",
                null, tx.txid, tx.time, tx.address, tx.vins, tx.vouts, tx.amount, tx.block);
        }
        webContents.send("get-transaction-update", JSON.stringify(tx));
    }
    webContents.send("remove-loading-image");
}

function sendWallet() {
    if (!userInfo.loggedIn) {
        return;
    }
    const resp = {};
    resp.response = "OK";
    resp.autorefresh = settings.autorefresh;
    resp.wallets = sqlSelectObjects("SELECT * FROM wallet ORDER BY lastbalance DESC, id DESC");
    resp.transactions = sqlSelectObjects("SELECT * FROM transactions ORDER BY time DESC LIMIT " + settings.txHistory);
    resp.total = resp.wallets.reduce((sum, a) => sum + a.lastbalance, 0);

    mainWindow.webContents.send("get-wallets-response", JSON.stringify(resp));
    updateBlockchainView(mainWindow.webContents);
}

function importPKs() {
    function importFromFile(filename) {
        let i = 1;
        fs.readFileSync(filename).toString().split("\n").filter(x => x).forEach(line => {
            const matches = line.match(/^\w+/);
            if (matches) {
                let pk = matches[0];
                importOnePK(pk, "");
            }
            i++;
        });
    }

    dialog.showMessageBox({ type: "warning", title: "Important Information", message: tr("warmingMessages.userWarningImportFileWithPKs", userWarningImportFileWithPKs), buttons: [tr("warmingMessages.userWarningIUnderstand", "I understand"),tr("warmingMessages.cancel","Cancel")],  cancelId: -1 }, function(response) {
        if(response===0){
            dialog.showOpenDialog({
                title: "Choose file with private keys"
            }, filenames => {
                if (filenames) {
                    for (let f of filenames) {
                        importFromFile(f);
                    }
                    // TODO: save only if at least one key was inserted
                    saveWallet();
                    sendWallet();
                }
            });
        }
    });
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

function createHelpSubmenu() {
    return [
        {
            label: tr("menu.helpSubmenu.arizenManual", "Arizen Manual"),
            accelerator: "CmdOrCtrl+H",
            click: () => {
                require("electron").shell.openExternal("https://github.com/ZencashOfficial/arizen#user-manuals");
            }
        },
        {
            label: tr("menu.helpSubmenu.support", "Support"),
            accelerator: "Shift+CmdOrCtrl+S",
            click: () => {
                require("electron").shell.openExternal("https://support.zencash.com");
            }
        },
        { type: "separator" },
        {
            label: tr("menu.helpSubmenu.zencash", "ZenCash"),
            click: () => {
                require("electron").shell.openExternal("https://zencash.com");
            }
        }
    ];
}

function includeDeveloperMenu(template){
  if (process.env.NODE_ENV !== 'production'){
    template.push({
      label: 'Developer Tools',
      submenu:[
        {
          label: 'Toggle DevTools',
          accelerator: process.platform == 'darwin' ? 'Command+I':
          'Ctrl+I',
          click(item, focusedWindow){
            focusedWindow.toggleDevTools();
          }
        },
        {role: 'reload'},
        { type: "separator" },
        {
            label: tr("menu.backupUnencrypted", "Backup UNENCRYPTED wallet"),
            click() {
                exportWalletArizen("uawd", false);
            }
        },
        { type: "separator" },
        {
            label: "RPC console",
            click() {
                mainWindow.webContents.send("open-rpc-console");
            }
        }
      ]
    })

    }
}

function updateMenuAtLogin() {
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
                    click: function () {
                        exportPKs();
                    }
                },
                {
                    label: tr("menu.importPrivateKeys", "Import private keys"),
                    click: function () {
                        importPKs();
                    }
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
        },
        {
            label: tr("menu.help", "Help"),
            submenu: createHelpSubmenu()
        }
    ];

    updateMenuForDarwin(template);
    includeDeveloperMenu(template);

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
        },
        {
            label: tr("menu.help", "Help"),
            submenu: createHelpSubmenu()
        }
    ];
    updateMenuForDarwin(template);
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
    updateMenuAtLogout();
    mainWindow = new BrowserWindow({width: 1000, height: 730, resizable: true, icon: "resources/zen_icon.png"});

    mainWindow.webContents.openDevTools();


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

// https://github.com/electron/electron/issues/6139
if (process.platform === "linux") {
    app.disableHardwareAcceleration();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => createWindow());

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
        saveWallet();
    }
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
            setSettings(loadSettings());
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
    if (true === userInfo.dbChanged) {
        saveWallet();
    }
    userInfo.login = "";
    userInfo.pass = "";
    userInfo.walletDb = [];
    userInfo.loggedIn = false;
});

ipcMain.on("exit-from-menu", function () {
    app.quit();
});

ipcMain.on("import-single-key", function(event, name, pk) {
    console.log(name);
    console.log(pk);

    importOnePK(pk, name);
    saveWallet();
    sendWallet();
});

ipcMain.on("get-wallets", () => {
    mainWindow.webContents.send("settings", JSON.stringify(settings));
    sendWallet();
});

ipcMain.on("refresh-wallet", function (event) {
    let resp = {response: "ERR"};

    if (userInfo.loggedIn) {
        updateBlockchainView(event.sender);
        resp.response = "OK";
        resp.autorefresh = settings.autorefresh;
    }

    event.sender.send("refresh-wallet-response", JSON.stringify(resp));
});

ipcMain.on("rename-wallet", function (event, address, name) {
    let resp = {
        response: "ERR",
        msg: "not logged in"
    };

    if (userInfo.loggedIn) {
        const count = sqlSelectColumns("SELECT count(*) FROM wallet WHERE addr = ?", address)[0][0];
        if (count) {
            sqlRun("UPDATE wallet SET name = ? WHERE addr = ?", name, address);
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
    let resp = {
        response: "ERR",
        msg: "not logged in"
    };

    if (userInfo.loggedIn) {
        const walletAddr = sqlSelectObjects("SELECT * FROM wallet WHERE name = ?", name)[0];
        if (walletAddr) {
            resp = {
                response: "OK",
                wallets: walletAddr
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
    if (!userInfo.loggedIn) {
        return;
    }
    const newSettings = JSON.parse(newSettingsStr);
    saveSettings(newSettings);
    setSettings(newSettings);
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

ipcMain.on("check-if-z-address-in-wallet", function(event,zAddress){
    let exist = false;
    let result = sqlSelectObjects("Select * from wallet"); // where length(addr)=35 //take only T addresses // or ("Select * from wallet where addr = ?", [zAddress]);
    for (let k of result){
      if (k.addr === zAddress) {exist = true ; break;}
    }
    event.returnValue = {exist: exist, result: result};
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

ipcMain.on("send", async function (event, fromAddress, toAddress, fee, amount){
    let paramErrors = checkStandardSendParameters(fromAddress, toAddress, fee, amount);
    if (paramErrors.length) {
        // TODO: Come up with better message. For now, just make a HTML out of it.
        const errString = paramErrors.join("<br/>\n\n");
        event.sender.send("send-finish", "error", errString);

        return;
    }

    try {
        // Convert to satoshi
        let amountInSatoshi = Math.round(amount * 100000000);
        let feeInSatoshi = Math.round(fee * 100000000);
        let walletAddr = sqlSelectObjects("SELECT * FROM wallet WHERE addr = ?", fromAddress)[0];

        if (!walletAddr) {
            event.sender.send("send-finish", "error",  tr("wallet.tabWithdraw.messages.unknownAddress","Source address is not in your wallet!"));

            return;
        }

        if (walletAddr.lastbalance < (parseFloat(amount) + parseFloat(fee))) {
            event.sender.send("send-finish", "error", tr("wallet.tabWithdraw.messages.insufficientFundsSourceAddr", "Insufficient funds on source address!"));

            return;
        }

        let privateKey = walletAddr.pk;

        const prevTxURL = "/addr/" + fromAddress + "/utxo";
        const infoURL = "/status?q=getInfo";
        const sendRawTxURL = "/tx/send";

        // Building our transaction TXOBJ
        // Calculate maximum ZEN satoshis that we have
        let satoshisSoFar = 0;
        let history = [];
        let recipients = [{address: toAddress, satoshis: amountInSatoshi}];

        const txData = await apiGet(prevTxURL);
        const infoData = await apiGet(infoURL);

        const blockHeight = infoData.info.blocks - 300;
        const blockHashURL = "/block-index/" + blockHeight;

        const blockHash = (await apiGet(blockHashURL)).blockHash;

        // Iterate through each utxo and append it to history
        for (let i = 0; i < txData.length; i++) {
            if (txData[i].confirmations === 0) {
                continue;
            }

            history = history.concat( {
                txid: txData[i].txid,
                vout: txData[i].vout,
                scriptPubKey: txData[i].scriptPubKey
            });

            // How many satoshis we have so far
            satoshisSoFar = satoshisSoFar + txData[i].satoshis;
            if (satoshisSoFar >= amountInSatoshi + feeInSatoshi) {
                break;
            }
        }

        // If we don't have enough address - fail and tell it to the user
        if (satoshisSoFar < amountInSatoshi + feeInSatoshi) {
            let errStr = tr("wallet.tabWithdraw.messages.insufficientFundsSourceAddr", "Insufficient funds on source address!");
            event.sender.send("send-finish", "error", errStr);

            return;
        }

        // If we don't have exact amount - refund remaining to current address
        if (satoshisSoFar !== (amountInSatoshi + feeInSatoshi)) {
            let refundSatoshis = satoshisSoFar - amountInSatoshi - feeInSatoshi;
            recipients = recipients.concat({address: fromAddress, satoshis: refundSatoshis});
        }

        // Create transaction
        let txObj = zencashjs.transaction.createRawTx(history, recipients, blockHeight, blockHash);

        // Sign each history transcation
        for (let i = 0; i < history.length; i ++) {
            txObj = zencashjs.transaction.signTx(txObj, i, privateKey, true);
        }

        // Convert it to hex string
        const txHexString = zencashjs.transaction.serializeTx(txObj);
        const txRespData = await apiPost(sendRawTxURL, {rawtx: txHexString});

        // TODO redo this into garbage
        let message = "TXid:\n\n<small>" + txRespData.txid + "</small><br /><a href=\"javascript:void(0)\" onclick=\"openUrl('" + settings.explorerUrl + "/tx/" + txRespData.txid +"')\" class=\"walletListItemDetails transactionExplorer\" target=\"_blank\">Show Transaction in Explorer</a>";
        event.sender.send("send-finish", "ok", message);
    }
    catch (e) {
        event.sender.send("send-finish", "error", e.message);
        console.log(e);
    }
});

/**
 * @param event
 * @param {array} fromAddressesAll - Array of strings, array of ZEN addresses
 * @param toAddress - one destination ZEN address
 * @param fee - fee for the whole transaction
 * @param thresholdLimit - How many ZENs will remain in every fromAddresses
 */
ipcMain.on("send-many", async function (event, fromAddressesAll, toAddress, fee, thresholdLimit = 42.0) {
    let paramErrors = checkSweepSendParameters(fromAddressesAll, toAddress, fee, thresholdLimit);
    if (paramErrors.length) {
        // TODO: Come up with better message. For now, just make a HTML out of it.
        const errString = paramErrors.join("<br/>\n\n");
        event.sender.send("send-finish", "error", errString);

        return;
    }

    try {
        // VARIABLES ---------------------------------------------------------------------------------------------------
        // filter out all zero balanced wallets
        let fromAddressesTemp = [];
        for (let i = 0; i < fromAddressesAll.length; i++) {
            let walletAddr = sqlSelectObjects("SELECT * FROM wallet WHERE addr = ?", fromAddressesAll[i])[0];
            // TODO check walletAddrs is defined
            if (walletAddr.lastbalance !== 0 && walletAddr.lastbalance !== thresholdLimit) {
                fromAddressesTemp.push(fromAddressesAll[i]);
            }
        }

        let txFinished = 0;
        let chunkSize = 10;
        let finalMessage = "";
        let chunks = [];
        for (let i = 0, j = fromAddressesTemp.length; i < j; i += chunkSize) {
            chunks.push(fromAddressesTemp.slice(i, i + chunkSize));
        }

        for (let c = 0; c < chunks.length; c++) {
            let fromAddresses = chunks[c];

            // TODO: check if fromAddresses.length == 0
            const nFromAddresses = fromAddresses.length;
            let privateKeys = new Array(nFromAddresses);
            let amountsInSatoshi = new Array(nFromAddresses);
            let err = "";
            const satoshi = 100000000;

            // CONVERT TO SATOSHI ------------------------------------------------------------------------------------------
            let feeInSatoshi = Math.round(fee * satoshi);
            let thresholdLimitInSatoshi = Math.round(thresholdLimit * satoshi);
            let balanceInSatoshi = 0;

            for (let i = 0; i < nFromAddresses; i++) {
                let walletAddr = sqlSelectObjects("SELECT * FROM wallet WHERE addr = ?", fromAddresses[i])[0];

                if (!walletAddr) {
                    err = tr("wallet.tabWithdraw.messages.unknownAddress", "Source address is not in your wallet!");
                    event.sender.send("send-finish", "error", err);

                    return;
                }

                balanceInSatoshi = walletAddr.lastbalance;

                if (i === 0) {
                    if (balanceInSatoshi < (parseFloat(thresholdLimit) + parseFloat(fee))) {
                        err = tr("wallet.tabWithdraw.messages.insufficientFirstSource", "Insufficient funds on 1st source (Minimum: threshold limit + fee)!");
                        event.sender.send("send-finish", "error", err);

                        return;
                    }

                    amountsInSatoshi[i] = Math.round((balanceInSatoshi - parseFloat(fee)) * satoshi);
                } else {
                    if (balanceInSatoshi < (parseFloat(thresholdLimit))) {
                        err = tr("wallet.tabWithdraw.messages.insufficientNextSource", "Insufficient funds on 2nd or next source (Minimum: threshold limit)!");
                        event.sender.send("send-finish", "error", err);

                        return;
                    }

                    amountsInSatoshi[i] = Math.round(balanceInSatoshi * satoshi);
                }

                privateKeys[i] = walletAddr.pk;
            }

            if (privateKeys.length !== nFromAddresses) {
                err = tr("wallet.tabWithdraw.messages.numberOfKeys", "# private keys and # addresses are not equal!");
                event.sender.send("send-finish", "error", err);

                return;
            }

            // GET PREVIOUS TRANSACTIONS -------------------------------------------------------------------------------
            let prevTxURL = "/addrs/";
            for (let i = 0; i < nFromAddresses; i++) {
                prevTxURL += fromAddresses[i] + ",";
            }
            prevTxURL = prevTxURL.substring(0, prevTxURL.length - 1);
            prevTxURL += "/utxo";
            const infoURL = "/status?q=getInfo";
            const sendRawTxURL = "/tx/send";

            // BUILDING OUR TRANSACTION TXOBJ --------------------------------------------------------------------------
            // Calculate maximum ZEN satoshis that we have
            let satoshisSoFar = 0;
            let history = [];
            let belongToAddress;

            const txData = await apiGet(prevTxURL);
            const infoData = await apiGet(infoURL);

            const blockHeight = infoData.info.blocks - 300;
            const blockHashURL = "/block-index/" + blockHeight;

            const blockHash = (await apiGet(blockHashURL)).blockHash;

            belongToAddress = new Array(txData.length);
            // Iterate through each utxo and append it to history
            for (let i = 0; i < txData.length; i++) {
                if (txData[i].confirmations === 0) {
                    continue;
                }

                history = history.concat({
                    txid: txData[i].txid,
                    vout: txData[i].vout,
                    scriptPubKey: txData[i].scriptPubKey
                });

                // to which address bellog this data
                belongToAddress[i] = txData[i].address;

                // How many satoshis we have so far
                satoshisSoFar += txData[i].satoshis;
            }

            if ((satoshisSoFar - (nFromAddresses * thresholdLimitInSatoshi)) < feeInSatoshi) {
                err = tr("wallet.tabWithdraw.messages.sumLowerThanFee", "Your summed balance over all source addresses is lower than the fee!");
                event.sender.send("send-finish", "error", err);

                return;
            }

            let amountInSatoshiToSend = satoshisSoFar - (nFromAddresses * thresholdLimitInSatoshi) - feeInSatoshi;
            let recipients = [{address: toAddress, satoshis: amountInSatoshiToSend}];

            // Refund thresholdLimitInSatoshi amount to current address
            if (thresholdLimitInSatoshi > 0) {
                for (let i = 0; i < nFromAddresses; i++) {
                    recipients = recipients.concat({
                        address: fromAddresses[i],
                        satoshis: thresholdLimitInSatoshi
                    });
                }
            }

            // Create transaction
            let txObj = zencashjs.transaction.createRawTx(history, recipients, blockHeight, blockHash);

            // Sign each history transcation
            let index;
            for (let i = 0; i < history.length; i++) {
                index = fromAddresses.indexOf(belongToAddress[i]);
                txObj = zencashjs.transaction.signTx(txObj, i, privateKeys[index], true);
            }

            // Convert it to hex string
            const txHexString = zencashjs.transaction.serializeTx(txObj);
            const txRespData = await apiPost(sendRawTxURL, {rawtx: txHexString});

            finalMessage += `<small><a href="javascript:void(0)" onclick="openUrl('${settings.explorerUrl}/tx/${txRespData.txid}')" class="walletListItemDetails transactionExplorer monospace" target="_blank">${txRespData.txid}</a>`;
            finalMessage += "</small><br/>\n\n";

            txFinished += 1;
            if (txFinished === chunks.length) {
                event.sender.send("send-finish", "ok", finalMessage);
            }
        }
    }
    catch(e) {
        event.sender.send("send-finish", "error", e.message);
        console.log(e);
    }
});

ipcMain.on("create-paper-wallet", (event, name, addToWallet) => {
    let wif;
    if (addToWallet) {
        const addr = getNewAddress(name);
        mainWindow.webContents.send("generate-wallet-response",
            JSON.stringify({response: "OK", addr: addr}));
        wif = addr.wif;
    } else {
        wif = generateNewAddress(1, userInfo.pass)[0];
    }
    mainWindow.webContents.send("export-paper-wallet", wif, name);
});

ipcMain.on("renderer-show-message-box", (event, msgStr, buttons) => {
    buttons = buttons.concat([tr("warmingMessages.cancel","Cancel")]);
    dialog.showMessageBox({type: "warning", title: "Important Information", message: msgStr, buttons: buttons, cancelId: -1 }, function(response) {
      event.returnValue = response;
    });
});


ipcMain.on("get-all-Z-addresses", (event) => {
    const zAddrObjs = sqlSelectObjects("SELECT addr, name, lastbalance,pk FROM wallet where length(addr)=95");
    event.returnValue = zAddrObjs;
});

ipcMain.on("update-addr-in-db", (event,addrObj) => {
    sqlRun("UPDATE wallet SET lastbalance = ? WHERE addr = ?", addrObj.lastbalance, addrObj.addr);
    event.returnValue = true;
});


ipcMain.on("get-address-object", (event,fromAddress) => {
    let addrObjs = sqlSelectObjects("SELECT * FROM wallet WHERE addr = ?", fromAddress)[0];
    event.returnValue = addrObjs;
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
