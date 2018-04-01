const {ipcRenderer} = require("electron");


function getRpcClientSecureNode(){
    const rpc = require('node-json-rpc2');

    var options = {
      port: settings.secureNodePort,
      host: settings.secureNodeFQDN,
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

    client.call({
        method:methodUsed,//Mandatory
        params:paramsUsed,//Will be [] by default
        id:'rpcTest',//Optional. By default it's a random id
        jsonrpc:'1.0', //Optional. By default it's 2.0
        protocol:'https',//Optional. Will be http by default
    },callbackFunction);
}
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
          console.log(err);
          output = err;
          status = "error";
      } else {
          output = (res.result); //JSON.stringify
      }
      //return {output:output, status:status };
      callback(output,status)
      });
}

function getNewZaddressPK(nameAddress){
  const cmd = "z_getnewaddress"
  rpcCallResult(cmd,[],function(output,status){
    zAddress = output;
    console.log(zAddress);
    const newCmd = "z_exportkey";
    let paramsUsed = [zAddress];
    rpcCallResult(newCmd,paramsUsed,function(output,status){
        pkZaddress = output;
        console.log(zAddress,pkZaddress);
        //return {pkZaddress:pkZaddress, zAddress:zAddress}
        ipcRenderer.send("generate-Z-address", nameAddress,pkZaddress,zAddress);

    });
  });
}

function getZaddressBalance(zAddress){
  const cmd = "z_getbalance"
  let paramsUsed = [zAddress];
  rpcCallResult(cmd,paramsUsed,function(output,status){
    balance = parseFloat(output).toFixed(8);
    console.log(balance);

    // rpcCallResult(newCmd,paramsUsed,function(output,status){
    //     pkZaddress = output;
    //     console.log(zAddress,pkZaddress);
    //     //return {pkZaddress:pkZaddress, zAddress:zAddress}
    //     ipcRenderer.send("generate-Z-address", nameAddress,pkZaddress,zAddress);
    //
    // });

  });
}


module.exports = {
  rpcCall: rpcCall,
  cleanCommandString: cleanCommandString,
  rpcCallResult: rpcCallResult,
  splitCommandString: splitCommandString,
  getNewZaddressPK: getNewZaddressPK,
  getZaddressBalance: getZaddressBalance
}
