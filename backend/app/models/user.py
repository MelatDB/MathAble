"""User and accessibility-settings models."""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database.session import Base

# Roles supported by the application.  The first version focuses on the
# student role; teacher and admin are available for future expansion.
ROLE_STUDENT = "student"
ROLE_TEACHER = "teacher"
ROLE_ADMIN = "admin"
VALID_ROLES = (ROLE_STUDENT, ROLE_TEACHER, ROLE_ADMIN)


class User(Base):
    """A registered user of MathAble.

    Passwords are never stored in plain text.  Only the password hash
    produced by app.services.security.hash_password is persisted.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=ROLE_STUDENT)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    accessibility_settings = relationship(
        "AccessibilitySettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    problems = relationship(
        "Problem", back_populates="user", cascade="all, delete-orphan"
    )
    practice_sessions = relationship(
        "PracticeSession", back_populates="user", cascade="all, delete-orphan"
    )
    attempts = relationship(
        "Attempt", back_populates="user", cascade="all, delete-orphan"
    )
    progress_rows = relationship(
        "StudentProgress", back_populates="user", cascade="all, delete-orphan"
    )


class AccessibilitySettings(Base):
    """Stored preferences that make MathAble usable by each individual.

    One row per user (1:1 relationship).  Created automatically on first
    access if missing.
    """

    __tablename__ = "accessibility_settings"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    text_size = Column(String(20), nullable=False, default="medium")  # small|medium|large|x-large
    contrast = Column(String(20), nullable=False, default="normal")  # normal|high
    tts_enabled = Column(Integer, nullable=False, default=1)  # 0 or 1
    tts_rate = Column(Integer, nullable=False, default=10)  # speech rate x10 (10 == 1.0)
    tts_voice = Column(String(255), nullable=False, default="")
    voice_input_enabled = Column(Integer, nullable=False, default=1)  # 0 or 1
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="accessibility_settings")