"""
Root conftest.py — runs before any test collection begins.

Inserts the `backend/` directory into sys.path so that
`from app.*` imports resolve correctly regardless of where
pytest is invoked from or which pytest version is installed.
"""
import sys
import os

# Resolve the absolute path to the backend/ directory and
# prepend it so it takes priority over any other app package.
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
