#!/usr/bin/env bash

set -euo pipefail

POSTGRES_HOST="${POSTGRES_SERVER:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-admin}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
POSTGRES_DB="${POSTGRES_DB:-admindb}"

echo "[entrypoint] Waiting for PostgreSQL..."

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
        print("[entrypoint] PostgreSQL is ready.")
        sys.exit(0)

    except Exception as e:
        print(f"[entrypoint] ERROR: {e}")
        print(f"[entrypoint] Waiting for PostgreSQL... ({attempt + 1}/{max_retries})")
        time.sleep(2)

print("[entrypoint] ERROR: PostgreSQL did not become ready.")
sys.exit(1)
PYEOF

echo "[entrypoint] Running Alembic migrations..."

alembic upgrade heads
echo "[entrypoint] Migrations complete."

echo "[entrypoint] Running database seed..."

python -c "
import logging
logging.basicConfig(level=logging.INFO)

from app.core.init_db import init_db

init_db()

print('[entrypoint] Database seed complete.')
"

echo '[entrypoint] Starting Gunicorn with Uvicorn workers...'

exec gunicorn app.main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile -
