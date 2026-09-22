"""Schemas for the Progress module."""
from datetime import datetime

from pydantic import BaseModel

from app.schemas.practice import PracticeQuestionOut


class TopicProgressOut(BaseModel):
    topic: str
    attempts: int
    correct: int
    incorrect: int
    accuracy: float


class RecentActivity(BaseModel):
    kind: str  # "solved_problem" | "practice_attempt"
    label: str
    detail: str
    at: datetime


class AttemptOut(BaseModel):
    id: int
    question_id: int
    given_answer: str
    is_correct: bool
    answered_at: datetime
    question: PracticeQuestionOut | None = None


class ProgressOut(BaseModel):
    total_attempts: int
    total_correct: int
    total_incorrect: int
    overall_accuracy: float
    topics: list[TopicProgressOut]
    recent_activity: list[RecentActivity]
    recent_attempts: list[AttemptOut]