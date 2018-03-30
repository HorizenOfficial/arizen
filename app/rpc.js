


function getRpcClientSecureNode(){
    const rpc = require('node-json-rpc2');

    var options = {
      port: settings.secureNodePort,
      host: settings.secureNodeFQDN,
      user: settings.secureNodeUsername,
      password: settings.secureNodePassword,
      //method:'POST',
      path: '/',
      strict: true
    };

    var client = new rpc.Client(options);
    return client;
}

function rpcCall(methodUsed,callbackFunction){

    var client = getRpcClientSecureNode();

    client.call({
        method:methodUsed,//Mandatory
        params:[],//Will be [] by default
        id:'rpcTest',//Optional. By default it's a random id
        jsonrpc:'1.0', //Optional. By default it's 2.0
        protocol:'https',//Optional. Will be http by default
    },callbackFunction);
}

function cleanCommandString(string){
    return string.replace(/\s+$/, '').replace(/ +(?= )/g,''); // removes 1st and last whute space -- removes double spacing
}




//exports. = rpcCall;

module.exports = {
  rpcCall: rpcCall,
  cleanCommandString: cleanCommandString
}
