"""Models for the Practice module and student progress tracking."""
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database.session import Base

# Topics currently supported by the practice question generator.  The solver
# supports a wider set of operations than the generator offers.
PRACTICE_TOPICS = ("arithmetic", "algebra", "calculus", "other")
DIFFICULTIES = ("beginner", "intermediate", "advanced")


class PracticeSession(Base):
    """A block of generated practice questions a student worked through."""

    __tablename__ = "practice_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String(50), nullable=False)
    difficulty = Column(String(20), nullable=False)
    question_count = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="practice_sessions")
    questions = relationship(
        "PracticeQuestion", back_populates="session", cascade="all, delete-orphan"
    )


class PracticeQuestion(Base):
    """A single generated question inside a practice session."""

    __tablename__ = "practice_questions"

    id = Column(Integer, primary_key=True)
    session_id = Column(
        Integer, ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False
    )
    prompt = Column(Text, nullable=False)          # visual / textual question
    prompt_spoken = Column(Text, nullable=False)   # screen reader friendly prompt
    prompt_mathml = Column(Text, nullable=False, default="")
    expected_answer = Column(Text, nullable=False)  # SymPy-compatible expected answer
    answer_spoken = Column(Text, nullable=False, default="")
    explanation = Column(Text, nullable=False, default="")
    explanation_spoken = Column(Text, nullable=False, default="")
    difficulty = Column(String(20), nullable=False)

    session = relationship("PracticeSession", back_populates="questions")
    attempts = relationship("Attempt", back_populates="question")


class Attempt(Base):
    """A single answer submission, whether correct or incorrect."""

    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(
        Integer, ForeignKey("practice_questions.id", ondelete="CASCADE"), nullable=False
    )
    session_id = Column(
        Integer, ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False
    )
    given_answer = Column(Text, nullable=False, default="")
    is_correct = Column(Integer, nullable=False, default=0)
    answered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="attempts")
    question = relationship("PracticeQuestion", back_populates="attempts")


class StudentProgress(Base):
    """Aggregated per-topic performance: a lightweight roll-up table.

    One row per (user, topic).  Values are updated whenever an attempt is
    recorded so reading progress is a simple SELECT.
    """

    __tablename__ = "student_progress"
    __table_args__ = (UniqueConstraint("user_id", "topic", name="uq_user_topic"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String(50), nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    correct = Column(Integer, nullable=False, default=0)
    incorrect = Column(Integer, nullable=False, default=0)
    accuracy = Column(Float, nullable=False, default=0.0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="progress_rows")