"""Application configuration.

All configuration values can be overridden through environment variables so
that no secrets are committed to the repository.  See the README for the list
of supported variables and the .env.example file.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load values from a .env file when present (optional).
load_dotenv()

# Base directory of the backend (one level above this file).
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings:
    """Runtime configuration for MathAble."""

    # Name of the SQLite database file.  The database is created
    # automatically the first time the application starts.
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BACKEND_DIR / 'mathable.db'}",
    )

    # Secret key used to sign authentication tokens.  Must be overridden in
    # production.  The default is only meant for local development; it is
    # intentionally long enough to satisfy RFC 7518 (>=32 bytes for HS256).
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-only-secret-key-change-me-in-prod!!")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )

    # Comma separated list of allowed frontend origins (CORS).
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

    # Total per-topic difficulty levels lighter than a full pipeline.
    DIFFICULTIES: tuple[str, ...] = ("beginner", "intermediate", "advanced")

    # Optional secret header value that enables teacher account self-registration.
    # Leave empty (default) to disable teacher self-registration.
    TEACHER_REGISTRATION_KEY: str = os.getenv("TEACHER_REGISTRATION_KEY", "")


settings = Settings()