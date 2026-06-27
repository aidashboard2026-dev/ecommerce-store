from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,    # test connections before use — prevents stale-connection errors
    pool_size=10,          # base pool maintained permanently
    max_overflow=20,       # extra connections allowed when pool is exhausted
    pool_recycle=3600,     # recycle connections every 1 hour — prevents timeout disconnects
    pool_timeout=30,       # raise after 30s if no connection is available
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()