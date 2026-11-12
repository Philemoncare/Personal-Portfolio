from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import AdminUser
from app.services.auth import resolve_session


def get_client_key(request: Request) -> str:
    # Behind a trusted proxy, configure forwarding at the proxy layer. Do not
    # trust arbitrary X-Forwarded-For values here.
    return request.client.host if request.client else "unknown"


def get_current_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> AdminUser:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = resolve_session(db, token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )
    return user
