// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

document.addEventListener("keydown", escKeyDown, false);

function escKeyDown(e) {
    let keyCode = e.keyCode;
    if(keyCode===27) {
        closeAllMessengerDialogs();
    }
}


function clearMessageValue(){
    if (document.getElementById("sendToAddress").value === "Message") {
        document.getElementById("sendToAddress").value = "";
    }
}

function setMessageValueIfEmpty() {
    if (document.getElementById("sendToAddress").value === "") {
        document.getElementById("sendToAddress").value = "Message";
    }
}

function showDialog(clasname) {
    document.getElementById("darkContainer").style.transition = "0.5s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
    document.getElementById(clasname).style.zIndex = "2";
    document.getElementById(clasname).style.opacity = "1";
}

function closeDialog(clasname) {
    document.getElementById("darkContainer").style.transition = "0s";
    document.getElementById("darkContainer").style.opacity = "0";
    document.getElementById("darkContainer").style.zIndex = "-1";
    document.getElementById(clasname).style.zIndex = "-1";
    document.getElementById(clasname).style.opacity = "0";
}

function addContactDialog(edit=false) {
    if (edit) {
        // TODO: load contact
        document.getElementById("contactDialogTitle").textContent = "Edit Contact";
    }
    else {
        document.getElementById("contactDialogTitle").textContent = "Add Contact";
    }
    showDialog("addContactDialog");
}

function deleteContactDialog(edit=false) {
    // TODO: load contact
    showDialog("deleteContactDialog");
}

function deleteContact() {
    // Todo Look for contact with specific ID
    closeDialog("deleteContactDialog");
}

function saveContact() {
    // Todo Look for contact with specific ID
    closeDialog("addContactDialog");
}

function closeAllMessengerDialogs() {
    closeDialog("settingsDialog");
    closeDialog("aboutDialog");
    closeDialog("addContactDialog");
    closeDialog("deleteContactDialog");
    closeNav();
}

function printContact(cId, contact) {
    let contactClass = "";
    let contactName;
    let contactEnd = "</div>";
    if ((cId % 2) === 0) {
        contactClass = "<div class=\"contact contactOdd\" title=\"Address: "+ contact.address +"\">";
    } else {
        contactClass = "<div class=\"contact\" title=\"Address: "+ contact.address +"\">";
    }
    contactName = contact.nickname + "<span class=\"contactName\">- "+ contact.name +"</span>";
    return contactClass+contactName+contactEnd;
}

function printContactList(contactList, element) {
    let contactListText;
    contactListText = "";
    for(let i = 0; i < contactList.length; i++) {
        contactListText += printContact(i, contactList[i]);
    }
    document.getElementById(element).innerHTML = contactListText;
}

function renderContact(contactList) {
    printContactList(contactList, "contactList");
}