// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const openSshTunnel = require("open-ssh-tunnel");

const localHost = "127.0.0.1";

async function openTunnel() {
    const server = await openSshTunnel({
        host: settings.secureNodeFQDN,// SSH server //settings.secureNodeFQDN,
        port: settings.sshPort, // SSH port
        // keepAlive:true,
        privateKey: settings.sshPrivateKey, //settings.secureNodeSshPrivateKey,
        username: settings.sshUsername, //settings.secureNodeUsername,
        password: settings.sshPassword, //settings.secureNodePassword,
        srcPort: settings.secureNodePort, // Arizen localhost port //settings.secureNodePort
        srcAddr: localHost, // Arizen localhost
        dstPort: settings.secureNodePort, // Service localhost port //settings.secureNodePort
        dstAddr: localHost, // Service localhost
        readyTimeout: settings.readyTimeout,
        forwardTimeout: settings.forwardTimeout,
        localPort: settings.secureNodePort, // SSH client localhost port
        localAddr: localHost // SSH client localhost
    });

    return server
}

module.exports = {
    openTunnel: openTunnel
};
