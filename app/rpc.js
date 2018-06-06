// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {ipcRenderer} = require("electron");
const {openTunnel} = require("./ssh_tunneling.js");
const {zenextra} = require("./zenextra.js");
const zencashjs = require("zencashjs");
const delay = require("delay");

let sshServer;
let howManyUseSSH;

function clientCallSync(methodUsed, paramsUsed) {
    const rpc = require("node-json-rpc2");
    let options = {
        port: settings.secureNodePort,
        host: "127.0.0.1", // settings.secureNodeFQDN,
        user: settings.secureNodeUsername,
        password: settings.secureNodePassword,
        protocol: "http",
        // method:"POST",
        path: "/",
        strict: true
    };

    let client = new rpc.Client(options);
    return new Promise(function (resolve, reject) {
        client.call({
            method: methodUsed,
            params: paramsUsed, // Will be [] by default
            id: "rpcTest", // Optional. By default it's a random id
            jsonrpc: "1.0", // Optional. By default it's 2.0
            protocol: "http", // Optional. Will be http by default
        }, function (error, result) {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        });
    });
}

const clientCallSyncRetry = async (methodUsed, paramsUsed, n, delayMiliSecs) => {
    for (let i = 0; i < n; i++) {
        if (i > 0) {
            await delay(delayMiliSecs);
        }
        try {
            return await clientCallSync(methodUsed, paramsUsed);
        } catch (err) {
            const isLastAttempt = i + 1 === n;
            if (isLastAttempt) throw err;
        }
    }
};

async function rpcCallCoreSync(methodUsed, paramsUsed) {
    let status = "ok";
    let outputCore;

    if (howManyUseSSH === undefined) {
        howManyUseSSH = 1;
    } else {
        howManyUseSSH = howManyUseSSH + 1;
    }

    let tunnelToLocalHost = (settings.secureNodeFQDN === "127.0.0.1" || settings.secureNodeFQDN.toLowerCase() === "localhost");

    if (sshServer === undefined && howManyUseSSH <= 1 && !tunnelToLocalHost) {
        try {
            sshServer = await openTunnel();
            console.log("SSH Tunnel to Server: Opened");
        } catch (error) {
            console.log(error);
            // console.log("Already open, no problem.");
        }
    }

    // FIXME: colorRpcLEDs - element is not exported
    try {
        outputCore = await clientCallSyncRetry(methodUsed, paramsUsed, 3, 1000); // 3 is retries, 1000 is 1 sec delay
        colorRpcLEDs(true); // false = Red // true = Green
    } catch (error) {
        outputCore = "rpcCallCoreSync error in method : " + methodUsed + " ";
        status = "error";
        console.log(outputCore);
        colorRpcLEDs(false); // false = Red
        //throw new Error("Error using method " + methodUsed);
    }

    howManyUseSSH = howManyUseSSH - 1;
    if (howManyUseSSH === 0 || howManyUseSSH < 0) {
        if (!tunnelToLocalHost && !(sshServer === undefined)) { //
            sshServer.close();
            sshServer = undefined;
            console.log("SSH Tunnel to Server: Closed");
        }
    }

    // console.log(outputCore);

    return {output: outputCore, status: status}
}

// ====== String Formating ===============================================
function cleanCommandString(string) {
    // removes 1st and last white space -- removes double spacing
    return string.replace(/\s+$/, "").replace(/ +(?= )/g, "");
}

function removeOneElement(array, element) {
    const index = array.indexOf(element);
    array.splice(index, 1);
}

function splitCommandString(stringCommand) {
    let splitString = stringCommand.split(/\s+/);
    let method = splitString[0];
    removeOneElement(splitString, method);
    // let params = splitString;
    return {method: method, params: splitString}
}

//=====================================================
// rpcCallResultSync and rpcCallCoreSync can be combined, but it is more clear to keep them like this
async function rpcCallResultSync(cmd, paramsUsed) {
    let status = "error";
    let isOK = false;
    let respCore;
    let outputLast;

    respCore = await rpcCallCoreSync(cmd, paramsUsed);

    if (respCore.status === "error") {
        outputLast = respCore.output;
        status = "error";
    } else {
        outputLast = (respCore.output.result);
        status = "ok";
        isOK = true;
    }

    return {output: outputLast, status: status, isOK: isOK}
}

async function helpSync() {
    let cmd;
    cmd = "help";
    let result = await rpcCallResultSync(cmd, []);
    console.log(result);
}

async function importPKinSN(pk, address) {
    if (pk === undefined) {
        return {output: "No PK given.", status: "ok"}
    } else {
        let cmd;
        if (zenextra.isZeroAddr(address)) {
            cmd = "z_importkey";
            if (zenextra.isPK(pk)) {
                pk = zencashjs.zaddress.zSecretKeyToSpendingKey(pk);
            }
        }
        if (zenextra.isTransaparentAddr(address)) {
            cmd = "importprivkey";
            if (!zenextra.isWif(pk)) {
                pk = zencashjs.address.privKeyToWIF(pk);
            }
        }
        return await rpcCallResultSync(cmd, [pk, "no"]);
    }
}

async function pingSecureNodeRPC() {
    let resp = await rpcCallResultSync("help", []);
    return resp.isOK  // if resp.isOK = isAlive
}

async function getNewZaddressPK(nameAddress) {
    let resp = await rpcCallResultSync("z_getnewaddress", []);
    let zAddress = resp.output;
    let newResp = await rpcCallResultSync("z_exportkey", [zAddress]);  // let spendingKey = newResp.output;
    if (newResp.isOK) {
        let pkZaddress = zenextra.spendingKeyToSecretKey(newResp.output);
        ipcRenderer.send("DB-insert-address", nameAddress, pkZaddress, zAddress);
        return {pk: pkZaddress, addr: zAddress, name: nameAddress}
    }
}

// Unused for now but can be used in the future
async function getNewTaddressPK(nameAddress) {
    let resp = await rpcCallResultSync("getnewaddress", []);
    let tAddress = resp.output;
    let newResp = await rpcCallResultSync("dumpprivkey", [tAddress]); // let wif = newResp.output;
    if (newResp.isOK) {
        let pkTaddress = zencashjs.address.WIFToPrivKey(newResp.output);
        ipcRenderer.send("DB-insert-address", nameAddress, pkTaddress, tAddress);
        return tAddress
    }
}

async function getNewTaddressWatchOnly(nameAddress) {
    let resp = await rpcCallResultSync("getnewaddress", []);
    if (resp.isOK) {
        let tAddress = resp.output;
        let pkTaddress = "watchOnlyAddrr";
        ipcRenderer.send("DB-insert-address", nameAddress, pkTaddress, tAddress);
        return tAddress
    }
}

async function getSecureNodeTaddressOrGenerate() {
    let resp = await rpcCallResultSync("listaddresses", []);
    console.log(resp.output);
    let theT;
    let nameAddress = "My Watch Only Secure Node addr";
    let pkTaddress = "watchOnlyAddrr";

    if (resp.isOK) {
        if (resp.output.length === 0) {
            theT = await getNewTaddressWatchOnly(nameAddress)
        } else {
            theT = resp.output[0];
            let respNew = ipcRenderer.sendSync("check-if-address-in-wallet", theT);
            let addrExists = respNew.exist;

            if (!addrExists) {
                ipcRenderer.send("DB-insert-address", nameAddress, pkTaddress, theT);
            }
        }
        return theT
    } else {
        return false
    }

}

async function getOperationStatus(opid) {
    let resp = await rpcCallResultSync("z_getoperationstatus", [[opid]]);
    return resp.output
}

async function getZaddressBalance(pk, address) {
    let balance = -1.0;
    let resp = await rpcCallResultSync("z_getbalance", [address]);
    if (resp.isOK) {
        balance = parseFloat(resp.output); //.toFixed(8)
        return {balance: balance, status: resp.status}
    } else {
        console.log(resp.status);
        return {balance: balance, status: resp.status}
    }
}

async function getTaddressBalance(address) {
    let balance = -1.0;
    let resp = await rpcCallResultSync("z_getbalance", [address]);
    if (resp.isOK) {
        balance = parseFloat(resp.output).toFixed(8);
        return {balance: balance, status: resp.status}
    } else {
        console.log(resp.status);
        return {balance: balance, status: resp.status}
    }
}

async function updateAllZBalances() {
    const valid = ipcRenderer.sendSync("update-Z-old-balance");
    const zAddrObjs = ipcRenderer.sendSync("get-all-Z-addresses");
    for (const addrObj of zAddrObjs) {
        let newBalanceResp = await getZaddressBalance(addrObj.pk, addrObj.addr);
        let newBalance = newBalanceResp.balance;
        if (newBalance >= 0.0) {
            addrObj.lastbalance = newBalance;
            let respZ = ipcRenderer.sendSync("update-addr-in-db", addrObj);
        }
    }
}

async function listAllTAddresses() {
    // let resp = await rpcCallResultSync("listaddresses", []);
    return await rpcCallResultSync("listaddresses", [])
}

async function listAllZAddresses() {
    // let resp = await rpcCallResultSync("z_listaddresses", []);
    return await rpcCallResultSync("z_listaddresses", [])
}

async function getPKofZAddress(zAddr) {
    const cmd = "z_exportkey";
    let paramsUsed = [zAddr];
    // let spendingKey = resp.output;
    // let resp = await rpcCallResultSync(cmd, paramsUsed);
    return await rpcCallResultSync(cmd, paramsUsed)
}

async function importAllZAddressesFromSNtoArizen() {
    let addrList = [];
    let resp = await listAllZAddresses();
    // console.log(resp);
    addrList = resp.output;
    if (resp.isOK) {
        if (!(addrList === undefined || addrList.length === 0)) {
            for (const addr of addrList) {
                let resp = await getPKofZAddress(addr);
                //let spendingKey = resp.output;
                let pk = zenextra.spendingKeyToSecretKey(resp.output); //spendingKey
                let isT = false;
                ipcRenderer.send("import-single-key", "My SN Z addr", pk, isT);
            }
        }
    }
}

async function importAllZAddressesFromArizentoSN() {
    const zAddrObjs = ipcRenderer.sendSync("get-all-Z-addresses");
    let nullResp;
    for (const addrObj of zAddrObjs) {
        nullResp = await importPKinSN(addrObj.pk, addrObj.addr);
    }
}

async function sendFromOrToZaddress(fromAddressPK, fromAddress, toAddress, amount, fee) {
    //let nullResp = await importPKinSN(fromAddressPK, fromAddress);
    let minconf = 1;
    let amounts = [{"address": toAddress, "amount": amount}];
    let cmd = "z_sendmany";
    let paramsUsed = [fromAddress, amounts, minconf, fee];
    let resp = await rpcCallResultSync(cmd, paramsUsed);
    console.log("opid: " + resp.output);
    console.log(resp.status);
    // FIXME: updateWithdrawalStatus - element is not exported
    updateWithdrawalStatus(resp.status, resp.output);
    return resp
}

// FIXME: rpcCallCoreSync, getZaddressBalance, getOperationStatus, importPKinSN, and helpSync are unused
module.exports = {
    cleanCommandString: cleanCommandString,
    splitCommandString: splitCommandString,
    // rpcCallCoreSync: rpcCallCoreSync,
    rpcCallResultSync: rpcCallResultSync,
    getNewZaddressPK: getNewZaddressPK,
    // getZaddressBalance: getZaddressBalance,
    sendFromOrToZaddress: sendFromOrToZaddress,
    // getOperationStatus: getOperationStatus,
    updateAllZBalances: updateAllZBalances,
    importAllZAddressesFromSNtoArizen: importAllZAddressesFromSNtoArizen,
    importAllZAddressesFromArizentoSN: importAllZAddressesFromArizentoSN,
    // importPKinSN: importPKinSN,
    pingSecureNodeRPC: pingSecureNodeRPC,
    getSecureNodeTaddressOrGenerate: getSecureNodeTaddressOrGenerate,
    getTaddressBalance: getTaddressBalance,
    helpSync: helpSync
};
