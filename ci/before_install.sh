#!/bin/bash

set -e

echo "Before Install Script"

if [[ ${TRAVIS_OS_NAME} == "osx" ]]; then
    echo "Before install: MacOS"
    brew update
    brew install graphviz
elif [[ ${TRAVIS_OS_NAME} == "windows" ]]; then
    echo "Before install: Windows OS"
elif [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
    echo "Before install: Linux"
    sudo apt-get install --no-install-recommends -y icnsutils graphicsmagick xz-utils
else
    echo "Unknown OS"
fi


#if [[ "$TRAVIS_OS_NAME" == "linux" || "$TRAVIS_OS_NAME" == "osx" ]]; then
#    mkdir -p /tmp/git-lfs && curl -L https://github.com/github/git-lfs/releases/download/v1.2.1/git-lfs-$(["$TRAVIS_OS_NAME" == "linux" ] && echo "linux" || echo "osx")-amd64-1.2.1.tar.gztar -xz -C /tmp/git-lfs --strip-components 1 && /tmp/git-lfs/git-lfs pull
#fi

#if [[ "$TRAVIS_OS_NAME" == "linux" ]]; then
#    sudo apt-get install --no-install-recommends -y icnsutils graphicsmagick xz-utils
#fi

