"""Pydantic schemas (request/response models) for MathAble."""
from app.schemas.accessibility import AccessibilitySettingsIn, AccessibilitySettingsOut
from app.schemas.auth import (
    LoginIn,
    RegisterIn,
    TokenOut,
    UserOut,
)
from app.schemas.practice import (
    AnswerFeedback,
    GeneratePracticeIn,
    PracticeQuestionOut,
    PracticeSessionOut,
    SubmitAnswerIn,
)
from app.schemas.progress import (
    AttemptOut,
    ProgressOut,
    RecentActivity,
    TopicProgressOut,
)
from app.schemas.solve import (
    SolutionStepOut,
    SolveIn,
    SolveOut,
)

__all__ = [
    "AccessibilitySettingsIn",
    "AccessibilitySettingsOut",
    "AnswerFeedback",
    "AttemptOut",
    "GeneratePracticeIn",
    "LoginIn",
    "PracticeQuestionOut",
    "PracticeSessionOut",
    "ProgressOut",
    "RecentActivity",
    "RegisterIn",
    "SolutionStepOut",
    "SolveIn",
    "SolveOut",
    "SubmitAnswerIn",
    "TokenOut",
    "TopicProgressOut",
    "UserOut",
]