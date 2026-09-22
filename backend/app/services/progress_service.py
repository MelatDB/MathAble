"""Progress tracking: attempts roll-up and progress reporting."""
from datetime import datetime, timezone

from app.models.practice import Attempt, StudentProgress


def record_attempt(db, user_id: int, topic: str, correct: bool) -> None:
    """Update (or create) the per-topic progress row for this attempt."""
    row = (
        db.query(StudentProgress)
        .filter_by(user_id=user_id, topic=topic)
        .first()
    )
    if row is None:
        row = StudentProgress(user_id=user_id, topic=topic,
                              attempts=0, correct=0, incorrect=0, accuracy=0.0)
        db.add(row)

    row.attempts  = (row.attempts  or 0) + 1
    if correct:
        row.correct   = (row.correct   or 0) + 1
    else:
        row.incorrect = (row.incorrect or 0) + 1
    row.accuracy = round(
        (row.correct / row.attempts) * 100, 1
    ) if row.attempts else 0.0
    row.updated_at = datetime.now(timezone.utc)
    db.flush()


def get_progress(db, user_id: int) -> dict:
    """Aggregated progress for the dashboard and progress page."""
    rows = (
        db.query(StudentProgress)
        .filter_by(user_id=user_id)
        .order_by(StudentProgress.topic)
        .all()
    )
    topics = [
        {
            "topic": row.topic,
            "attempts": row.attempts,
            "correct": row.correct,
            "incorrect": row.incorrect,
            "accuracy": row.accuracy,
        }
        for row in rows
    ]

    total_attempts = sum(r["attempts"] for r in topics)
    total_correct = sum(r["correct"] for r in topics)
    total_incorrect = sum(r["incorrect"] for r in topics)
    overall = round(total_correct / total_attempts * 100, 1) if total_attempts else 0.0

    # Recent practice attempts.
    attempts = (
        db.query(Attempt)
        .filter_by(user_id=user_id)
        .order_by(Attempt.answered_at.desc())
        .limit(10)
        .all()
    )
    recent_attempts = [
        {
            "id": a.id,
            "question_id": a.question_id,
            "given_answer": a.given_answer,
            "is_correct": bool(a.is_correct),
            "answered_at": a.answered_at.isoformat() if a.answered_at else "",
            "question": {
                "id": a.question.id,
                "session_id": a.question.session_id,
                "prompt": a.question.prompt,
                "prompt_spoken": a.question.prompt_spoken,
                "prompt_mathml": a.question.prompt_mathml,
                "difficulty": a.question.difficulty,
            },
        }
        for a in attempts
    ]

    # Most recent solved problems.
    from app.models.problem import Problem
    problems = (
        db.query(Problem)
        .filter_by(user_id=user_id)
        .order_by(Problem.created_at.desc())
        .limit(10)
        .all()
    )

    activity = []
    for p in problems:
        activity.append({
            "kind": "solved_problem",
            "label": p.input_text,
            "detail": p.answer_text,
            "at": p.created_at.isoformat() if p.created_at else "",
        })
    for a in attempts:
        activity.append({
            "kind": "practice_attempt",
            "label": a.question.prompt,
            "detail": "Correct" if a.is_correct else "Incorrect",
            "at": a.answered_at.isoformat() if a.answered_at else "",
        })
    activity.sort(key=lambda item: item["at"], reverse=True)
    activity = activity[:10]

    return {
        "total_attempts": total_attempts,
        "total_correct": total_correct,
        "total_incorrect": total_incorrect,
        "overall_accuracy": overall,
        "topics": topics,
        "recent_activity": activity,
        "recent_attempts": recent_attempts,
    }