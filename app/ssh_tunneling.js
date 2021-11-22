// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const tunnel = require('tunnel-ssh');
const fs = require('fs-extra');

const localHost = "127.0.0.1";

async function openTunnel() {

    const options = {
        host: settings.secureNodeFQDN,// SSH server //settings.secureNodeFQDN,
        port: settings.sshPort, // SSH port
        // keepAlive:true,
        username: settings.sshUsername, //settings.secureNodeUsername,
        srcPort: settings.secureNodePort, // Arizen localhost port //settings.secureNodePort
        srcHost: localHost, // Arizen localhost
        dstPort: settings.secureNodePort, // Service localhost port //settings.secureNodePort
        dstHost: localHost, // Service localhost
        readyTimeout: settings.readyTimeout,
        forwardTimeout: settings.forwardTimeout,
        localPort: settings.secureNodePort, // SSH client localhost port
        localHost: localHost // SSH client localhost
    };

    if (settings.sshPassword) {
        options.password =  settings.sshPassword;
    } else {
        options.privateKey = fs.readFileSync(settings.sshPrivateKey);
        options.passphrase = settings.sshPassphrase
    }

    const server = await new Promise((resolve, reject) => {
        try {
          tunnel(
            options,
            (error, server) => {
              if (error != null) {
                console.log("ssh tunnel creation failed", error);
                reject(error);
                return;
              }
              console.log("ssh tunnel created");
              resolve(server);
            }
          ).on("error", (error) => {
            console.error("ssh tunnel error",error);
            reject(error);
          });
        } catch (error) {
          console.error("ssh tunnel construction failed", error);
          reject(error);
        }
      });

    return server;
}

module.exports = {
    openTunnel: openTunnel
};
