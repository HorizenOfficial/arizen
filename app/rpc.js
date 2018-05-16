// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {ipcRenderer} = require("electron");
const {openTunnel} = require("./ssh_tunneling.js");
const {zenextra} = require("./zenextra.js");
const zencashjs = require("zencashjs");

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
        //method:'POST',
        path: "/",
        strict: true
    };

    let client = new rpc.Client(options);
    return new Promise(function(resolve, reject){
      client.call({
          method: methodUsed,
          params: paramsUsed, // Will be [] by default
          id: "rpcTest", // Optional. By default it's a random id
          jsonrpc: "1.0", // Optional. By default it's 2.0
          protocol: "http", // Optional. Will be http by default
      }, function(error, result){
        if(error){
            reject(error);
        }
        else {
            resolve(result);
        }
    })
});
}

async function rpcCallCoreSync(methodUsed, paramsUsed) {
    //console.log("==============================================================");
    //console.log(howManyUseSSH);
    //console.log(sshServer);
    let status = "ok"
    let outputCore;

    if (howManyUseSSH === undefined) {
        howManyUseSSH = 1;
    } else {
        howManyUseSSH = howManyUseSSH + 1;
    }
    //console.log(howManyUseSSH);

    let tunnelToLocalHost = (settings.secureNodeFQDN === "127.0.0.1" || settings.secureNodeFQDN.toLowerCase() === "localhost");

    if (sshServer === undefined && howManyUseSSH <= 1 && !tunnelToLocalHost) {
      //console.log(sshServer);
      try {
        sshServer = await openTunnel();
        console.log("SSH Tunnel to Server: Opened");
      } catch(error) {
        console.log(error);
        //console.log("Already open, no problem.");
      }
    }


    try {
        outputCore = await clientCallSync(methodUsed, paramsUsed);
        colorRpcLEDs(true); // false = Red // true = Green
    } catch (error){
        outputCore = "rpcCallCoreSync error in method : " + methodUsed + " ";
        status = "error"
        console.log(outputCore);
        colorRpcLEDs(false); // false = Red
        //new Error('Error :  using method ' + methodUsed);

    }

    howManyUseSSH = howManyUseSSH - 1;
    //console.log(howManyUseSSH);
    //console.log(sshServer);
    if (howManyUseSSH === 0 || howManyUseSSH < 0) {
        if (!tunnelToLocalHost) {
            sshServer.close();
            sshServer = undefined;
            console.log("SSH Tunnel to Server: Closed");
        }
    }

    //console.log(outputCore);

    return {output: outputCore, status:status}
}

//====== String Formating===============================================
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
    let params = splitString;
    return {method: method, params: params}
}
//=====================================================

async function rpcCallResultSync(cmd, paramsUsed) {
    let status = "ok";
    let respCore;
    let outputLast;

    try {
        respCore = await rpcCallCoreSync(cmd, paramsUsed);
    } catch(error){
        return {output: error, status:"error"}
    }

    if (respCore.error) {
        console.log(respCore.error);
        console.log(JSON.stringify(respCore.error));
        outputLast = err;
        status = "error";
    } else {
        outputLast = (respCore.output.result);
    }

    return {output: outputLast, status:status}
  }

//

async function helpSync() {
    let cmd;
    cmd = "help";
    const result = await rpcCallResultSync(cmd, []);
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
        let resp =  await rpcCallResultSync(cmd, [pk, "no"]);
        return resp
    }
}

async function pingSecureNodeRPC() {
    let resp = await rpcCallResultSync("help", []);
    let isAlive = false;
    if (resp.status === "ok") {
        isAlive = true;
    }
    return isAlive
}

async function getNewZaddressPK(nameAddress) {
    let resp = await rpcCallResultSync("z_getnewaddress", []);
    let zAddress = resp.output;
    let newResp = await rpcCallResultSync("z_exportkey", [zAddress]);
    // let spendingKey = output;
    let pkZaddress = zenextra.spendingKeyToSecretKey(newResp.output);
    ipcRenderer.send("DB-insert-address", nameAddress, pkZaddress, zAddress);
    return {pk: pkZaddress, addr: zAddress, name:  nameAddress}
}

// Unused for now but can be used in the future
async function getNewTaddressPK(nameAddress) {
    let resp = await rpcCallResultSync("getnewaddress", []);
    let tAddress = resp.output;
    let newResp = await rpcCallResultSync("dumpprivkey", [taddress]);
    // let wif = newResp.output;
    let pkTaddress = zencashjs.address.WIFToPrivKey(newResp.output);
    ipcRenderer.send("DB-insert-address", nameAddress, pkTaddress, tAddress);
    return tAddress
}

async function getNewTaddressWatchOnly(nameAddress) {
    let resp = await rpcCallResultSync("getnewaddress", []);
    let tAddress = resp.output;
    let pkTaddress = "watchOnlyAddrr";
    ipcRenderer.send("DB-insert-address", nameAddress, pkTaddress, tAddress);
    return tAddress
}

async function getSecureNodeTaddressOrGenerate() {
    let resp = await rpcCallResultSync("listaddresses",[]);
    console.log(resp.output);
    let theT;
    let nameAddress = "My Watch Only Secure Node addr";
    let pkTaddress = "watchOnlyAddrr";

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
}


async function getOperationStatus(opid) {
    let resp = await rpcCallResultSync("z_getoperationstatus",[[opid]]);
    let statusTx = resp.output;
    //console.log(JSON.stringify(statusTx[0]));
    return statusTx
}

async function getZaddressBalance(pk, zAddress) {
    //let nullResp = await importPKinSN(pk, zAddress);
    let resp = await rpcCallResultSync("z_getbalance", [zAddress]);
    if (resp.status === "ok") {
        let balance = parseFloat(resp.output).toFixed(8);
        return balance;
    } else {
        console.log(resp.status);
        return resp.status;
    }
}

async function getTaddressBalance(address) {
    let resp = await rpcCallResultSync("z_getbalance", [address]);
    if (resp.status === "ok") {
        let balance = parseFloat(resp.output).toFixed(8);
        return {balance: balance, status: resp.status}
    } else {
        console.log(resp.status);
        return {balance: -1.0, status: resp.status}
    }
}

async function updateAllZBalances() {
    const zAddrObjs = ipcRenderer.sendSync("get-all-Z-addresses");
    for (const addrObj of zAddrObjs) {
        let newBalance = await getZaddressBalance(addrObj.pk, addrObj.addr);
        if(newBalance >= 0.0){
            addrObj.lastbalance = newBalance;
            let respZ = ipcRenderer.sendSync("update-addr-in-db", addrObj);
      }
    }
}

async function listAllTAddresses() {
    let resp = await rpcCallResultSync("listaddresses", []);
    return resp
}

async function listAllZAddresses() {
    let resp = await rpcCallResultSync("z_listaddresses", []);
    return resp
}

async function getPKofZAddress(zAddr) {
    const cmd = "z_exportkey";
    let paramsUsed = [zAddr];
    let resp = await rpcCallResultSync(cmd, paramsUsed); // let spendingKey = resp.output;
    return resp
}

async function importAllZAddressesFromSNtoArizen() {
    let resp = await listAllZAddresses();
    //console.log(resp);
    let addrList = resp.output;
    //console.log(addrList);
    for (const addr of addrList) {
        let resp = await getPKofZAddress(addr);
        //let spendingKey = resp.output;
        let pk = zenextra.spendingKeyToSecretKey(resp.output); //spendingKey
        let isT = false;
        ipcRenderer.send("import-single-key", "My SN Z addr", pk, isT);
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
    updateWithdrawalStatus(resp.status,resp.output)
    return resp
}

module.exports = {
    cleanCommandString: cleanCommandString,
    splitCommandString: splitCommandString,
    rpcCallCoreSync: rpcCallCoreSync,
    rpcCallResultSync: rpcCallResultSync,
    getNewZaddressPK: getNewZaddressPK,
    getZaddressBalance: getZaddressBalance,
    sendFromOrToZaddress: sendFromOrToZaddress,
    getOperationStatus: getOperationStatus,
    updateAllZBalances: updateAllZBalances,
    importAllZAddressesFromSNtoArizen: importAllZAddressesFromSNtoArizen,
    importAllZAddressesFromArizentoSN: importAllZAddressesFromArizentoSN,
    importPKinSN: importPKinSN,
    pingSecureNodeRPC: pingSecureNodeRPC,
    getSecureNodeTaddressOrGenerate: getSecureNodeTaddressOrGenerate,
    getTaddressBalance: getTaddressBalance,
    helpSync: helpSync
};
