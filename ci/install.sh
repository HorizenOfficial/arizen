#!/bin/bash

set -e

npm install ${NPM_OPTIONS} electron-builder@next
npm install ${NPM_OPTIONS}
npm prune
