"""Schemas for accessibility settings."""
from pydantic import BaseModel, Field

TEXT_SIZES = ("small", "medium", "large", "x-large")
CONTRASTS = ("normal", "high")


class AccessibilitySettingsIn(BaseModel):
    text_size: str = Field(default="medium", max_length=20)
    contrast: str = Field(default="normal", max_length=20)
    tts_enabled: bool = True
    tts_rate: int = Field(default=10, ge=1, le=20)  # 0.1x to 2.0x, stored x10
    tts_voice: str = Field(default="", max_length=255)
    voice_input_enabled: bool = True


class AccessibilitySettingsOut(BaseModel):
    user_id: int
    text_size: str
    contrast: str
    tts_enabled: bool
    tts_rate: int
    tts_voice: str
    voice_input_enabled: bool
    updated_at: str