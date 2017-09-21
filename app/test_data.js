// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

let walletNames = ["My First Wallet", "My Second Wallet", "New Car", "Messenger Wallet"];

let wallets = [{id : 0, address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv524", balance: 110.00},
        {id : 0, address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv525", balance: 11.000},
        {id : 0, address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv526", balance: 20.000},
        {id : 1, address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv527", balance: 50.000},
        {id : 1, address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv528", balance: 16.000},
        {id : 2, address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv520", balance: 0.0000},
        {id : 2, address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv521", balance: 0.0000},
        {id : 2, address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv522", balance: 0.0000},
        {id : 3, address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv523", balance: 0.0000}];

let contacts = [{id: "ase554238bfghth", address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv123", nickname: "TheJedi", name: "Luke Skywalker"},
        {id: "ase514238bfghth", address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv123", nickname: "LittleAni", name: "Dart Vader"},
        {id: "ast554238bfghth", address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv123", nickname: "Captain", name: "James Tiberius Kirk"},
        {id: "rge554238bfghth", address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv123", nickname: "RingMaster", name: "Frodo Baggins"},
        {id: "bne559538bfghth", address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv123", nickname: "Ghost", name: "John Snow"},
        {id: "mse554238bfghth", address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv123", nickname: "Gunslinger", name: "Roland Deschain of Gilead"},
        {id: "anm554238b1ghth", address: "znbcGtStHjZdfWsRhZdZsffaetZZeDfv123", nickname: "Ironman", name: "Anthony Stark"}];


// Z and T adress of actual USER is known => only information about receiver of our message is stored.
let chat = [{id: "ase554238bfghth", direction: "to", message: "Hello"},
        {id: "ase554238bfghth", direction: "from", message: "Hi"}];