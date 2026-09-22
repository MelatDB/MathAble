"""User profile endpoints."""
from fastapi import APIRouter, Depends

from app.models.user import User
from app.routes.deps import get_current_user
from app.schemas.auth import UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def user_me(user: User = Depends(get_current_user)):
    """Return the current user's profile (alias of /auth/me)."""
    return user