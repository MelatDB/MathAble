"""Schemas for the Solve Mathematics module."""
from pydantic import BaseModel, Field


class SolveIn(BaseModel):
    """Request body for POST /api/solve."""

    expression: str = Field(min_length=1, max_length=500)


class SolutionStepOut(BaseModel):
    title: str
    math: str = ""
    spoken: str = ""
    mathml: str = ""


class SolveOut(BaseModel):
    """Complete response of the mathematics engine.

    ``supported`` is false when the expression is valid mathematics but the
    engine cannot solve it reliably; in that case ``message`` explains the
    limitation in plain language.
    """

    input: str
    interpreted: str
    expression_type: str
    steps: list[SolutionStepOut]
    answer: str
    answer_spoken: str
    answer_mathml: str
    supported: bool
    message: str
    saved: bool = False  # true when the result was stored in problem history