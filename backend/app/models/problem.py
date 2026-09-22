"""Models for the Solve Mathematics history (problems and step-by-step solutions)."""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.session import Base


class Problem(Base):
    """A mathematics problem solved through the Solve Mathematics page."""

    __tablename__ = "problems"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    input_text = Column(Text, nullable=False)
    interpreted_text = Column(Text, nullable=False, default="")
    expression_type = Column(String(50), nullable=False, default="expression")
    answer_text = Column(Text, nullable=False, default="")
    answer_spoken = Column(Text, nullable=False, default="")
    answer_mathml = Column(Text, nullable=False, default="")
    supported = Column(Integer, nullable=False, default=1)
    message = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="problems")
    solutions = relationship(
        "Solution", back_populates="problem", cascade="all, delete-orphan"
    )


class Solution(Base):
    """One step of a step-by-step solution linked to a Problem."""

    __tablename__ = "solutions"

    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    step_index = Column(Integer, nullable=False)
    title = Column(Text, nullable=False, default="")
    math = Column(Text, nullable=False, default="")
    spoken = Column(Text, nullable=False, default="")
    mathml = Column(Text, nullable=False, default="")

    problem = relationship("Problem", back_populates="solutions")