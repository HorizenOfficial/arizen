#!/usr/bin/env bash

set -e

if [[ "$TRAVIS_OS_NAME" == "linux" || "$TRAVIS_OS_NAME" == "darwin" ]]; then
    mkdir -p /tmp/git-lfs && curl -L https://github.com/github/git-lfs/releases/download/v1.2.1/git-lfs-$(["$TRAVIS_OS_NAME" == "linux" ] && echo "linux" || echo "darwin")-amd64-1.2.1.tar.gztar -xz -C /tmp/git-lfs --strip-components 1 && /tmp/git-lfs/git-lfs pull
fi

if [[ "$TRAVIS_OS_NAME" == "linux" ]]; then
    sudo apt-get install --no-install-recommends -y icnsutils graphicsmagick xz-utils
fi
