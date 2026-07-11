import os

# ── Binding ────────────────────────────────────────────────────────────────────
bind = "0.0.0.0:8000"

# ── Workers ────────────────────────────────────────────────────────────────────
# Formula: 2 * CPU_count + 1  (conservative for I/O-bound async workloads)
workers = int(os.getenv("GUNICORN_WORKERS", "2"))
worker_class = "uvicorn.workers.UvicornWorker"

# ── Timeouts ───────────────────────────────────────────────────────────────────
timeout = 120          # Worker silent timeout — kill & replace if exceeded
keepalive = 5          # Keep-alive seconds for persistent connections
graceful_timeout = 30  # Seconds to finish in-flight requests on SIGTERM

# ── Logging ───────────────────────────────────────────────────────────────────
# CRITICAL: capture_output=True ensures worker stdout/stderr (including Python
# tracebacks) are routed into Gunicorn's error log stream.
# Without this, exceptions in worker processes are silently dropped.
loglevel = "info"
accesslog = "-"   # stdout
errorlog = "-"    # stderr
capture_output = True  # Redirect worker stdout/stderr → error log

# ── Process ───────────────────────────────────────────────────────────────────
# preload_app=False is correct for UvicornWorker + lifespan.
# preload_app=True would share the event loop across fork boundaries, which
# corrupts asyncio state and causes subtle race conditions.
preload_app = False
