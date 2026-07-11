#!/bin/sh
set -e

INSTALLED_PKG="/package-installed.json"

# Check if node_modules is missing or package.json has changed
if [ ! -d "/app/node_modules" ] || ! node -e "
const fs = require('fs');
const path = '/package-installed.json';
if (!fs.existsSync(path)) process.exit(1);
const current = fs.readFileSync('/app/package.json', 'utf8').trim();
const installed = fs.readFileSync(path, 'utf8').trim();
if (current !== installed) process.exit(1);
" 2>/dev/null; then
  echo "[Startup] Syncing frontend dependencies (package.json modified or node_modules missing)..."
  npm install
  cp "/app/package.json" "$INSTALLED_PKG"
  echo "[Startup] Dependencies synced successfully."
else
  echo "[Startup] Frontend dependencies are up-to-date."
fi

exec "$@"
