#!/bin/bash

set -e

# TODO add encrypted certificates
if [ -z "${TRAVIS_TAG}" ] && git verify-tag "${TRAVIS_TAG}"; then
  echo "decrypt certs placeholder"
else
  echo "Not a tagged build or tag not signed."
fi

# default yarn install options set in travis YARN_INSTALL_OPTIONS="--frozen-lockfile --link-duplicates"
# Continue even on failing yarn audit, sometimes vulnerablilities cannot be fixed yet, but at least we have a log of them.
if [ "${TRAVIS_OS_NAME}" == "linux" ]; then
  docker run --rm \
    --env-file <(env | grep -vE '\r|\n' | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS|APPVEYOR_|CSC_|_TOKEN|_KEY|AWS_|STRIP|BUILD_|TZ') \
    -v "${PWD}":/project \
    -v ~/.cache/electron:/root/.cache/electron \
    -v ~/.cache/electron-builder:/root/.cache/electron-builder \
    electronuserland/builder:wine-mono \
    /bin/bash -c "yarn install ${YARN_INSTALL_OPTIONS} && yarn audit || true && yarn dist --linux --win"
else
  bash -c "yarn install ${YARN_INSTALL_OPTIONS} && yarn audit || true && yarn dist --mac"
fi
