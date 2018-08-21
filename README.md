[![Dependency status][david-img]][david-url]
[![License][license-img]][license-url]
[![Build status][travis-img]][travis-url]
[![Code Climate][codeclimate-img]][codeclimate-url]

# User Manuals
- v1.2.0: [Arizen v1.2.0 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.2.0/Arizen.v1.2.0.Wallet.User.Manual.pdf)
- v1.1.9: [Arizen v1.1.9 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.9/Arizen.v1.1.9.Wallet.User.Manual.pdf)
- v1.1.8: [Arizen v1.1.8 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.8/Arizen.v1.1.8.Wallet.User.Manual.pdf)
- v1.1.7: [Arizen v1.1.7 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.7/Arizen.v1.1.7.Wallet.User.Manual.pdf)
- v1.1.6: [Arizen v1.1.6 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.6/Arizen.v1.1.6.Wallet.User.Manual.pdf)
- v1.1.5: [Arizen v1.1.5 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.5/Arizen.v1.1.5.Wallet.User.Manual.pdf)
- v1.1.4: [Arizen v1.1.4 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.4/Arizen.v1.1.4.Wallet.User.Manual.pdf)
- v1.1.3: [Arizen v1.1.3 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.3/Arizen.v1.1.3.Wallet.User.Manual.pdf)
- v1.1.1: [Arizen v1.1.1 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.1/Arizen.v1.1.1.Wallet.User.Manual.pdf)
- v1.0.0: [Arizen v1.0.0 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.0.0/Arizen.Wallet.User.Manual.pdf)

# Version History

## v1.2.0
- [x] Brand expansion
- [x] FIX: max button


## v1.1.91
- [x] FIX: generate new T address
- [x] FIX: max button

## v1.1.9
- [x] Batch Split
- [x] Add certificate login to the Secure Node
- [x] Max button in withdraw tab
- [x] Speed-up
- [x] Minor fixes
- [x] More languages
- [x] Hide LEDs when Secure Node is not connected/setting is not presented
- [x] Less confusing "create wallet" dialog
- [x] Additional warnings and errors in the login process
- [x] Disallow generating/clicking on create new Z address when Secure Node is not connected

## v1.1.8
- [x] Refactor: batch-withdraw functionality
- [x] Introduce booster for batch-withdraw functionality (speed-up logic in case of many addresses)
- [x] Sync refresh of Z balances.
- [x] Ping to IPv6
- [x] Include flatten package
- [x] Fix of the flickering issue in TXs
- [x] Italian and Bulgarian translation

## v1.1.7
- [x] Support for sending Z transactions and addresses (available only for Secure Node (SN) operators).
- [x] Added items in Settings menu for configuring the connection to SN.
- [x] All Private Keys for T addresses are held ONLY in Arizen wallet.
- [x] All Private Keys for Z addresses are synchronized from your SN into Arizen and vice versa.
- [x] Send T-Z tx, here is used T-T-Z schema 2 transactions (fee is divided, use fee for 2 txs), the middle T address is address in your SN for security reason).
- [x] "watch only/intermediate" T address has been introduced - it is used for T-Z tx (there are 2 txs and fee is divided 2 = schema is: T(Arizen)-T(on your SN)-Z(on your SN or anywhere), from this intermediate T address you will have PK stored ONLY in your SN.
- [x] Send Z-Z with your SN.
- [x] Send Z-T with your SN.
- [x] Send T-T is unchanged - API is still used.
- [x] Import Private Keys of your Z addresses.
- [x] Export Private Keys of your Z addresses.
- [x] Updated translations keys.
- [x] Renamed: from "Username" to "Wallet Name" -> less confusion, Arizen is NOT client-server application.
- [x] Reformatted Settings menu and fix overflow.
- [x] Prevent spending Coinbase unspent transaction outputs (Coinbase UTXO).
- [x] Updated languages: English, Czech, German, Greek, Dutch, Serbian, Korean, Japanese

## v1.1.6
- [x] Automatic logoff timeout can be now enabled and set in Settings (minimum 60s of inactivity).
- [x] Domain Fronting servers can be set in Settings.
- [x] User now can change password - from File menu (this password doesn't need to meet any criteria). Password will be changed only in last `.awd` file.
- [x] Fixed: rounding issue.
- [x] Travis CI support enabled for the faster development cycle.

## v1.1.5
- [x] Domain fronting support.
- [x] Fix bug when you want to send 1000ZENs and more.
- [x] Small visual fixes.
- [x] "Show zero balance" checkbox is checked by default for better UX.
- [x] Async calls for API requests.

## v1.1.4
- [x] Fix: link from About section is not opened in Arizen
- [x] Automatic pruning of old backups (maximum of 25 last backups)
- [x] Settings for disabling notifications
- [x] Import single PK via GUI
- [x] animated image when data is loading
- [x] reworked batch-withdraw logic
- [x] Arabic and Portuguese translations
- [x] Warning messages in critical steps 
- [x] Introduce help menu
- [x] Change text
- [x] Tool for updating translations
- [x] Fix: exported keys can be imported into Swing (finally)

## v1.1.3
- [x] FIX: Import Private Key in WIF and HEX format (Compatible with Swing wallet).
- [x] FIX: Export Private Key in WIF and HEX format (Compatible with Swing wallet).
- [x] FIX: About section.
- [x] FIX: Sweeping (Batch withdrawal) ignore selected zero wallets. 

## v1.1.2
- [x] Feature: Paper wallet - you can create QR codes (private key and address) which can be exported into PDF file and
printed. This created address can by included to your Arizen or not.
- [x] Feature: Arizen has been translated into 14 languages see Settings.
- [x] Feature: Your total balance is shown in selected fiat currency with the actual exchange rate (see Settings).
- [x] Feature: Import and export your private keys.
- [x] Feature: Sweeping (batch withdrawal) functionality for Secure Node operators - you can now withdraw only ZENs above a selected threshold (e.g. 42 ZENs or 0 ZENs when you want to consolidate your ZEN to one address) from multiple addresses at once only with one fee!
- [x] Feature: Rebranding - new logo and colors.
- [x] Fix: Notifications has been enabled again.
- [x] Fix: Problem with antiviruses have been solved (false positive detection with AVG, Avast, etc.).
- [x] Fix: Problem, when a user can't log in, should be solved.
- [x] Fix: Problem when a newly generated address can disappear has been solved.

## v1.1.1
- [x] Fixed auto-updater issue

## v1.1.0
- [x] New GUI and improved functionality

## v1.0.1
- [x] added possibility to chose one of your wallet in "Send" "To" section
- [x] Fixed bug with wrong transaction ordering in transaction history section
- [x] Fixed bug with importing wallet on "Create new wallet" forms, for `.uawd` and `.awd` files
- [x] Fixed copy/cut/paste in register form
- [x] Allow special character in username
- [x] Fixed auto-update feature on Windows
- [x] Only `AppImage` format is supported for Linux (only this format can be auto-updated)

## v1.0.0
- [x] You can download Arizen wallet from Release section from Github right now
- [x] You can create multiple separate accounts
- [x] Password protected locally stored accounts
- [x] All data are encrypted (any of other wallets does not have this) and stored only on your HDD
- [x] Detailed info about address and transaction history
- [x] You can import / export wallet to encrypted `.awd` / decrypted `.uawd` Arizen's file
- [x] Desktop notifications when balance has been changed
- [x] Arizen automatically downloads updates instead of you
- [x] Windows + MacOS + Linux installation files

## Wallet
- [x] Needs connection to the insight and API (you can change servers in settings)
- [x] Arizen is API wallet

## Arizen file locations
- **Linux:** `~/.arizen/wallets/wallet_username.awd`
- **Windows:** `C:\Users\username\AppData\Roaming\Arizen\wallets\wallet_username.awd`
- **MacOS:** `/Users/username/Library/Application Support/Arizen/wallet_username.awd`

## Development

### How to create distribution
      git clone https://github.com/ZencashOfficial/arizen
      git checkout master
      npm install
      npm run dist

# GIFs
## Arizen Settings
![](https://i.imgur.com/rOTSKQf.gif)

## T-T-Z transaction via Secure Node
![](https://i.imgur.com/V1IWIzQ.gif)

## Z-Z transaction via Secure Node
![](https://i.imgur.com/MbZYPra.gif)

## Z-T transaction via Secure Node
![](https://i.imgur.com/0JZQ0R0.gif)

# Screenshots
![Login](https://i.imgur.com/XHrnuPW.png)
![Create wallet](https://i.imgur.com/lz5MqmT.png)
![Batch withdraw](https://i.imgur.com/BupAdvT.png)
![Paper wallet](https://i.imgur.com/4xv5CJ7.png)
![Send function](https://i.imgur.com/Et9brcA.png)
![Send function 2](https://i.imgur.com/8vGUBm7.png)
![Deposit](https://i.imgur.com/vlDC6ZT.png)
![Settings](https://i.imgur.com/BvefqHy.png)
![About](https://i.imgur.com/66z29EY.png)
![Notification](https://i.imgur.com/WdW0WMK.png)


[david-img]: https://david-dm.org/ZencashOfficial/arizen.svg?style=flat-square
[david-url]: https://david-dm.org/ZencashOfficial/arizen
[license-img]: https://img.shields.io/badge/license-MIT-green.svg?style=flat-square
[license-url]: LICENSE
[travis-img]: https://img.shields.io/travis/ZencashOfficial/arizen.svg?style=flat-square
[travis-url]: https://travis-ci.org/ZencashOfficial/arizen.svg?branch=master
[codeclimate-img]: https://codeclimate.com/github/ZencashOfficial/arizen/badges/gpa.svg?style=flat-square
[codeclimate-url]: https://codeclimate.com/github/ZencashOfficial/arizen
