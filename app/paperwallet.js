// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {ipcRenderer} = require("electron");
const Qrcode = require("qrcode");
const PDFjs = require("jspdf");
const zencashjs = require("zencashjs");

ipcRenderer.on("export-paper-wallet", (sender, wif, name) => {
    const privateKey = zencashjs.address.WIFToPrivKey(wif);
    const pubKey = zencashjs.address.privKeyToPubKey(privateKey, true);
    const tAddr = zencashjs.address.pubKeyToAddr(pubKey);

    function createQrCodeAsync(text) {
        const opts = {
            margin: 1,
        };
        return Qrcode.toDataURL(text, opts);
    }

    function renderWallet(pkHexQrCode, tAddrQrCode) {
        const pdf = new PDFjs(); // a4
        const pdfW = pdf.internal.pageSize.getWidth();

        function centeredText(text, y) {
            const textWidth = pdf.getStringUnitWidth(text) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
            const x = (pdfW - textWidth) / 2;
            pdf.text(x, y, text);
            // FIXME: find out height from font metrics
            return 10;
        }

        function centerSquareImage(img, format, y) {
            const WIDTH = 80;
            const x = (pdfW - WIDTH) / 2;
            pdf.addImage(img, format, x, y, WIDTH, WIDTH);
            return WIDTH + 10; // FIXME + 10
        }

        let y = 10;

        if (name) {
            y += centeredText("ZENCASH WALLET " + name, y);
        } else {
            y += centeredText("ZENCASH WALLET", y);
        }
        y += 10;

        y += centeredText("PRIVATE KEY", y);
        y += 0;
        y += centeredText(wif, y);
        y += 0;
        y += centerSquareImage(pkHexQrCode, "JPEG", y);
        y += 10;
        y += centeredText("T-ADDRESS", y);
        y += 0;
        y += centeredText(tAddr, y);
        y += 0;
        centerSquareImage(tAddrQrCode, "JPEG", y);

        let filename;
        if (name) {
            filename = `arizen-wallet-${name}.pdf`;
        }
        else {
            filename = `arizen-wallet-${tAddr}.pdf`;
        }

        pdf.save(filename);
    }

    Promise.all([createQrCodeAsync(wif), createQrCodeAsync(tAddr)])
        .then(results => {
            const privKeyQrCode = results[0];
            const tAddrQrCode = results[1];
            return renderWallet(privKeyQrCode, tAddrQrCode);
        });
});

function showPaperWalletDialog() {
    showDialogFromTemplate("paperWalletDialogTemplate", dialog => {
        const createButton = dialog.querySelector(".paperWalletCreateButton");
        const nameInput = dialog.querySelector(".paperWalletName");
        const addToWalletCheckbox = dialog.querySelector(".paperWalletAdd");
        createButton.addEventListener("click", () => {
            const name = nameInput.value ? nameInput.value : null;
            const addToWallet = addToWalletCheckbox.checked;
            ipcRenderer.send("create-paper-wallet", name, addToWallet);
            dialog.close();
        });
    });
}

exports.showPaperWalletDialog = showPaperWalletDialog;
