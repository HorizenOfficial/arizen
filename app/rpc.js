const {ipcRenderer} = require("electron");
const {openTunnel} = require("./ssh_tunneling.js");
const {zenextra} = require("./zenextra.js");
const zencashjs = require("zencashjs");

var sshServer;
var howManyUseSSH;

function getRpcClientSecureNode() {
    const rpc = require('node-json-rpc2');
    let options = {
        port: settings.secureNodePort,
        host: "127.0.0.1",//settings.secureNodeFQDN,
        user: settings.secureNodeUsername,
        password: settings.secureNodePassword,
        protocol: "http",
        //method:'POST',
        path: "/",
        strict: true
    };

    return new rpc.Client(options);
}

async function rpcCallCore(methodUsed, paramsUsed, callbackFunction) {
    let client = getRpcClientSecureNode();
    if (howManyUseSSH === undefined) {
        howManyUseSSH = 1;
    } else {
        howManyUseSSH = howManyUseSSH + 1;
    }

    let tunnelToLocalHost = (settings.secureNodeFQDN === "127.0.0.1" || settings.secureNodeFQDN.toLowerCase() === "localhost");

    if (sshServer === undefined && !tunnelToLocalHost) {
        sshServer = await openTunnel();
    }

    client.call({
        method: methodUsed,
        params: paramsUsed,//Will be [] by default
        id: 'rpcTest', //Optional. By default it's a random id
        jsonrpc: '1.0', //Optional. By default it's 2.0
        protocol: 'https', //Optional. Will be http by default
    }, function (err, res) {
        setTimeout(function () {
            howManyUseSSH = howManyUseSSH - 1;
            if (howManyUseSSH === 0 || howManyUseSSH < 0) {
                if (!tunnelToLocalHost) {
                    sshServer.close();
                    sshServer = undefined;
                }
            }
        }, 3000);
        callbackFunction(err, res)
    });
}

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
    method = splitString[0];
    removeOneElement(splitString, method);
    params = splitString;
    return {method: method, params: params}
}

function rpcCallResult(cmd, paramsUsed, callback) {
    let status = "ok";
    let output;
    rpcCallCore(cmd, paramsUsed, function (err, res) {
        if (err) {
            console.log(err);
            console.log(JSON.stringify(err));
            output = err;
            status = "error";
        } else {
            output = (res.result); //JSON.stringify
        }
        callback(output, status)
    });
}

function importPKinSN(pk, address, callback) {
    if (pk === undefined){
        callback();
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
        rpcCallResult(cmd, [pk, "no"], callback);
    }
}

function help(callback) {
    let cmd;
    cmd = "help";
    rpcCallResult(cmd, [], function (output, status) {
        callback(output, status)
    });
}

function pingSecureNodeRPC(callback) {
    let cmd;
    cmd = "help";
    rpcCallResult(cmd, [], function (output, status) {
        let isAlive = false;
        if (status === "ok") {
            isAlive = true;
        }
        callback(isAlive);
    });
}

function getNewZaddressPK(nameAddress) {
    const cmd = "z_getnewaddress";
    rpcCallResult(cmd, [], function (output, status) {
        let zAddress = output;
        const newCmd = "z_exportkey";
        let paramsUsed = [zAddress];
        rpcCallResult(newCmd, paramsUsed, function (output, status) {
            let spendingKey = output;
            let pkZaddress = zenextra.spendingKeyToSecretKey(spendingKey);
            ipcRenderer.send("DB-insert-address", nameAddress, pkZaddress, zAddress);
        });
    });
}

function getNewTaddressPK(nameAddress) {
    const cmd = "getnewaddress";
    rpcCallResult(cmd, [], function (output, status) {
        let tAddress = output;
        const newCmd = "dumpprivkey";
        let paramsUsed = [taddress];
        rpcCallResult(newCmd, paramsUsed, function (output, status) {
            let wif = output;
            let pkTaddress = zencashjs.address.WIFToPrivKey(wif);
            ipcRenderer.send("DB-insert-address", nameAddress, pkTaddress, tAddress);
        });
    });
}

function getNewTaddressWatchOnly(nameAddress, callback) {
    const cmd = "getnewaddress";
    rpcCallResult(cmd, [], function (output, status) {
        let tAddress = output;
        let pkTaddress = "watchOnlyAddrr"
        ipcRenderer.send("DB-insert-address", nameAddress, pkTaddress, tAddress);
        callback(tAddress)
        });
}

function getSecureNodeTaddressOrGenerate(callback){
  const cmd = "listaddresses"; // listaddresses // getnewaddress
  rpcCallResult(cmd, [], function (output, status) {
    console.log(output);
    let theT;
    let nameAddress = "My Watch Only Secure Node addr";
    let pkTaddress = "watchOnlyAddrr";

    if (output.length === 0){
      getNewTaddressWatchOnly(nameAddress,calback)
    } else {
      theT = output[0];
      let resp = ipcRenderer.sendSync("check-if-address-in-wallet", theT);
      let addrExists = resp.exist;

      if (addrExists){
          callback(theT);
      } else {
          ipcRenderer.send("DB-insert-address", nameAddress, pkTaddress, theT);
          callback(theT);
      }
    }
      //let tAddress = output;
      //let pkTaddress = "watchOnlyAddrr"
      //ipcRenderer.send("DB-insert-address", nameAddress, pkTaddress, tAddress);
      //callback(tAddress)
      });
}


//
function getOperationStatus(opid) {
    const cmd = "z_getoperationstatus";
    let paramsUsed = [[opid]];
    rpcCallResult(cmd, paramsUsed, function (output, status) {
        let statusTx = output; //console.log(JSON.stringify(statusTx[0]));
    });
}

//

function getZaddressBalance(pk, zAddress, callback) {
    importPKinSN(pk, zAddress, function () {
        const cmd = "z_getbalance";
        let paramsUsed = [zAddress];
        rpcCallResult(cmd, paramsUsed, function (output, status) {
            if (status === "ok") {
                balance = parseFloat(output).toFixed(8);
                callback(balance);
            } else {
                console.log(status);
            }
        });
    });
}

function getTaddressBalance(address, callback) {
    const cmd = "z_getbalance";
    let paramsUsed = [address];
    rpcCallResult(cmd, paramsUsed, function (output, status) {
        if (status === "ok") {
            balance = parseFloat(output).toFixed(8);
            callback(balance);
        } else {
            console.log(status);
        }
    });
}

function updateAllZBalances() {
    const zAddrObjs = ipcRenderer.sendSync("get-all-Z-addresses");
    for (const addrObj of zAddrObjs) {
        getZaddressBalance(addrObj.pk, addrObj.addr, function (newBalance) {
            addrObj.lastbalance = newBalance;
            let resp = ipcRenderer.sendSync("update-addr-in-db", addrObj);
        })
    }
}

//

function listAllZAddresses(callback) {
    const cmd = "z_listaddresses";
    rpcCallResult(cmd, [], callback);
}

function getPKofZAddress(zAddr, callback) {
    const cmd = "z_exportkey";
    let paramsUsed = [zAddr];
    rpcCallResult(cmd, paramsUsed, function (output, status) {
        let spendingKey = output;
        callback(spendingKey, status)
    });
}

function importAllZAddressesFromSNtoArizen() {
    listAllZAddresses(function (output, status) {
        for (const addr of output) {
            getPKofZAddress(addr, function (spendingKey, status) {
                let pk = zenextra.spendingKeyToSecretKey(spendingKey);
                ipcRenderer.send("import-single-key", "My SN Z addr", pk, isT = false);
            })
        }
    });
}
//
function listAllTAddresses(callback) {
    const cmd = "listaddresses";
    rpcCallResult(cmd, [], callback);
}

function getTAddressOrCreateInSecureNode(callback) {
    listAllTAddresses(function (output, status) {
        if (output === undefined || output.length == 0) {
           // get new Address
           getNewTaddressWatchOnly("My SN watch Only addr", function(tAddress){
               callback(tAddress)
           });
        } else {
            callback(output[0])
        }

    });

}
//
function sendFromOrToZaddress(fromAddressPK, fromAddress, toAddress, amount, fee) {
    importPKinSN(fromAddressPK, fromAddress, function () {
        let minconf = 1;
        let amounts = [{"address": toAddress, "amount": amount}]; //,"memo":"memo"
        let cmd = "z_sendmany";
        if (zenextra.isTransaparentAddr(fromAddress)) {
            cmd = "z_sendmany";
        }

        let paramsUsed = [fromAddress, amounts, minconf, fee];
        console.log(paramsUsed);
        rpcCallResult(cmd, paramsUsed, function (output, status) {
            let opid = output;
            getOperationStatus(opid);
            console.log(opid);
            console.log(status);
            if (status === "error") {
                msg = output;
                result = status;
            }
            if (status === "ok") {
                msg = output;
                result = status;
            }

            updateWithdrawalStatus(result, msg)
        });
    });
}

module.exports = {
    cleanCommandString: cleanCommandString,
    rpcCallResult: rpcCallResult,
    splitCommandString: splitCommandString,
    getNewZaddressPK: getNewZaddressPK,
    getZaddressBalance: getZaddressBalance,
    sendFromOrToZaddress: sendFromOrToZaddress,
    getOperationStatus: getOperationStatus,
    updateAllZBalances: updateAllZBalances,
    importAllZAddressesFromSNtoArizen: importAllZAddressesFromSNtoArizen,
    importPKinSN: importPKinSN,
    pingSecureNodeRPC: pingSecureNodeRPC,
    getSecureNodeTaddressOrGenerate: getSecureNodeTaddressOrGenerate,
    getTaddressBalance: getTaddressBalance
    //getOperationResult: getOperationResult
};
