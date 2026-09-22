"""Mathematics solver endpoint plus solve history."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.mathematics.solver import (
    InvalidExpression,
    UnsupportedExpression,
    process_expression,
)
from app.models.problem import Problem, Solution
from app.models.user import User
from app.routes.deps import get_current_user
from app.schemas.solve import SolveIn, SolveOut

router = APIRouter(prefix="/api", tags=["solve"])


@router.post("/solve", response_model=SolveOut)
def solve(
    payload: SolveIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Interpret, solve and explain a mathematical problem."""
    try:
        result = process_expression(payload.expression)
    except InvalidExpression as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except UnsupportedExpression as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    # Persist the solved problem and its steps for history.
    problem = Problem(
        user_id=user.id,
        input_text=payload.expression,
        interpreted_text=result["interpreted"],
        expression_type=result["expression_type"],
        answer_text=result["answer"],
        answer_spoken=result["answer_spoken"],
        answer_mathml=result["answer_mathml"],
        supported=1 if result["supported"] else 0,
        message=result["message"],
    )
    db.add(problem)
    db.flush()
    for idx, step in enumerate(result["steps"]):
        db.add(Solution(
            problem_id=problem.id,
            step_index=idx,
            title=step["title"],
            math=step["math"],
            spoken=step["spoken"],
            mathml=step["mathml"],
        ))
    db.commit()

    result["saved"] = True
    return result


@router.get("/problems/history")
def problem_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Recent solved problems for the current student."""
    problems = (
        db.query(Problem)
        .filter_by(user_id=user.id)
        .order_by(Problem.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": p.id,
            "input": p.input_text,
            "interpreted": p.interpreted_text,
            "expression_type": p.expression_type,
            "answer": p.answer_text,
            "answer_spoken": p.answer_spoken,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        }
        for p in problems
    ]