#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/ioftv}"
APP_USER="${APP_USER:-dell}"
APP_GROUP="${APP_GROUP:-dell}"
NGINX_USER="${NGINX_USER:-www-data}"
NGINX_GROUP="${NGINX_GROUP:-www-data}"

echo "[1/5] Ensure required directories exist"
sudo mkdir -p "${APP_DIR}/server/uploads/ifc"
sudo mkdir -p "${APP_DIR}/server/uploads/ifc-cache"
sudo mkdir -p "${APP_DIR}/storage"
sudo mkdir -p "${APP_DIR}/public/static/js/wasm"

echo "[2/5] Fix runtime writable directories for Node/PM2 user: ${APP_USER}:${APP_GROUP}"
sudo chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}/server"
sudo chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}/storage"
sudo chmod -R 755 "${APP_DIR}/server"
sudo chmod -R 755 "${APP_DIR}/storage"

echo "[3/5] Fix static readable directories for Nginx: ${NGINX_USER}:${NGINX_GROUP}"
if [[ -d "${APP_DIR}/dist" ]]; then
  sudo chown -R "${NGINX_USER}:${NGINX_GROUP}" "${APP_DIR}/dist"
  sudo chmod -R 755 "${APP_DIR}/dist"
fi

if [[ -d "${APP_DIR}/ifc/dist" ]]; then
  sudo chown -R "${NGINX_USER}:${NGINX_GROUP}" "${APP_DIR}/ifc/dist"
  sudo chmod -R 755 "${APP_DIR}/ifc/dist"
fi

if [[ -d "${APP_DIR}/public" ]]; then
  sudo chmod -R a+rX "${APP_DIR}/public"
fi

echo "[4/5] Ensure wasm path stays writable for app user and readable for Nginx"
if [[ -d "${APP_DIR}/public/static/js/wasm" ]]; then
  sudo chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}/public/static/js/wasm"
  sudo chmod -R 755 "${APP_DIR}/public/static/js/wasm"
fi

echo "[5/5] Show final ownership and permissions"
ls -ld \
  "${APP_DIR}/server" \
  "${APP_DIR}/server/uploads" \
  "${APP_DIR}/server/uploads/ifc" \
  "${APP_DIR}/server/uploads/ifc-cache" \
  "${APP_DIR}/storage" \
  "${APP_DIR}/dist" \
  "${APP_DIR}/ifc/dist" \
  "${APP_DIR}/public" \
  "${APP_DIR}/public/static/js/wasm" 2>/dev/null || true

echo "Done."
