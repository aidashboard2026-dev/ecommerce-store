#!/usr/bin/env bash

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# PostgreSQL readiness check using psycopg2
# Avoids requiring postgresql-client + pg_isready package
# which consumes large memory during Docker build.
# ─────────────────────────────────────────────────────────────

POSTGRES_HOST="${POSTGRES_SERVER:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-admin}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
POSTGRES_DB="${POSTGRES_DB:-admindb}"

echo "[entrypoint] Waiting for PostgreSQL..."

python <<EOF
import time
import psycopg2
import os
import sys

host = os.getenv("POSTGRES_SERVER", "db")
port = os.getenv("POSTGRES_PORT", "5432")
user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "T-Shirt-DB123")
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
EOF

# ─────────────────────────────────────────────────────────────
# Run migrations
# ─────────────────────────────────────────────────────────────

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head
echo "[entrypoint] Migrations complete."

# ─────────────────────────────────────────────────────────────
# Run database seed
# ─────────────────────────────────────────────────────────────

echo "[entrypoint] Running database seed..."

python -c "
import logging
logging.basicConfig(level=logging.INFO)

from app.database.init_db import init_db

init_db()

print('[entrypoint] Database seed complete.')
"

# ─────────────────────────────────────────────────────────────
# Start FastAPI
# ─────────────────────────────────────────────────────────────

echo '[entrypoint] Starting Uvicorn...'

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4

