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