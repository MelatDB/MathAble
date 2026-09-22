"""MathAble backend entry point.

Run with:  uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.session import init_db
from app.routes import (
    accessibility,
    auth,
    health,
    practice,
    progress,
    solve,
    teacher,
    users,
)

# Create tables on first start (self-initialising SQLite database).
init_db()

app = FastAPI(
    title="MathAble API",
    description="Accessibility-first mathematics learning platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(solve.router)
app.include_router(practice.router)
app.include_router(progress.router)
app.include_router(accessibility.router)
app.include_router(health.router)
app.include_router(teacher.router)


@app.get("/")
def root():
    """Basic API information."""
    return {"message": "Welcome to the MathAble API. See /docs for details."}