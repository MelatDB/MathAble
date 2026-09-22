"""Service layer for authentication, users and accessibility settings."""
from email_validator import EmailNotValidError, validate_email

from app.database.session import SessionLocal
from app.models.user import (
    AccessibilitySettings,
    ROLE_STUDENT,
    User,
    VALID_ROLES,
)
from app.services.security import (
    create_access_token,
    hash_password,
    verify_password,
)

# Friendly error messages used by the API.
ERROR_EMAIL_EXISTS = (
    "An account with this email already exists. "
    "Please log in or use a different email address."
)
ERROR_INVALID_CREDENTIALS = "Incorrect email or password. Please try again."


def _normalise_email(email: str) -> str:
    """Validate and normalise an email address; raises ValueError otherwise."""
    try:
        result = validate_email(email, check_deliverability=False)
    except EmailNotValidError as exc:
        raise ValueError("Please enter a valid email address.") from exc
    return result.normalized


def create_user(db, name: str, email: str, password: str, role: str = ROLE_STUDENT) -> User:
    """Create a new user account. Raises ValueError for business rule errors."""
    if role not in VALID_ROLES:
        raise ValueError("Unknown user role.")
    email = _normalise_email(email)

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValueError(ERROR_EMAIL_EXISTS)

    user = User(
        name=name.strip(),
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    db.flush()

    # Every user gets a default accessibility settings row.
    db.add(AccessibilitySettings(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db, email: str, password: str) -> User | None:
    """Return the user when credentials are correct, else None."""
    normalized = email.strip().lower()
    user = db.query(User).filter(User.email == normalized).first()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def build_token_payload(user: User) -> dict:
    """Create the response shape returned after register/login."""
    token = create_access_token(user.id, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }


def get_or_create_settings(db, user_id: int) -> AccessibilitySettings:
    """Return a user's accessibility settings, creating defaults on first use."""
    settings = db.query(AccessibilitySettings).filter_by(user_id=user_id).first()
    if settings is None:
        settings = AccessibilitySettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def public_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }