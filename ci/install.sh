#!/usr/bin/env bash
set -ex

nvm install 6
npm install electron-builder@next
npm install
npm prune
