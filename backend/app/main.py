import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.health import router as health_router
from app.api.v1 import admin as admin_router
from app.api.v1 import analytics_admin as analytics_admin_router
from app.api.v1 import analytics_public as analytics_public_router
from app.api.v1 import auth as auth_router
from app.api.v1 import content_admin as content_admin_router
from app.api.v1 import data_admin as data_admin_router
from app.api.v1 import data_public as data_public_router
from app.api.v1 import github as github_router
from app.api.v1 import media_admin as media_admin_router
from app.api.v1 import public as public_router
from app.api.v1 import security_admin as security_admin_router
from app.api.v1 import site_admin as site_admin_router
from app.api.v1 import webhooks as webhooks_router
from app.core.config import settings
from app.db.session import SessionLocal
from app.integrations.github.client import GitHubError
from app.services.bootstrap import ensure_initial_admin
from app.services.media import media_directory
from app.services.sms import provider_name

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("portfolio.api")

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "API starting environment=%s database=%s",
        settings.environment,
        "sqlite" if settings.is_sqlite else "postgresql",
    )
    logger.info("SMS transport: %s", provider_name())
    if not settings.arkesel_configured:
        if settings.is_production:
            logger.error(
                "Arkesel is not configured; OTP SMS will fail closed in production"
            )
        else:
            logger.warning(
                "Arkesel is not configured; real SMS is disabled and the development "
                "transport is active. Set ARKESEL_API_KEY and ARKESEL_SENDER_ID."
            )
    if settings.is_production and settings.secret_key == "development-only-secret-change-me":
        logger.critical("SECRET_KEY is still the development default in production")
    if settings.is_production and not settings.cookie_secure:
        logger.warning("COOKIE_SECURE is false in production")

    media_directory()

    try:
        with SessionLocal() as db:
            ensure_initial_admin(db)
    except Exception:
        # A missing table simply means migrations have not run yet. Do not
        # prevent the API from starting for a bootstrap check.
        logger.exception("Initial administrator check skipped")

    yield
    logger.info("API stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Accept", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        started = time.perf_counter()

        # Cookie-authenticated mutations must come from a configured origin.
        origin = request.headers.get("origin")
        if (
            request.method in UNSAFE_METHODS
            and origin
            and origin not in settings.frontend_origins
        ):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Origin is not allowed"},
                headers={"X-Request-ID": request_id},
            )

        # Reject oversized contact submissions before the body is parsed.
        if request.method == "POST" and request.url.path.endswith("/contact"):
            declared = request.headers.get("content-length")
            if declared and declared.isdigit():
                if int(declared) > settings.contact_max_request_bytes:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": "Message is too large."},
                        headers={"X-Request-ID": request_id},
                    )

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        path = request.url.path
        if path.startswith(settings.api_v1_prefix):
            if path.startswith(f"{settings.api_v1_prefix}/admin") or path.startswith(
                f"{settings.api_v1_prefix}/auth"
            ):
                # Admin responses must never be stored by a shared cache.
                response.headers["Cache-Control"] = "no-store"
            else:
                # Public JSON is database-backed. Revalidate every time so an
                # admin publish is visible immediately instead of serving a
                # stale cached copy.
                response.headers["Cache-Control"] = (
                    "public, max-age=0, must-revalidate"
                )
        elif path.startswith("/media/"):
            # Same filename is preserved when an asset is replaced, so do not
            # mark uploads immutable.
            response.headers["Cache-Control"] = "public, max-age=3600, must-revalidate"

        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.info(
            "%s %s %s %.1fms request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request_id,
        )
        return response

    @app.exception_handler(GitHubError)
    async def github_error_handler(request: Request, exc: GitHubError):
        """Translate GitHub provider failures into friendly API responses."""
        headers = (
            {"Retry-After": str(exc.retry_after)}
            if exc.retry_after is not None
            else None
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
            headers=headers,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    app.include_router(health_router, prefix="/health", tags=["health"])
    app.include_router(
        auth_router.router, prefix=settings.api_v1_prefix, tags=["auth"]
    )
    app.include_router(
        webhooks_router.router, prefix=settings.api_v1_prefix, tags=["webhooks"]
    )
    app.include_router(
        public_router.router, prefix=settings.api_v1_prefix, tags=["public"]
    )
    app.include_router(
        data_public_router.router, prefix=settings.api_v1_prefix, tags=["data"]
    )
    app.include_router(
        analytics_public_router.router, prefix=settings.api_v1_prefix, tags=["analytics"]
    )
    # Mounted before the admin router so GitHub-specific project routes win.
    app.include_router(
        github_router.router,
        prefix=settings.api_v1_prefix,
        tags=["github"],
    )
    app.include_router(
        admin_router.router,
        prefix=f"{settings.api_v1_prefix}/admin",
        tags=["admin"],
    )
    app.include_router(
        analytics_admin_router.router,
        prefix=f"{settings.api_v1_prefix}/admin",
        tags=["admin:analytics"],
    )
    app.include_router(
        data_admin_router.router,
        prefix=f"{settings.api_v1_prefix}/admin",
        tags=["admin:data"],
    )
    app.include_router(
        content_admin_router.router,
        prefix=f"{settings.api_v1_prefix}/admin",
        tags=["admin:content"],
    )
    app.include_router(
        site_admin_router.router,
        prefix=f"{settings.api_v1_prefix}/admin",
        tags=["admin:site"],
    )
    app.include_router(
        media_admin_router.router,
        prefix=settings.api_v1_prefix,
        tags=["admin:media"],
    )
    app.include_router(
        security_admin_router.router,
        prefix=settings.api_v1_prefix,
    )

    app.mount("/media", StaticFiles(directory=media_directory()), name="media")

    return app


app = create_app()
