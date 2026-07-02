import pytest
from backend.app.modules.customers.models import Customer

def test_database_transactional_rollback(db_session):
    # Count before
    initial_count = db_session.query(Customer).count()

    try:
        with db_session.begin_nested():
            cust = Customer(
                first_name="Failed",
                last_name="Insert",
                email="rollback_test@example.com",
                is_active=True
            )
            db_session.add(cust)
            db_session.flush()
            # Force an error
            raise ValueError("Forced error to trigger rollback")
    except ValueError:
        pass

    # Verify count is unchanged and email doesn't exist
    assert db_session.query(Customer).count() == initial_count
    inserted = db_session.query(Customer).filter(Customer.email == "rollback_test@example.com").first()
    assert inserted is None
