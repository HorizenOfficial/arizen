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

if [[ ${TRAVIS_BRANCH} == "development" ]]; then
	echo \
	"[backblaze]
	type = b2
	account = ${BB_APPID}
	key = ${BB_APP_KEY_ID}
	hard_delete = false" > bbconfig.json
	zip -r Arizen_development_${PLATFORM}.zip dist/*
	rclone --config=bbconfig.json copy Arizen_development_${PLATFORM}.zip backblaze:backblazearizen
fi