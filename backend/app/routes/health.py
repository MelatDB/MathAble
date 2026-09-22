"""Health and info endpoint."""
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health():
    """Simple liveness check used by the frontend and deployment probes."""
    return {"status": "ok", "service": "MathAble backend"}