import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.v1 import admin as admin_router
from app.api.v1 import data_admin as data_admin_router
from app.api.v1 import data_public as data_public_router
from app.api.v1 import public as public_router
from app.core.config import settings

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

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

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

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    app.include_router(health_router, prefix="/health", tags=["health"])
    app.include_router(
        public_router.router, prefix=settings.api_v1_prefix, tags=["public"]
    )
    app.include_router(
        data_public_router.router, prefix=settings.api_v1_prefix, tags=["data"]
    )
    app.include_router(
        admin_router.router,
        prefix=f"{settings.api_v1_prefix}/admin",
        tags=["admin"],
    )
    app.include_router(
        data_admin_router.router,
        prefix=f"{settings.api_v1_prefix}/admin",
        tags=["admin:data"],
    )

    return app


app = create_app()
