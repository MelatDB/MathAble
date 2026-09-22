"""Accessibility settings endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.routes.deps import get_current_user
from app.schemas.accessibility import (
    AccessibilitySettingsIn,
    AccessibilitySettingsOut,
    CONTRASTS,
    TEXT_SIZES,
)
from app.services.auth_service import get_or_create_settings

router = APIRouter(prefix="/api/accessibility", tags=["accessibility"])

VALID_MESSAGE = (
    "Text size must be one of: small, medium, large, x-large. "
    "Contrast must be normal or high."
)


def _to_out(settings) -> AccessibilitySettingsOut:
    return AccessibilitySettingsOut(
        user_id=settings.user_id,
        text_size=settings.text_size,
        contrast=settings.contrast,
        tts_enabled=bool(settings.tts_enabled),
        tts_rate=settings.tts_rate,
        tts_voice=settings.tts_voice,
        voice_input_enabled=bool(settings.voice_input_enabled),
        updated_at=(
            settings.updated_at.isoformat() if settings.updated_at else ""
        ),
    )


@router.get("/settings", response_model=AccessibilitySettingsOut)
def get_settings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current student's accessibility settings."""
    return _to_out(get_or_create_settings(db, user.id))


@router.put("/settings", response_model=AccessibilitySettingsOut)
def update_settings(
    payload: AccessibilitySettingsIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the student's accessibility settings."""
    if payload.text_size not in TEXT_SIZES or payload.contrast not in CONTRASTS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=VALID_MESSAGE,
        )

    settings = get_or_create_settings(db, user.id)
    settings.text_size = payload.text_size
    settings.contrast = payload.contrast
    settings.tts_enabled = 1 if payload.tts_enabled else 0
    settings.tts_rate = max(1, min(payload.tts_rate, 20))
    settings.tts_voice = payload.tts_voice
    settings.voice_input_enabled = 1 if payload.voice_input_enabled else 0
    db.commit()
    db.refresh(settings)
    return _to_out(settings)