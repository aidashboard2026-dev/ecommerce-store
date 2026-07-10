#!/usr/bin/env bash

set -euo pipefail

POSTGRES_HOST="${POSTGRES_SERVER:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-admin}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
POSTGRES_DB="${POSTGRES_DB:-admindb}"

echo "[Startup] Waiting for PostgreSQL"

python <<PYEOF
import time
import psycopg2
import os
import sys

host = os.getenv("POSTGRES_SERVER", "db")
port = os.getenv("POSTGRES_PORT", "5432")
user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD")

if not password:
    raise RuntimeError("POSTGRES_PASSWORD is not set")
dbname = os.getenv("POSTGRES_DB", "postgres")

max_retries = 30

for attempt in range(max_retries):
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname,
        )
        conn.close()
        print("[Startup] PostgreSQL Ready")
        sys.exit(0)

    except Exception as e:
        print(f"[Startup] ERROR: {e}")
        print(f"[Startup] Waiting for PostgreSQL ({attempt + 1}/{max_retries})")
        time.sleep(2)

print("[Startup] ERROR: PostgreSQL did not become ready.")
sys.exit(1)
PYEOF

echo "[Startup] Running Alembic"

alembic upgrade heads
echo "[Startup] Alembic Complete"

echo "[Startup] Running database seed..."

python -c "
import logging
logging.basicConfig(level=logging.INFO)

from app.core.init_db import init_db

init_db()

print('[Startup] Database Seed Complete')
"

echo '[entrypoint] Starting Gunicorn with Uvicorn workers...'

# gunicorn.conf.py (in the working directory /app) is auto-loaded by Gunicorn
# and provides: workers, worker_class, bind, timeout, keepalive, loglevel,
# capture_output, accesslog, errorlog.
# --capture-output is critical: it routes all worker stdout/stderr (including
# Python exception tracebacks) into the Gunicorn error log so they appear in
# `docker compose logs backend`.
exec gunicorn app.main:app \
    --config gunicorn.conf.py \
    --capture-output \
    --log-level info
