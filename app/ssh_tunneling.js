// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const openSshTunnel = require("open-ssh-tunnel");
const fs = require('fs-extra');

const localHost = "127.0.0.1";

async function openTunnel() {

    const options = {
        host: settings.secureNodeFQDN,// SSH server //settings.secureNodeFQDN,
        port: settings.sshPort, // SSH port
        // keepAlive:true,
        //privateKey: fs.readFileSync(settings.sshPrivateKey), //settings.secureNodeSshPrivateKey,
        //passphrase: settings.sshPassphrase, //settings.secureNodeSshPassphrase,
        username: settings.sshUsername, //settings.secureNodeUsername,
        //password: settings.sshPassword, //settings.secureNodePassword,
        srcPort: settings.secureNodePort, // Arizen localhost port //settings.secureNodePort
        srcAddr: localHost, // Arizen localhost
        dstPort: settings.secureNodePort, // Service localhost port //settings.secureNodePort
        dstAddr: localHost, // Service localhost
        readyTimeout: settings.readyTimeout,
        forwardTimeout: settings.forwardTimeout,
        localPort: settings.secureNodePort, // SSH client localhost port
        localAddr: localHost // SSH client localhost
    };

    if (settings.sshPassword) {
        options.password =  settings.sshPassword;
    } else {
        options.privateKey = fs.readFileSync(settings.sshPrivateKey);
        options.passphrase = settings.sshPassphrase
    }

    const server = await openSshTunnel(options);

    return server
}

module.exports = {
    openTunnel: openTunnel
};
