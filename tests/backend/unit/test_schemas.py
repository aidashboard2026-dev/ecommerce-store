import pytest
from pydantic import ValidationError
from datetime import date
from backend.app.modules.auth.schemas import SignupRequest, ResetPasswordRequest

def test_signup_request_schema_validation():
    # Valid input
    valid_data = {
        "first_name": "Alice",
        "last_name": "Smith",
        "email": "alice@example.com",
        "dob": date(1995, 12, 1),
        "password": "validpassword123",
        "phone": "9876543210"
    }
    signup = SignupRequest(**valid_data)
    assert signup.first_name == "Alice"
    assert signup.dob.year == 1995

    # Invalid email structure
    invalid_email = valid_data.copy()
    invalid_email["email"] = "not-an-email"
    with pytest.raises(ValidationError):
        SignupRequest(**invalid_email)

    # Password too short (requires min_length=8)
    short_pw = valid_data.copy()
    short_pw["password"] = "short"
    with pytest.raises(ValidationError):
        SignupRequest(**short_pw)

    # First name too short (requires min_length=2)
    short_name = valid_data.copy()
    short_name["first_name"] = "A"
    with pytest.raises(ValidationError):
        SignupRequest(**short_name)

def test_reset_password_schema_validation():
    # Valid
    req = ResetPasswordRequest(token="sometoken", new_password="newstrongpass123")
    assert req.token == "sometoken"

    # Password too short
    with pytest.raises(ValidationError):
        ResetPasswordRequest(token="sometoken", new_password="short")
