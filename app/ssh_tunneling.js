const openSshTunnel = require('open-ssh-tunnel');

async function openATunnel() {
  const server = await openSshTunnel({
    host: "192.168.99.27",// SSH server //settings.secureNodeFQDN,
    port: 22, // SSH port
    //keepAlive:true,
    username: "", //settings.secureNodeUsername,
    password: "", //settings.secureNodePassword,
    srcPort: 8231, // Arizen localhost port //settings.secureNodePort
    srcAddr: '127.0.0.1', // Arizen localhost
    dstPort: 8231, // Service localhost port //settings.secureNodePort
    dstAddr: '127.0.0.1', // Service localhost
    readyTimeout: 10000,
    forwardTimeout: 10000,
    localPort: 8231, // SSH client localhost port
    localAddr: '127.0.0.1' // SSH client localhost
  });

  // you can now connect to your
  // forwarded tcp port!

  //console.log("Connection should be ok.");

  // later, when you want to close the tunnel
  //server.close();
  return server
}



module.exports = {
  openATunnel: openATunnel
}
