"use strict";

let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
let xhr = new XMLHttpRequest();

// 8346870 - latest v1.0.1
// let url = "https://api.github.com/repos/ZencashOfficial/arizen/releases/8252416";
// 8252416 - v1.0.0
let url = "https://api.github.com/repos/ZencashOfficial/arizen/releases/8252416";

xhr.open("GET", url, true);
xhr.onload = function () {
    let resp = JSON.parse(xhr.responseText);
    if (xhr.readyState === 4 && (xhr.status === "200")) {
        console.log(resp);
        for (let i = 0; i < resp["assets"].length; i++){
            let obj = resp["assets"][i];
            console.log("Downloaded: " + obj["download_count"] + ", " + obj["name"]);
        }
    } else {
        console.error(resp);
    }
};

xhr.send(null);
