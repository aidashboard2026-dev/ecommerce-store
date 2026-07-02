import pytest
import sqlalchemy.exc
from sqlalchemy.orm import sessionmaker
from backend.app.core.database import engine

def test_connection_pool_configuration():
    # Assert pool settings are configured as expected
    assert engine.pool.size() == 1
    assert engine.pool._max_overflow == 1
    # pool_timeout is 10s by default in app/core/database.py
    assert engine.pool._timeout == 10

def test_connection_pool_exhaustion_on_third_connection():
    # Setup sessionmaker
    Session = sessionmaker(bind=engine)
    
    # Open first connection
    s1 = Session()
    s1.execute(sqlalchemy.text("SELECT 1"))
    
    # Open second connection (exceeds pool_size=1, hits max_overflow=1)
    s2 = Session()
    s2.execute(sqlalchemy.text("SELECT 1"))
    
    # Open third connection - this should block and then raise a TimeoutError because 1 + 1 is the absolute max
    # We temporarily override the timeout to 1 second so the test runs instantly rather than waiting 10 seconds.
    original_timeout = engine.pool._timeout
    engine.pool._timeout = 1
    
    try:
        s3 = Session()
        with pytest.raises(sqlalchemy.exc.TimeoutError):
            s3.execute(sqlalchemy.text("SELECT 1"))
    finally:
        # Restore timeout
        engine.pool._timeout = original_timeout
        # Cleanup
        s1.close()
        s2.close()
        try:
            s3.close()
        except NameError:
            pass
