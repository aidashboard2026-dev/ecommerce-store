from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    verify_token
)

def test_password_utilities():
    password = "SuperSecurePassword123!"
    hashed = get_password_hash(password)
    
    # Hash must be different from plain text
    assert hashed != password
    
    # Verification must succeed for correct password
    assert verify_password(password, hashed) is True
    
    # Verification must fail for incorrect password
    assert verify_password("WrongPassword123!", hashed) is False

def test_jwt_utilities():
    admin_id = "42"
    
    # Admin Token verification
    admin_token = create_access_token(admin_id, token_type="admin")
    decoded_admin_id = verify_token(admin_token, expected_type="admin")
    assert decoded_admin_id == admin_id
    
    # Wrong token type should fail verification
    assert verify_token(admin_token, expected_type="customer") is None

    # Customer Token verification
    cust_token = create_access_token(admin_id, token_type="customer")
    decoded_cust_id = verify_token(cust_token, expected_type="customer")
    assert decoded_cust_id == admin_id
    assert verify_token(cust_token, expected_type="admin") is None
