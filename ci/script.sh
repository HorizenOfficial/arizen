#!/bin/bash

set -eo pipefail

if [ ! -z "${TRAVIS_TAG}" ]; then
  export GNUPGHOME="$(mktemp -d 2>/dev/null || mktemp -d -t 'GNUPGHOME')"
  echo "Tagged build, fetching maintainer keys."
  gpg -v --batch --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys $MAINTAINER_KEYS ||
    gpg -v --batch --keyserver hkp://ipv4.pool.sks-keyservers.net --recv-keys $MAINTAINER_KEYS ||
    gpg -v --batch --keyserver hkp://pgp.mit.edu:80 --recv-keys $MAINTAINER_KEYS
  if git verify-tag -v "${TRAVIS_TAG}"; then
    echo "Valid signed tag, fetching certificates."
    curl -sLH "Authorization: token $GITHUB_TOKEN" -H "Accept: application/vnd.github.v3.raw" "$CERT_ARCHIVE_URL" |
      openssl enc -d -aes-256-cbc -md sha256 -pass pass:$CERT_ARCHIVE_PASSWORD |
      tar -xzf-
  else
    unset CERT_ARCHIVE_URL
    unset CERT_ARCHIVE_PASSWORD
    unset CSC_LINK
    unset CSC_KEY_PASSWORD
    unset WIN_CSC_LINK
    unset WIN_CSC_KEY_PASSWORD
    echo "Tag not signed by maintainer, not code signing."
  fi
else
  unset CODESIGN_URL
  unset CERT_ARCHIVE_PASSWORD
  unset CSC_LINK
  unset CSC_KEY_PASSWORD
  unset WIN_CSC_LINK
  unset WIN_CSC_KEY_PASSWORD
  echo "Not a tagged build, not code signing."
fi

# Continue even on failing npm audit, sometimes vulnerablilities cannot be fixed yet, but at least we have a log of them.
# fix /root/.npm/tmp permission errors on package install from git by installing latest npm
if [ "${TRAVIS_OS_NAME}" == "linux" ]; then
  docker run --rm \
    $(env | grep -E 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS|APPVEYOR_|WIN_|CSC_|_TOKEN|_KEY|AWS_|STRIP|BUILD_|TZ' | sed -n '/^[^\t]/s/=.*//p' | sed '/^$/d' | sed 's/^/-e /g' | tr '\n' ' ') \
    -v "${PWD}":/project \
    -v "${HOME}"/.cache/electron:/root/.cache/electron \
    -v "${HOME}"/.cache/electron-builder:/root/.cache/electron-builder \
    --tmpfs /tmp --tmpfs /run \
    electronuserland/builder:wine \
    /bin/bash -c "apt-get update && apt-get -y --no-install-recommends install cmake && npm ci && npm audit || true && npm run build-linux && npm run build-win"
else
  bash -c "npm ci && npm audit || true && npm run build-mac"
fi

set +e
