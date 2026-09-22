"""Authentication endpoints."""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, VALID_ROLES, ROLE_STUDENT
from app.routes.deps import get_current_user
from app.schemas.auth import LoginIn, RegisterIn, TokenOut, UserOut
from app.services import auth_service
from app.services.security import create_access_token
from app.config import settings as app_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple secret header that allows creating teacher accounts without a full
# admin UI.  Set TEACHER_REGISTRATION_KEY in the environment to enable it.
# If not set, teacher self-registration is disabled (role is always clamped to student).
_TEACHER_KEY = app_settings.TEACHER_REGISTRATION_KEY


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterIn,
    db: Session = Depends(get_db),
    x_teacher_key: str | None = Header(default=None, alias="X-Teacher-Key"),
):
    """Create a new account and return a token.

    Role is always 'student' unless:
    - The payload role is 'teacher' AND X-Teacher-Key matches the server key.
    """
    requested_role = (payload.role or ROLE_STUDENT).lower()
    # Clamp to student unless the teacher key is provided and matches.
    if requested_role != ROLE_STUDENT:
        if not _TEACHER_KEY or x_teacher_key != _TEACHER_KEY:
            requested_role = ROLE_STUDENT
    if requested_role not in VALID_ROLES:
        requested_role = ROLE_STUDENT

    try:
        user = auth_service.create_user(
            db=db,
            name=payload.name,
            email=payload.email,
            password=payload.password,
            role=requested_role,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    return auth_service.build_token_payload(user)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    """Exchange credentials for an access token."""
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=auth_service.ERROR_INVALID_CREDENTIALS,
        )
    return auth_service.build_token_payload(user)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(_: User = Depends(get_current_user)):
    """Log out by discarding the client-side token (stateless JWT)."""
    return {"message": "You have been logged out."}


@router.post("/refresh", response_model=TokenOut)
def refresh(user: User = Depends(get_current_user)):
    """Issue a fresh access token for the currently authenticated user."""
    return auth_service.build_token_payload(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    """Return the current user's profile."""
    return user


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """Create a new student account and return a token."""
    try:
        user = auth_service.create_user(
            db=db,
            name=payload.name,
            email=payload.email,
            password=payload.password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    return auth_service.build_token_payload(user)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    """Exchange credentials for an access token."""
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=auth_service.ERROR_INVALID_CREDENTIALS,
        )
    return auth_service.build_token_payload(user)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(_: User = Depends(get_current_user)):
    """Log out by discarding the client-side token (stateless JWT)."""
    return {"message": "You have been logged out."}


@router.post("/refresh", response_model=TokenOut)
def refresh(user: User = Depends(get_current_user)):
    """Issue a fresh access token for the currently authenticated user.

    The caller must supply the current (still-valid) bearer token.
    This lets the frontend silently renew sessions that are approaching
    expiry without requiring the user to log in again.
    """
    return auth_service.build_token_payload(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    """Return the current user's profile."""
    return user