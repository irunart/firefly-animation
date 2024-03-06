#!/bin/bash

set -eu

CWD=$(cd $(dirname $0); pwd)
cd "${CWD}"

yarn && yarn build

TARGET_PATH="${TARGET_PATH:-${CWD}/html}"
STATIC_PATH="${TARGET_PATH}/static"
[[ -d "${STATIC_PATH}" ]] || mkdir -p "${STATIC_PATH}"

cp "${CWD}/dist/static/"* "${STATIC_PATH}"

FIREFLY_PATH="${FIREFLY_PATH:-${TARGET_PATH}/firefly_animation}"
[[ -d "${FIREFLY_PATH}" ]] || mkdir -p "${FIREFLY_PATH}"
cp -f "${CWD}/dist/index.html" "${FIREFLY_PATH}"

FIREFLY_STATIC_PATH="${FIREFLY_STATIC_PATH:-${TARGET_PATH}/static}"
[[ -d "${FIREFLY_STATIC_PATH}" ]] || mkdir -p "${FIREFLY_STATIC_PATH}"
cp -f "${CWD}/dist/static/"* "${FIREFLY_STATIC_PATH}"
