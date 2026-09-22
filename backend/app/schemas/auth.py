"""Schemas for authentication and user accounts."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

VALID_ROLES = ("student", "teacher", "admin")


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120, description="Display name")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # role is accepted but clamped to "student" by the endpoint unless the
    # caller supplies a valid teacher-registration key (future feature).
    # Keeping it here lets the admin create teacher accounts via the API.
    role: Optional[str] = Field(default="student", max_length=20)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut