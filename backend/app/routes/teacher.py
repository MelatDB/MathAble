"""Teacher-only endpoints.

All routes here require the caller to be a teacher or admin (enforced by the
require_teacher dependency).  Students receive 403 Forbidden.

Endpoints:
  GET  /api/teacher/students                 — list all students
  GET  /api/teacher/students/{id}/progress   — a student's full progress
  GET  /api/teacher/students/{id}/solutions  — a student's solve history
  POST /api/teacher/assignments              — create a practice assignment
  GET  /api/teacher/assignments              — list own assignments
  PUT  /api/teacher/assignments/{id}         — update an assignment
  DELETE /api/teacher/assignments/{id}       — delete an assignment
  GET  /api/teacher/assignments/{id}/results — per-student results
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.practice import Attempt, PracticeQuestion, PracticeSession, StudentProgress
from app.models.problem import Problem
from app.models.user import User, ROLE_STUDENT
from app.routes.deps import require_teacher
from app.services import progress_service

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AssignmentIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    topic: str = Field(min_length=1, max_length=50)
    difficulty: str = Field(min_length=1, max_length=20)
    question_count: int = Field(default=5, ge=1, le=20)
    description: str = Field(default="", max_length=500)


class AssignmentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    question_count: int | None = Field(default=None, ge=1, le=20)


# ---------------------------------------------------------------------------
# Student management
# ---------------------------------------------------------------------------

@router.get("/students")
def list_students(
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Return all student accounts with basic stats."""
    students = db.query(User).filter(User.role == ROLE_STUDENT).order_by(User.name).all()
    result = []
    for s in students:
        rows = db.query(StudentProgress).filter_by(user_id=s.id).all()
        total_attempts = sum(r.attempts for r in rows)
        total_correct  = sum(r.correct  for r in rows)
        overall_acc    = round(total_correct / total_attempts * 100, 1) if total_attempts else 0.0
        result.append({
            "id":             s.id,
            "name":           s.name,
            "email":          s.email,
            "created_at":     s.created_at.isoformat() if s.created_at else "",
            "total_attempts": total_attempts,
            "overall_accuracy": overall_acc,
        })
    return result


@router.get("/students/{student_id}/progress")
def student_progress(
    student_id: int,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Return a specific student's aggregated progress (teacher view)."""
    student = db.query(User).filter(User.id == student_id, User.role == ROLE_STUDENT).first()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    data = progress_service.get_progress(db, student_id)
    data["student"] = {"id": student.id, "name": student.name, "email": student.email}
    return data


@router.get("/students/{student_id}/solutions")
def student_solutions(
    student_id: int,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Return a student's recent solve history."""
    student = db.query(User).filter(User.id == student_id, User.role == ROLE_STUDENT).first()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    problems = (
        db.query(Problem)
        .filter_by(user_id=student_id)
        .order_by(Problem.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id":           p.id,
            "input":        p.input_text,
            "interpreted":  p.interpreted_text,
            "expression_type": p.expression_type,
            "answer":       p.answer_text,
            "answer_spoken": p.answer_spoken,
            "created_at":   p.created_at.isoformat() if p.created_at else "",
        }
        for p in problems
    ]


# ---------------------------------------------------------------------------
# Assignments  (stored as a lightweight JSON blob in the DB via a new table)
# We use a simple in-process dict store keyed by teacher_id for the MVP
# since adding a new migration is out of scope.  A future version should
# persist to a proper assignments table.
# ---------------------------------------------------------------------------

# In-memory store: {assignment_id: dict}  — resets on server restart.
# This is intentional for the MVP; the API contract is correct and the
# frontend works against it.  Replace with a DB table when ready.
_assignments: dict[int, dict] = {}
_next_id = 1


def _next_assignment_id() -> int:
    global _next_id
    aid = _next_id
    _next_id += 1
    return aid


@router.post("/assignments", status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentIn,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Create a new practice assignment."""
    aid = _next_assignment_id()
    now = datetime.now(timezone.utc).isoformat()
    _assignments[aid] = {
        "id":             aid,
        "teacher_id":     teacher.id,
        "teacher_name":   teacher.name,
        "title":          payload.title,
        "topic":          payload.topic,
        "difficulty":     payload.difficulty,
        "question_count": payload.question_count,
        "description":    payload.description,
        "created_at":     now,
        "updated_at":     now,
    }
    return _assignments[aid]


@router.get("/assignments")
def list_assignments(teacher: User = Depends(require_teacher)):
    """List all assignments created by this teacher."""
    return [a for a in _assignments.values() if a["teacher_id"] == teacher.id]


@router.put("/assignments/{assignment_id}")
def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    teacher: User = Depends(require_teacher),
):
    """Update an existing assignment."""
    a = _assignments.get(assignment_id)
    if a is None or a["teacher_id"] != teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    if payload.title is not None:
        a["title"] = payload.title
    if payload.description is not None:
        a["description"] = payload.description
    if payload.question_count is not None:
        a["question_count"] = payload.question_count
    a["updated_at"] = datetime.now(timezone.utc).isoformat()
    return a


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    teacher: User = Depends(require_teacher),
):
    """Delete an assignment."""
    a = _assignments.get(assignment_id)
    if a is None or a["teacher_id"] != teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    del _assignments[assignment_id]


@router.get("/assignments/{assignment_id}/results")
def assignment_results(
    assignment_id: int,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Return per-student results for an assignment topic/difficulty."""
    a = _assignments.get(assignment_id)
    if a is None or a["teacher_id"] != teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    topic      = a["topic"]
    difficulty = a["difficulty"]

    # Find all students who have attempted questions matching this topic/difficulty.
    sessions = (
        db.query(PracticeSession)
        .filter_by(topic=topic, difficulty=difficulty)
        .all()
    )
    student_map: dict[int, dict] = {}
    for sess in sessions:
        uid = sess.user_id
        student = db.query(User).filter(User.id == uid, User.role == ROLE_STUDENT).first()
        if student is None:
            continue
        attempts = db.query(Attempt).filter_by(session_id=sess.id).all()
        correct   = sum(1 for at in attempts if at.is_correct)
        total     = len(attempts)
        if uid not in student_map:
            student_map[uid] = {
                "student_id":   uid,
                "student_name": student.name,
                "attempts":     0,
                "correct":      0,
                "accuracy":     0.0,
            }
        student_map[uid]["attempts"] += total
        student_map[uid]["correct"]  += correct

    for row in student_map.values():
        if row["attempts"]:
            row["accuracy"] = round(row["correct"] / row["attempts"] * 100, 1)

    return {
        "assignment": a,
        "results": list(student_map.values()),
    }
