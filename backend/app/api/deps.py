from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import AdminUser
from app.services.auth import resolve_session


def get_client_key(request: Request) -> str:
    # Behind a trusted proxy, configure forwarding at the proxy layer. Do not
    # trust arbitrary X-Forwarded-For values here.
    return request.client.host if request.client else "unknown"


def _resolve_admin(request: Request, db: Session, *, allow_pending_password: bool) -> AdminUser:
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

    if user.must_change_password and not allow_pending_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required",
            headers={"X-Auth-Reason": "password_change_required"},
        )
    return user


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    """A fully authenticated admin, blocked until the password is changed."""

    return _resolve_admin(request, db, allow_pending_password=False)


def get_authenticated_admin(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    """Authenticated admin allowed to read their account and change password."""

    return _resolve_admin(request, db, allow_pending_password=True)


def require_roles(*roles: str) -> Callable[..., AdminUser]:
    """Authorization guard prepared for future EDITOR/ANALYST/VIEWER roles."""

    def dependency(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
        if admin.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return admin

    return dependency


require_super_admin = require_roles("SUPER_ADMIN")
