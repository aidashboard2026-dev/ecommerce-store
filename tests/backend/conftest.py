import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.core.security import create_access_token

# Configure Test Database URL - Default to the main DB but we wrap all operations in transaction rollbacks.
@pytest.fixture(scope="session")
def db_engine():
    # Verify settings has database config
    if not settings.POSTGRES_SERVER:
        raise ValueError("Database configuration POSTGRES_SERVER is missing in settings.")
    engine = create_engine(settings.DATABASE_URL)
    return engine

@pytest.fixture(scope="function")
def db_session(db_engine):
    """
    Wrap each test in a transaction that is rolled back on completion.
    This guarantees no tests pollute the database.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    
    Session = sessionmaker(bind=connection)
    session = Session()
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """
    FastAPI test client with database override.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def admin_token(db_session):
    """
    Create a temporary admin user and return a signed JWT token.
    """
    from backend.app.modules.admins.models import Admin
    from backend.app.core.security import get_password_hash
    
    admin = Admin(
        name="Test Admin",
        email="test_admin_fixture@example.com",
        password_hash=get_password_hash("adminpassword123"),
        role="admin"
    )
    db_session.add(admin)
    db_session.flush()
    
    token = create_access_token(subject=admin.id, token_type="admin")
    return token

@pytest.fixture(scope="function")
def superadmin_token(db_session):
    """
    Create a temporary superadmin user and return a signed JWT token.
    """
    from backend.app.modules.admins.models import Admin
    from backend.app.core.security import get_password_hash
    
    admin = Admin(
        name="Test Superadmin",
        email="test_superadmin_fixture@example.com",
        password_hash=get_password_hash("superadminpassword123"),
        role="superadmin"
    )
    db_session.add(admin)
    db_session.flush()
    
    token = create_access_token(subject=admin.id, token_type="admin")
    return token

@pytest.fixture(scope="function")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture(scope="function")
def superadmin_headers(superadmin_token):
    return {"Authorization": f"Bearer {superadmin_token}"}

@pytest.fixture(scope="function")
def customer_token(db_session):
    """
    Create a temporary active customer and return a signed JWT token.
    """
    from backend.app.modules.customers.models import Customer
    from backend.app.core.security import get_password_hash
    from datetime import date
    
    customer = Customer(
        first_name="Test",
        last_name="Customer",
        email="test_customer_fixture@example.com",
        phone="1234567890",
        dob=date(1990, 1, 1),
        password_hash=get_password_hash("customerpassword123"),
        is_active=True,
        email_verified=True
    )
    db_session.add(customer)
    db_session.flush()
    
    token = create_access_token(subject=customer.id, token_type="customer")
    return token

@pytest.fixture(scope="function")
def customer_headers(customer_token):
    return {"Authorization": f"Bearer {customer_token}"}
