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

function addContactDialog() {
    document.getElementById("darkContainer").style.transition = "0.5s";
    document.getElementById("darkContainer").style.zIndex = "1";
    document.getElementById("darkContainer").style.opacity = "0.7";
    document.getElementById("addContactDialog").style.zIndex = "2";
    document.getElementById("addContactDialog").style.opacity = "1";
}

function saveContact() {
    document.getElementById("darkContainer").style.transition = "0s";
    document.getElementById("darkContainer").style.opacity = "0";
    document.getElementById("darkContainer").style.zIndex = "-1";
    document.getElementById("addContactDialog").style.zIndex = "-1";
    document.getElementById("addContactDialog").style.opacity = "0";


}

function closeDialog() {
    document.getElementById("darkContainer").style.transition = "0s";
    document.getElementById("darkContainer").style.opacity = "0";
    document.getElementById("darkContainer").style.zIndex = "-1";
    document.getElementById("addContactDialog").style.zIndex = "-1";
    document.getElementById("addContactDialog").style.opacity = "0";


}
