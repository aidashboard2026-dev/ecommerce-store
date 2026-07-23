"""Compatibility wrapper for the current auth service module."""

from app.modules.auth.service import (  # noqa: F401
    authenticate_admin,
    login_admin,
    login_customer,
    register_customer,
    request_password_reset,
    reset_password,
)
