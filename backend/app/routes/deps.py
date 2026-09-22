"""Dependencies shared by routers: current user resolution."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, ROLE_TEACHER, ROLE_ADMIN
from app.services.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

MESSAGES = {
    "missing_token": "Please log in to continue.",
    "user_not_found": "Your account could not be found. Please log in again.",
    "forbidden": "You do not have permission to access this resource.",
}


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from the bearer token."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=MESSAGES["missing_token"],
        )
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=MESSAGES["missing_token"],
        )
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=MESSAGES["user_not_found"],
        )
    return user


def require_teacher(user: User = Depends(get_current_user)) -> User:
    """Dependency that ensures the caller is a teacher or admin."""
    if user.role not in (ROLE_TEACHER, ROLE_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=MESSAGES["forbidden"],
        )
    return user