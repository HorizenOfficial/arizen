const {ipcRenderer} = require("electron");


function getRpcClientSecureNode(){
    const rpc = require('node-json-rpc2');

    var options = {
      port: settings.secureNodePort,
      host: "127.0.0.1", //settings.secureNodeFQDN,
      user: settings.secureNodeUsername,
      password: settings.secureNodePassword,
      protocol:'http', // should change to https
      //method:'POST',
      path: '/',
      strict: true
    };

    var client = new rpc.Client(options);
    return client;
}


function rpcCall(methodUsed,paramsUsed,callbackFunction){

    var client = getRpcClientSecureNode();
    //console.log(client);

    var config = {
      username:"gsfakianakis",
      //Password:"ABC@1234",
      //keepAlive:true,
      host:"192.168.99.27", //"192.168.99.27",
      port:22, //22
      privateKey:require("fs").readFileSync("./../id_rsa.npm"),
      passphrase:"",
      dstHost:"127.0.0.1",
      dstPort:8231,
      localHost:"127.0.0.1",
      localPort: 8231

};


    var tunnel = require('tunnel-ssh');
    var server = tunnel(config, function (error, server) {
      if (error){
        console.log("SSH connection Error: " + error);
        console.log(error);
      } else {
        console.log("SSH server details: " + String(server));
        console.log(server);
      }

    client.call({
        method:methodUsed,//Mandatory
        params:paramsUsed,//Will be [] by default
        id:'rpcTest',//Optional. By default it's a random id
        jsonrpc:'1.0', //Optional. By default it's 2.0
        protocol:'http',//Optional. Will be http by default
    },callbackFunction);


    // setTimeout(function(){
    //   // you only need to close the tunnel by yourself if you set the
    //   // keepAlive:true option in the configuration !
    //   console.log("Closing...");
    //   server.close();
    // },20000);


    });
}

//
// function rpcCall(methodUsed,paramsUsed,callbackFunction){
//
//     var client = getRpcClientSecureNode();
//     //console.log(client);
//
//     client.call({
//         method:methodUsed,//Mandatory
//         params:paramsUsed,//Will be [] by default
//         id:'rpcTest',//Optional. By default it's a random id
//         jsonrpc:'1.0', //Optional. By default it's 2.0
//         protocol:'https',//Optional. Will be http by default
//     },callbackFunction);
// }
//
//
function cleanCommandString(string){
    return string.replace(/\s+$/, '').replace(/ +(?= )/g,''); // removes 1st and last whute space -- removes double spacing
}

function removeOneElement(array, element) {
    const index = array.indexOf(element);
    array.splice(index, 1);
}

function splitCommandString(stringCommand){
    let splitString = stringCommand.split(/\s+/);
    method = splitString[0];
    removeOneElement(splitString,method);
    params = splitString;
    return {method:method, params:params}
}

//

function rpcCallResult(cmd,paramsUsed, callback){
  let status = "OK";
  let output
  rpcCall(cmd,paramsUsed, function(err, res){
      if(err){
          // console.log(err);
          // console.log(JSON.stringify(err));
          output = err;
          status = "error";
          console.log(output);
      } else {
          output = (res.result); //JSON.stringify
      }
      callback(output,status)
      });
}

function importPKinSN(pk,callback){
    const cmd = "z_importkey";
    rpcCallResult(cmd,[pk],callback);
  //callback
}

function getNewZaddressPK(nameAddress){
  const cmd = "z_getnewaddress"
  rpcCallResult(cmd,[],function(output,status){
    zAddress = output;
    // console.log(zAddress);
    const newCmd = "z_exportkey";
    let paramsUsed = [zAddress];
    rpcCallResult(newCmd,paramsUsed,function(output,status){
        pkZaddress = output;
        // console.log(zAddress,pkZaddress);
        ipcRenderer.send("generate-Z-address", nameAddress,pkZaddress,zAddress);

    });
  });
}

function getOperationStatus(opid){
    const cmd = "z_getoperationstatus";
    let paramsUsed = [ [opid]];
    rpcCallResult(cmd,paramsUsed,function(output,status){
      let statusTx = output;
      console.log(JSON.stringify(statusTx[0]));
      console.log(status);
    });
}

// Not working - May be deleted
// function getOperationResult(opid){
//     const cmd = "z_getoperationresult";
//     let paramsUsed = [ [opid]];
//     rpcCallResult(cmd,paramsUsed,function(output,status){
//       let statusTx = output;
//       console.log(JSON.stringify(statusTx[0]));
//       console.log(status);
//     });
// }

function getZaddressBalance(pk,zAddress,callback){
  importPKinSN(pk,function(){
      const cmd = "z_getbalance"
      let paramsUsed = [zAddress];
      rpcCallResult(cmd,paramsUsed,function(output,status){
          balance = parseFloat(output);
          console.log(balance)
          callback(balance);
          // here your balance is available
  });
});
}


function updateAllZBalances(){
    const zAddrObjs = ipcRenderer.sendSync("get-all-Z-addresses");
    for (const addrObj of zAddrObjs) {
      console.log(addrObj.lastbalance);
        getZaddressBalance(addrObj.pk,addrObj.addr,function(newBalance){
            addrObj.lastbalance = 0.1 ;//newBalance;
            console.log(0.1111);
            let resp = ipcRenderer.sendSync("update-addr-in-db",addrObj);
        })
    }
}



function sendFromOrToZaddress(fromAddressPK,fromAddress,toAddress,amount,fee){
    importPKinSN(fromAddressPK,function(){
        let minconf = 1;
        let amounts = [{"address":toAddress,"amount":amount}]; //,"memo":"memo"
        //console.log(JSON.stringify(amounts));
        //console.log(amounts);
        const cmd = "z_sendmany";
        let paramsUsed = [fromAddress,amounts,minconf,fee];
        console.log(paramsUsed);
        rpcCallResult(cmd,paramsUsed,function(output,status){
          let opid = output;
          getOperationStatus(opid)
          console.log(opid);
          console.log(status);
        });
    });
}


module.exports = {
  rpcCall: rpcCall,
  cleanCommandString: cleanCommandString,
  rpcCallResult: rpcCallResult,
  splitCommandString: splitCommandString,
  getNewZaddressPK: getNewZaddressPK,
  getZaddressBalance: getZaddressBalance,
  sendFromOrToZaddress: sendFromOrToZaddress,
  getOperationStatus: getOperationStatus,
  updateAllZBalances: updateAllZBalances
  //getOperationResult: getOperationResult
}
