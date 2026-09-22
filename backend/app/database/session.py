"""Database engine and session management.

SQLite is used for development.  The code only relies on standard SQLAlchemy
constructs (declarative models, sessions, foreign keys), so migrating to
MySQL later only requires changing DATABASE_URL and the engine connect args.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

# For SQLite we need check_same_thread=False so sessions can be used across
# FastAPI's worker threads.
connect_args = (
    {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables that do not exist yet.

    Called automatically when the application starts, which gives us a
    self-initialising development database.
    """
    # Importing the modules registers the tables on Base.metadata.
    from app.models import practice, problem, user  # noqa: F401

    Base.metadata.create_all(bind=engine)