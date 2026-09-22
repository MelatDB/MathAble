"""Schemas for the Practice module."""
from pydantic import BaseModel, Field

from app.models.practice import DIFFICULTIES, PRACTICE_TOPICS


class GeneratePracticeIn(BaseModel):
    topic: str = Field(
        min_length=1,
        max_length=50,
        description="One of: arithmetic, algebra, calculus, other",
    )
    difficulty: str = Field(
        min_length=1,
        max_length=20,
        description="One of: beginner, intermediate, advanced",
    )
    count: int = Field(default=5, ge=1, le=20)

    # Pydantic v2 validators (as model validators) are min_length constraints
    # only; explicit topic/difficulty membership is validated in the service
    # so that error messages stay human friendly.


class PracticeQuestionOut(BaseModel):
    id: int
    session_id: int
    prompt: str
    prompt_spoken: str
    prompt_mathml: str = ""
    difficulty: str


class PracticeSessionOut(BaseModel):
    id: int
    topic: str
    difficulty: str
    question_count: int
    questions: list[PracticeQuestionOut]


class SubmitAnswerIn(BaseModel):
    question_id: int
    answer: str = Field(min_length=1, max_length=200)


class AnswerFeedback(BaseModel):
    question: PracticeQuestionOut
    correct: bool
    feedback: str
    explanation: str
    explanation_spoken: str = ""
    correct_answer: str
    correct_answer_spoken: str
    answered_at: str  # ISO string returned by the service layer