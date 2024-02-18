#!/bin/bash

set -eu

CWD=$(cd $(dirname $0); pwd)

TARGET_PATH="${TARGET_PATH:-${CWD}/html}"
[[ -d "${TARGET_PATH}" ]] || mkdir -p "${TARGET_PATH}"
STATIC_PATH="${TARGET_PATH}/static"

GEO_VIEWPORT_VERSION="${GEO_VIEWPORT_VERSION:-0.5.0}"
GEO_VIEWPORT_DIST="https://github.com/mapbox/geo-viewport/archive/refs/tags/v${GEO_VIEWPORT_VERSION}.tar.gz"
GEO_VIEWPORT_PATH="${STATIC_PATH}"
[[ -d "${GEO_VIEWPORT_PATH}" ]] || mkdir -p "${GEO_VIEWPORT_PATH}"
if [[ "${REFRESH_GEO_VIEWPORT:-N}" == "Y" ]] || ! [[ -f "${GEO_VIEWPORT_PATH}/geo-viewport.js" ]]; then
  curl -fsSL "${GEO_VIEWPORT_DIST}" \
    | tar xzf - -C "${GEO_VIEWPORT_PATH}" --strip-components 1 "geo-viewport-${GEO_VIEWPORT_VERSION}/geo-viewport.js"
fi

FIREFLY_PATH="${FIREFLY_PATH:-${TARGET_PATH}}"
cp "${CWD}/firefly_animation.html" "${FIREFLY_PATH}"
