[![Dependency status][david-img]][david-url]
[![License][license-img]][license-url]
[![Build status][travis-img]][travis-url]
[![Code Climate][codeclimate-img]][codeclimate-url]

# Arizen
Arizen is ZenCash light wallet.

# User Manuals
- v1.1.3: [Arizen v1.1.3 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.3/Arizen.v1.1.3.Wallet.User.Manual.pdf)
- v1.1.1: [Arizen v1.1.1 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.1.1/Arizen.v1.1.1.Wallet.User.Manual.pdf)
- v1.0.0: [Arizen v1.0.0 Wallet User Manual.pdf](https://github.com/ZencashOfficial/arizen/releases/download/v1.0.0/Arizen.Wallet.User.Manual.pdf)

# Version History

## v1.1.4
- [x] Automatic pruning of old backups (maximum of 25 last backups)
- [x] Settings for disabling notifications
- [x] Fix: link from About section is not opened in Arizen

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
- [x] Feature: Sweeping (batch withdrawal) functionality for security node operators - you can now withdraw only ZENs above a selected threshold (e.g. 42 ZENs or 0 ZENs when you want to consolidate your ZEN to one address) from multiple addresses at once only with one fee!
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
      npm run dist

### Coding rules

#### Mostly everything
- Indent with 4 spaces (JS/CSS/HTML)
- Quote with double quotes (JS/CSS/HTML)
- Do not comment unfinished/not working/old code. Use the Git Luke.

#### JavaScript
- Place opening brace on the same line.
- Write names of variables and functions in _lower camel case_, for example

      const totalZenBalance = totalBalance + getTxBalance(tx);

- Write names of classes in _upper camel case_, for example

      class AddressDialog {
	      /* ... */
	  }

- Write constant names in _constant case_, for example

      const UPDATE_INTERVAL = 60; // seconds

- Prefer cloning HTML `<template>`s to constructing DOM trees manually.

#### HTML
- Do not quote _simple_ HTML attribute values, for example

      <span id=foo class=bar>

  instead of

      <span id="foo" class="bar">

  unless you have to, for example

      <span id=foo class="bar baz">

- Write identifiers (values of `id`, `class`, `name`, `data-tr`, etc.) in _lower camel case_, for example

      <span id=totalBalance class=bigLabel>

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
