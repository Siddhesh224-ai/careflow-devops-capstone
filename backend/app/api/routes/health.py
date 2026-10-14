import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import DbSession

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


@router.get("/health", summary="Liveness probe")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", summary="Database readiness probe")
def ready(session: DbSession) -> dict[str, str]:
    try:
        session.execute(text("SELECT 1"))
        return {"status": "ready"}
    except SQLAlchemyError as exc:
        logger.error("Database readiness check failed: %s", exc.__class__.__name__)
        raise HTTPException(status_code=503, detail="Database is unavailable.") from exc

