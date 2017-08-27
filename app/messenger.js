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

