#!/bin/bash

set -euo pipefail

# upload build to backblaze, this will fail on PRs from forks as secrets are unavailable then
DATE_WITH_TIME=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
FILE_NAME="Arizen_development_${TRAVIS_OS_NAME}_PR${TRAVIS_PULL_REQUEST}_${TRAVIS_COMMIT}_${DATE_WITH_TIME}.tar.gz"
if [ "${TRAVIS_PULL_REQUEST}" == "false" ]; then
  FILE_NAME="Arizen_development_${TRAVIS_OS_NAME}_${TRAVIS_COMMIT}_${DATE_WITH_TIME}.tar.gz"
fi
tar -czf "${FILE_NAME}" ./dist
b2 authorize-account
FAIL="false"
b2 upload-file --threads 20 "${B2_BUCKET_NAME}" ./"${FILE_NAME}" "${FILE_NAME}" || { FAIL="true" \
&& echo "Backblaze upload failed, filename: ${FILE_NAME}"; }
# post link in PR comment
if [ "${TRAVIS_PULL_REQUEST}" != "false" ] && [ "${FAIL}" != "true"  ]; then
  curl -H "Authorization: token ${GITHUB_TOKEN}" -X POST \
  -d "{\"body\": \"Travis ${TRAVIS_OS_NAME} job [${TRAVIS_JOB_NUMBER}](${TRAVIS_JOB_WEB_URL}) finished, you can download the results [here](https://downloads.horizen.global/file/ArizenBuilds/${FILE_NAME}).\"}" \
  "https://api.github.com/repos/${TRAVIS_REPO_SLUG}/issues/${TRAVIS_PULL_REQUEST}/comments"
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
    mv "$f" "${f// /_}" || true
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
   mv "$f" "${f// /_}" || true
 done
 for file in ./*; do
   shasum -a 256 "${file}" > "${file}.sha256"
 done
 cd ..
 ls -la ./release
fi
