#!/bin/bash

set -e

# upload build to backblaze, this will fail on PRs from forks as secrets are unavailable then
if [ "${TRAVIS_BRANCH}" == "development" ]; then
  echo \
  "[backblaze]
  type = b2
  account = "${BB_APPID}"
  key = "${BB_APP_KEY_ID}"
  hard_delete = false" > bbconfig.json
  DATE_WITH_TIME=$(date "+%Y%m%dT%H%M%S")
  FILE_NAME="Arizen_development_${TRAVIS_OS_NAME}_PR${TRAVIS_PULL_REQUEST}_COMMIT${TRAVIS_COMMIT}_${DATE_WITH_TIME}.zip"
  if [ "${TRAVIS_PULL_REQUEST}" == "false" ]; then
    FILE_NAME="Arizen_development_${TRAVIS_OS_NAME}_COMMIT${TRAVIS_COMMIT}_${DATE_WITH_TIME}.zip"
  fi
  zip -r "${FILE_NAME}" dist/*
  rclone --config=bbconfig.json copy "${FILE_NAME}" backblaze:"${BB_BUCKET}" || FAIL="true"
# post link in PR comment
  if [ "${TRAVIS_PULL_REQUEST}" != "false" ] && [ -z ${FAIL+x} ]; then
    curl -H "Authorization: token ${GITHUB_TOKEN}" -X POST \
    -d "{\"body\": \"Travis ${TRAVIS_OS_NAME} job [${TRAVIS_JOB_NUMBER}](${TRAVIS_JOB_WEB_URL}) finished, you can download the results [here](https://downloads.horizen.global/file/ArizenBuilds/${FILE_NAME}).\"}" \
    "https://api.github.com/repos/${TRAVIS_REPO_SLUG}/issues/${TRAVIS_PULL_REQUEST}/comments"
  fi
fi

# copy release files to ./release and calculate sha256 sums
mkdir -p release
if [ "${TRAVIS_OS_NAME}" == "osx" ]; then
  find ./dist -type f -print0 | while IFS= read -r -d $'\0' file; do
    if echo "${file}" | grep -v 'blockmap' | grep -q '\.dmg\|\.zip'; then
      cp "${file}" ./release/
    fi
  done
  cd ./release
  for f in *\ *; do
    mv "$f" "${f// /_}"
  done
  for file in ./*; do
    shasum -a 256 "${file}" > "${file}.sha256"
  done
  cd ..
  ls -la ./release
fi
if [ "${TRAVIS_OS_NAME}" == "linux" ]; then
 find ./dist -type f -print0 | while IFS= read -r -d $'\0' file; do
    if echo "${file}" | grep -q '\.deb\|\.AppImage\|\.nupkg\|Arizen\ Setup'; then
      cp "${file}" ./release/
    fi
 done
 cd ./release
 for f in *\ *; do
   mv "$f" "${f// /_}"
 done
 for file in ./*; do
   shasum -a 256 "${file}" > "${file}.sha256"
 done
 cd ..
 ls -la ./release
fi
