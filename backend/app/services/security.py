"""Security helpers: password hashing and JWT token creation/verification.

Passwords are hashed with PBKDF2-HMAC-SHA256 (Python's hashlib) using a
per-user random salt and a high iteration count.  Using the standard library
keeps the dependency footprint small and works on every Python version.
"""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings

_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    """Return a salted PBKDF2 hash string of the form salt$hash (hex)."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), _ITERATIONS
    )
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Constant-time check of a password against a stored hash string."""
    try:
        salt_hex, hash_hex = stored.split("$", 1)
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), _ITERATIONS
        )
        return hmac.compare_digest(digest.hex(), hash_hex)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, role: str) -> str:
    """Create a signed JWT containing the user id, role and issued-at time."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "role": role, "iat": now, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and verify a JWT. Returns the payload or None when invalid."""
    try:
        return jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        return None


def token_age_seconds(token: str) -> float | None:
    """Return how many seconds old a token is, or None if it cannot be decoded."""
    payload = decode_access_token(token)
    if payload is None:
        return None
    iat = payload.get("iat")
    if iat is None:
        return None
    issued = datetime.fromtimestamp(iat, tz=timezone.utc)
    return (datetime.now(timezone.utc) - issued).total_seconds()