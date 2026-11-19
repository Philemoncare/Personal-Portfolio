from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter()


@router.get("", include_in_schema=False)
@router.get("/live")
def live() -> dict[str, str]:
    """Liveness probe.

    `/health` is kept as an alias because external monitors commonly probe the
    bare path. `/health/live` remains the documented endpoint.
    """
    return {"status": "ok"}


@router.get("/ready")
def ready(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 - readiness probes must not leak details
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return {"status": "ok", "database": "ok"}
