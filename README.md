[![Dependency status][david-img]][david-url]
[![License][license-img]][license-url]
[![Build status][travis-img]][travis-url]
[![Code Climate][codeclimate-img]][codeclimate-url]
[![Test Coverage][testcoverage-img]][testcoverage-url]

# Arizen features for v0.1.0-beta version
- [x] team GPG verified commits 
- [x] codeclimate code/bug automatic review
- [x] Travis CI integration
- [x] dependency version checker 
- [x] displaying all your addresses with balances
- [x] displaying detail info about address
- [x] transaction history - raw
- [x] transaction history - with detail about transaction
- [x] introduce new `.awd` file (arizen wallet database)
- [x] import wallet.dat - during registration
- [x] import wallet.dat / `[your_login].awd` encrypted / `[your_login].awd` unencrypted - in GUI
- [x] backup wallet to encrypted/decrypted file
- [x] desktop notifications
- [x] light API wallet without requiring synchronization - connected to online insight
- [x] use modern cryptography, aes-256-gcm with sha512 key
- [x] encrypted login pass
- [x] encrypted `[your_login].awd` file - storing all your data
- [x] encrypted `users.arizen` file - storing all users login data
- [x] multiple accounts
- [x] password protection 
- [x] you have to create strong password 
- [x] automatically download updates
- [x] simple, nice, flat, ZEN branded GUI
- [x] Windows + MacOS + Linux instalation files
- [x] encrypted customizable wallet setting
- [x] implement settings for selection of your favorite insight explorer
- [x] implement settings for selection of your favorite insight API
- [x] implement settings for enabling/disabling notification
## Wallet
- [x] show/hide zero balance addresses
- [x] sending transparent transaction
- [x] generating new transparent address + label
- [x] configurable fee

# Planned features for next versions
- [ ] bug-free
## Wallet
- [ ] sending private transaction
- [ ] generating new private address
## Messenger
- [ ] messaging 1-1
- [ ] add/remove/edit your contacts
- [ ] messaing history
- [ ] compatible messaging with other messengers

# How to create distribution
npm run dist

![Arizen](bg.png)
![Screenshot](https://i.imgur.com/Cc14AP2.png)
![Screenshot](https://i.imgur.com/qLxk2l4.png)
![Screenshot](https://i.imgur.com/0VezNp1.png)
![Screenshot](https://i.imgur.com/3ngJvrW.png)

[david-img]: https://david-dm.org/ZencashOfficial/arizen.svg?style=flat-square
[david-url]: https://david-dm.org/ZencashOfficial/arizen
[license-img]: https://img.shields.io/badge/license-MIT-green.svg?style=flat-square
[license-url]: LICENSE
[travis-img]: https://img.shields.io/travis/ZencashOfficial/arizen.svg?style=flat-square
[travis-url]: https://travis-ci.org/ZencashOfficial/arizen.svg?branch=master
[codeclimate-img]: https://codeclimate.com/github/ZencashOfficial/arizen/badges/gpa.svg?style=flat-square
[codeclimate-url]: https://codeclimate.com/github/ZencashOfficial/arizen
[testcoverage-img]: https://codeclimate.com/github/ZencashOfficial/arizen/badges/coverage.svg
[testcoverage-url]: https://codeclimate.com/github/ZencashOfficial/arizen/coverage
