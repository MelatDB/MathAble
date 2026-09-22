"""Practice endpoints: question generation and answer submission."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.routes.deps import get_current_user
from app.schemas.practice import (
    AnswerFeedback,
    GeneratePracticeIn,
    PracticeSessionOut,
    SubmitAnswerIn,
)
from app.services import practice_service

router = APIRouter(prefix="/api/practice", tags=["practice"])


@router.post("/generate", response_model=PracticeSessionOut)
def generate(
    payload: GeneratePracticeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a new practice session with questions."""
    try:
        session = practice_service.generate_session(
            db=db,
            user_id=user.id,
            topic=payload.topic,
            difficulty=payload.difficulty,
            count=payload.count,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    return {
        "id": session.id,
        "topic": session.topic,
        "difficulty": session.difficulty,
        "question_count": session.question_count,
        "questions": [
            {
                "id": q.id,
                "session_id": q.session_id,
                "prompt": q.prompt,
                "prompt_spoken": q.prompt_spoken,
                "prompt_mathml": q.prompt_mathml,
                "difficulty": q.difficulty,
            }
            for q in session.questions
        ],
    }


@router.post("/submit", response_model=AnswerFeedback)
def submit(
    payload: SubmitAnswerIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check an answer, record the attempt and return feedback."""
    try:
        feedback = practice_service.submit_answer(
            db=db, user_id=user.id,
            question_id=payload.question_id,
            answer=payload.answer,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    return feedback