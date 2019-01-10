#!/bin/bash

# This script takes care of testing your crate

set -e

#npm run dist

#apt install -y wine

if [[ ${PLATFORM} == "osx" ]]; then
    npx electron-builder build -m
elif [[ ${PLATFORM} == "windows" ]]; then
    npx electron-builder build -w
elif [[ ${PLATFORM} == "linux" ]]; then
    npx electron-builder build -l
else
    echo "Unknown OS"
fi