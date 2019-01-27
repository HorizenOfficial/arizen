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

#if [[ ${TRAVIS_BRANCH} == "development" ]]; then
#	echo \
#	"[backblaze]
#	type = b2
#	account = ${BB_APPID}
#	key = ${BB_APP_KEY_ID}
#	hard_delete = false" > bbconfig.json
#	export DATE_WITH_TIME=`date "+%Y%m%d-%H%M%S"`
#	export FILE_NAME=Arizen_development_${PLATFORM}_PR_${TRAVIS_PULL_REQUEST}_$DATE_WITH_TIME.zip
#	zip -r $FILE_NAME dist/*
#	rclone --config=bbconfig.json copy $FILE_NAME backblaze:${BB_BUCKET}
#fi
