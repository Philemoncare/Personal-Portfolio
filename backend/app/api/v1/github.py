"""GitHub OAuth, repository browsing, import, and synchronization endpoints.

All routes are administrator-only except the OAuth callback, which validates a
signed state value plus the connect-time cookie before storing a credential.
"""

from __future__ import annotations

import hmac
import logging
import uuid
from datetime import UTC, datetime
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import settings
from app.db.session import get_db
from app.integrations.github import auth
from app.integrations.github.client import GitHubClient, GitHubError, clear_cache
from app.integrations.github.contents import (
    download_image,
    extract_images,
    get_directory,
    get_readme,
    safe_repository_path,
    UnsafePathError,
)
from app.integrations.github.mapper import (
    DuplicateRepositoryError,
    GitHubImportError,
    import_repository,
    project_github_link,
    record_log,
    sync_project,
    unlink_repository,
)
from app.integrations.github.parser import contains_secret
from app.integrations.github.repositories import (
    analyze_repository,
    fetch_repositories,
    get_languages,
    get_repository,
    map_repository,
    project_for_repository,
    project_link_map,
)
from app.models import AdminUser, GitHubConnection, GitHubImportLog, Project
from app.schemas.github import (
    GitHubConnectOut,
    GitHubConnectionOut,
    GitHubContentsOut,
    GitHubImagesOut,
    GitHubImportLogListOut,
    GitHubImportLogOut,
    GitHubImportRequest,
    GitHubImportResultOut,
    GitHubProjectLinkOut,
    GitHubReadmeOut,
    GitHubRepositoryListOut,
    GitHubRepositoryOut,
    GitHubStatusOut,
    GitHubSyncOut,
    RepositoryInspectionOut,
)
from app.services import activity
from app.services.auth import resolve_session

logger = logging.getLogger("portfolio.github")

router = APIRouter()

OAUTH_COOKIE = "github_oauth_state"
OAUTH_COOKIE_PATH = "/api/v1/integrations/github"


# --- Helpers --------------------------------------------------------------


def _connection_out(connection: GitHubConnection | None) -> GitHubConnectionOut | None:
    if connection is None:
        return None
    return GitHubConnectionOut(
        connected=connection.is_active,
        username=connection.username,
        display_name=connection.display_name,
        avatar_url=connection.avatar_url,
        account_url=connection.account_url,
        github_account_id=connection.github_account_id,
        scopes=connection.scope_list,
        repository_access=connection.repository_access,
        private_repository_access=connection.private_repository_access,
        repository_count=connection.repository_count,
        connected_at=connection.connected_at,
        updated_at=connection.updated_at,
        revoked_at=connection.revoked_at,
    )


def _raise_http(exc: GitHubError) -> None:
    headers = (
        {"Retry-After": str(exc.retry_after)} if exc.retry_after is not None else None
    )
    raise HTTPException(
        status_code=exc.status_code, detail=exc.message, headers=headers
    )


async def _open_client(db: Session, admin: AdminUser) -> GitHubClient:
    connection = auth.require_connection(db, admin)
    return GitHubClient(auth.connection_token(connection))


def _status_payload(
    admin: AdminUser, connection: GitHubConnection | None
) -> GitHubStatusOut:
    configured = settings.github_configured
    active = connection if connection and connection.is_active else None
    if not configured:
        message = (
            "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, "
            "GITHUB_CLIENT_SECRET, and GITHUB_REDIRECT_URI on the backend."
        )
    elif active is None:
        message = "Connect GitHub to browse and import repositories."
    elif not active.private_repository_access:
        message = (
            "Connected with public repository access. Private repositories are "
            "hidden unless private repository access is enabled on the server."
        )
    else:
        message = "Connected with public and private repository access."
    return GitHubStatusOut(
        configured=configured,
        connected=active is not None,
        connection=_connection_out(connection),
        requested_scopes=list(settings.github_scopes),
        private_access_requested=settings.github_allow_private_repositories,
        authorize_url=None,
        redirect_uri=settings.github_redirect_uri if configured else None,
        message=message,
    )


# --- Connection -----------------------------------------------------------


@router.get("/integrations/github/status", response_model=GitHubStatusOut)
def github_status(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubStatusOut:
    return _status_payload(admin, auth.get_connection(db, admin.id))


@router.get("/integrations/github/connect", response_model=GitHubConnectOut)
def github_connect(
    response: Response,
    admin: AdminUser = Depends(get_current_admin),
) -> GitHubConnectOut:
    if not settings.github_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "GitHub OAuth is not configured on the server. Set GITHUB_CLIENT_ID, "
                "GITHUB_CLIENT_SECRET, and GITHUB_REDIRECT_URI."
            ),
        )
    state = auth.create_oauth_state(admin.id)
    authorize_url = auth.build_authorize_url(state)
    response.set_cookie(
        OAUTH_COOKIE,
        state,
        max_age=settings.github_oauth_state_ttl_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path=OAUTH_COOKIE_PATH,
    )
    return GitHubConnectOut(
        authorize_url=authorize_url,
        scopes=list(settings.github_scopes),
        redirect_uri=settings.github_redirect_uri or "",
        expires_in_minutes=settings.github_oauth_state_ttl_minutes,
    )


def _frontend_redirect(kind: str, reason: str | None = None) -> RedirectResponse:
    params = {"github": kind}
    if reason:
        params["reason"] = reason
    url = f"{settings.frontend_public_url}/admin/integrations/github?{urlencode(params)}"
    return RedirectResponse(url, status_code=status.HTTP_302_FOUND)


@router.get("/integrations/github/callback")
async def github_callback(
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if error:
        logger.info("GitHub OAuth denied by user: %s", error)
        return _frontend_redirect("error", error_description or error)

    user_id = auth.verify_oauth_state(state)
    if user_id is None:
        return _frontend_redirect("error", "The GitHub authorization state is invalid or expired.")

    cookie_state = request.cookies.get(OAUTH_COOKIE)
    if not cookie_state or not state or not hmac.compare_digest(cookie_state, state):
        return _frontend_redirect("error", "The GitHub authorization could not be verified.")

    session_token = request.cookies.get(settings.session_cookie_name) or ""
    admin = resolve_session(db, session_token)
    if admin is None or admin.id != user_id:
        return _frontend_redirect(
            "error", "Your admin session expired before GitHub finished connecting."
        )

    if not code:
        return _frontend_redirect("error", "GitHub did not return an authorization code.")

    try:
        token_payload = await auth.exchange_code(code)
        account = await auth.fetch_account(str(token_payload["access_token"]))
        auth.save_connection(
            db, admin, token_payload=token_payload, account=account
        )
    except GitHubError as exc:
        logger.warning("GitHub OAuth callback failed: %s", exc.code)
        return _frontend_redirect("error", exc.message)

    clear_cache()
    response = _frontend_redirect("connected")
    response.delete_cookie(OAUTH_COOKIE, path=OAUTH_COOKIE_PATH)
    return response


@router.post("/integrations/github/disconnect", response_model=GitHubStatusOut)
async def github_disconnect(
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubStatusOut:
    connection = auth.get_connection(db, admin.id)
    if connection is not None and connection.is_active:
        try:
            await auth.revoke_connection(db, connection)
        finally:
            clear_cache()
        activity.record(
            db,
            "github_disconnected",
            user_id=admin.id,
            identifier=connection.username,
            detail="GitHub account disconnected; existing projects were left untouched",
            request=request,
        )
    return _status_payload(admin, auth.get_connection(db, admin.id))


@router.post("/integrations/github/refresh", response_model=GitHubConnectionOut)
async def github_refresh_connection(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubConnectionOut:
    connection = auth.require_connection(db, admin)
    try:
        account = await auth.refresh_connection(connection)
    except GitHubError as exc:
        _raise_http(exc)
    public_repos = int(account.get("public_repos") or 0)
    private_repos = int(account.get("total_private_repos") or 0)
    connection.username = str(account.get("login") or connection.username)
    connection.github_account_id = str(account.get("id") or connection.github_account_id)
    connection.display_name = account.get("name")
    connection.avatar_url = account.get("avatar_url")
    connection.account_url = account.get("html_url")
    connection.repository_count = public_repos + private_repos
    db.commit()
    db.refresh(connection)
    clear_cache()
    return _connection_out(connection) or _connection_out(auth.get_connection(db, admin.id))


# --- Repositories ---------------------------------------------------------


@router.get("/github/repositories", response_model=GitHubRepositoryListOut)
async def github_repositories(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, max_length=120),
    visibility: str | None = Query(default=None, pattern="^(public|private)$"),
    archived: str | None = Query(default=None, pattern="^(true|false)$"),
    fork: str | None = Query(default=None, pattern="^(true|false)$"),
    language: str | None = Query(default=None, max_length=80),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=30, ge=1, le=100),
    refresh: bool = Query(default=False),
) -> GitHubRepositoryListOut:
    connection = auth.require_connection(db, admin)
    if refresh:
        clear_cache()
    try:
        client = await _open_client(db, admin)
        try:
            raw, truncated = await fetch_repositories(
                client,
                max_pages=settings.github_max_repository_pages,
                per_page=settings.github_repository_page_size,
            )
            rate_remaining = client.rate_limit.get("remaining")
        finally:
            await client.close()
    except GitHubError as exc:
        _raise_http(exc)

    links = project_link_map(db)
    mapped = [
        map_repository(item, link=links.get(str(item.get("id"))))
        for item in raw
    ]

    term = (search or "").strip().lower()
    if term:
        mapped = [
            item
            for item in mapped
            if term in item.name.lower()
            or term in (item.description or "").lower()
            or term in item.full_name.lower()
            or any(term in topic.lower() for topic in item.topics)
            or term in (item.language or "").lower()
        ]
    if visibility == "public":
        mapped = [item for item in mapped if not item.private]
    elif visibility == "private":
        mapped = [item for item in mapped if item.private]
    if archived == "true":
        mapped = [item for item in mapped if item.archived]
    elif archived == "false":
        mapped = [item for item in mapped if not item.archived]
    if fork == "true":
        mapped = [item for item in mapped if item.fork]
    elif fork == "false":
        mapped = [item for item in mapped if not item.fork]
    if language:
        mapped = [
            item
            for item in mapped
            if (item.language or "").lower() == language.lower()
        ]

    languages = sorted({item.language for item in mapped if item.language})
    total = len(mapped)
    start = (page - 1) * per_page
    page_items = mapped[start : start + per_page]

    if connection.is_active and not truncated and connection.repository_count != len(raw):
        connection.repository_count = len(raw)
        db.commit()

    return GitHubRepositoryListOut(
        items=page_items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=start + per_page < total,
        truncated=truncated,
        languages=languages,
        rate_limit_remaining=rate_remaining,
        fetched_at=datetime.now(UTC),
        cached=not refresh,
    )


async def _detail(
    repository_id: str, db: Session, admin: AdminUser
) -> GitHubRepositoryOut:
    client = await _open_client(db, admin)
    try:
        raw = await get_repository(client, repository_id)
        languages = await get_languages(client, str(raw.get("full_name") or ""))
    except GitHubError as exc:
        _raise_http(exc)
    finally:
        await client.close()
    link = project_for_repository(db, repository_id)
    return map_repository(raw, link=link, languages=languages)


@router.get(
    "/github/repositories/{repository_id}", response_model=GitHubRepositoryOut
)
async def github_repository(
    repository_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubRepositoryOut:
    return await _detail(repository_id, db, admin)


@router.get(
    "/github/repositories/{repository_id}/contents",
    response_model=GitHubContentsOut,
)
async def github_repository_contents(
    repository_id: str,
    path: str = Query(default="", max_length=500),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubContentsOut:
    clean = ""
    if path:
        try:
            clean = safe_repository_path(path)
        except UnsafePathError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    client = await _open_client(db, admin)
    try:
        raw = await get_repository(client, repository_id)
        listing = await get_directory(
            client,
            str(raw.get("full_name") or ""),
            path=clean,
            ref=str(raw.get("default_branch") or "main"),
        )
    except GitHubError as exc:
        _raise_http(exc)
    finally:
        await client.close()
    return listing


@router.get(
    "/github/repositories/{repository_id}/readme", response_model=GitHubReadmeOut
)
async def github_repository_readme(
    repository_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubReadmeOut:
    client = await _open_client(db, admin)
    try:
        raw = await get_repository(client, repository_id)
        readme = await get_readme(client, str(raw.get("full_name") or ""))
    except GitHubError as exc:
        _raise_http(exc)
    finally:
        await client.close()
    if readme.content and contains_secret(readme.content):
        return GitHubReadmeOut(
            path=readme.path,
            html_url=readme.html_url,
            available=False,
            content=None,
            truncated=False,
        )
    return readme


@router.get(
    "/github/repositories/{repository_id}/images", response_model=GitHubImagesOut
)
async def github_repository_images(
    repository_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubImagesOut:
    client = await _open_client(db, admin)
    try:
        raw = await get_repository(client, repository_id)
        readme = await get_readme(client, str(raw.get("full_name") or ""))
    except GitHubError as exc:
        _raise_http(exc)
    finally:
        await client.close()
    if not readme.content or contains_secret(readme.content):
        return GitHubImagesOut(items=[], readme_path=readme.path, ignored=[])
    return extract_images(
        readme.content,
        full_name=str(raw.get("full_name") or ""),
        readme_path=readme.path or "README.md",
        repository_id=str(raw.get("id") or repository_id),
    )


@router.get(
    "/github/repositories/{repository_id}/images/preview",
)
async def github_repository_image_preview(
    repository_id: str,
    path: str = Query(min_length=1, max_length=500),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    client = await _open_client(db, admin)
    try:
        raw = await get_repository(client, repository_id)
        data, mime = await download_image(
            client,
            str(raw.get("full_name") or ""),
            path,
            ref=str(raw.get("default_branch") or "main"),
        )
    except GitHubError as exc:
        _raise_http(exc)
    finally:
        await client.close()
    return Response(
        content=data,
        media_type=mime or "application/octet-stream",
        headers={
            "Cache-Control": "private, max-age=300",
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get(
    "/github/repositories/{repository_id}/inspection",
    response_model=RepositoryInspectionOut,
)
async def github_repository_inspection(
    repository_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> RepositoryInspectionOut:
    client = await _open_client(db, admin)
    try:
        inspection = await analyze_repository(client, repository_id)
    except GitHubError as exc:
        _raise_http(exc)
    finally:
        await client.close()

    link = project_for_repository(db, repository_id)
    if link is not None:
        inspection = inspection.model_copy(
            update={
                "repository": inspection.repository.model_copy(
                    update={
                        "linked_project_id": link.id,
                        "linked_project_title": link.title,
                        "linked_project_status": link.status,
                        "import_state": link.status,
                    }
                )
            }
        )
    return inspection


# --- Import and sync ------------------------------------------------------


@router.post(
    "/admin/projects/import/github/{repository_id}",
    response_model=GitHubImportResultOut,
    status_code=status.HTTP_201_CREATED,
)
async def import_github_project(
    repository_id: str,
    payload: GitHubImportRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubImportResultOut:
    existing = project_for_repository(db, repository_id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"This repository is already linked to “{existing.title}”. "
                "Open that project instead of importing it again."
            ),
        )

    client = await _open_client(db, admin)
    try:
        project, log = await import_repository(
            db,
            admin=admin,
            client=client,
            repository_id=repository_id,
            payload=payload,
        )
    except DuplicateRepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"This repository is already linked to “{exc.project.title}”. "
                "Open that project instead of importing it again."
            ),
        ) from exc
    except GitHubImportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except GitHubError as exc:
        record_log(
            db,
            admin=admin,
            project=None,
            repository_id=repository_id,
            repository_full_name=repository_id,
            action="import",
            status="failed",
            summary="Repository import failed.",
            error_message=exc.message,
        )
        _raise_http(exc)
    finally:
        await client.close()

    activity.record(
        db,
        "github_project_imported",
        user_id=admin.id,
        identifier=project.slug,
        detail=f"Imported GitHub repository into draft project “{project.title}”",
        request=request,
    )
    details = log.details if isinstance(log.details, dict) else {}
    created_case_study = details.get("case_study_id")
    return GitHubImportResultOut(
        project_id=project.id,
        project_slug=project.slug,
        project_title=project.title,
        status=project.status,
        case_study_id=uuid.UUID(str(created_case_study)) if created_case_study else None,
        images_imported=int(details.get("images_imported") or 0),
        technologies=[tech.name for tech in project.technologies],
        repository_full_name=log.repository_full_name,
        message="Draft created. Review the imported content before publishing.",
    )


@router.get(
    "/admin/projects/{project_id}/github", response_model=GitHubProjectLinkOut
)
def project_github_status(
    project_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubProjectLinkOut:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return GitHubProjectLinkOut(**project_github_link(project))


@router.post(
    "/admin/projects/{project_id}/github-sync", response_model=GitHubSyncOut
)
async def sync_github_project(
    project_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubSyncOut:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    client = await _open_client(db, admin)
    try:
        result = await sync_project(db, client=client, project=project)
    except GitHubImportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except GitHubError as exc:
        record_log(
            db,
            admin=admin,
            project=project,
            repository_id=project.github_repository_id or "",
            repository_full_name=(
                f"{project.github_owner}/{project.github_repository_name}"
                if project.github_owner
                else project.github_repository_name or project.slug
            ),
            action="sync",
            status="failed",
            summary="GitHub synchronization failed.",
            error_message=exc.message,
        )
        _raise_http(exc)
    finally:
        await client.close()

    project.github_sync_enabled = True
    db.commit()
    record_log(
        db,
        admin=admin,
        project=project,
        repository_id=project.github_repository_id or "",
        repository_full_name=result.repository_full_name,
        action="sync",
        status="success",
        summary=(
            f"Synchronized GitHub metadata; {len(result.updated_fields)} field(s) changed."
        ),
        details={
            "updated_fields": result.updated_fields,
            "preserved_fields": result.preserved_fields,
        },
    )
    activity.record(
        db,
        "github_project_synced",
        user_id=admin.id,
        identifier=project.slug,
        detail=f"Synchronized GitHub metadata for “{project.title}”",
        request=request,
    )
    return result


@router.post(
    "/admin/projects/{project_id}/github-disconnect",
    response_model=GitHubProjectLinkOut,
)
def disconnect_project_github(
    project_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubProjectLinkOut:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    repository_id = project.github_repository_id or ""
    full_name = (
        f"{project.github_owner}/{project.github_repository_name}"
        if project.github_owner
        else project.github_repository_name or project.slug
    )
    unlink_repository(db, project)
    record_log(
        db,
        admin=admin,
        project=project,
        repository_id=repository_id,
        repository_full_name=full_name,
        action="disconnect",
        status="success",
        summary="Repository link removed from the project; the project was kept.",
    )
    return GitHubProjectLinkOut(**project_github_link(project))


# --- History --------------------------------------------------------------


@router.get(
    "/admin/integrations/github/logs", response_model=GitHubImportLogListOut
)
def github_import_logs(
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GitHubImportLogListOut:
    total = int(db.scalar(select(func.count(GitHubImportLog.id))) or 0)
    rows = db.scalars(
        select(GitHubImportLog)
        .order_by(GitHubImportLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    user_ids = {row.user_id for row in rows if row.user_id is not None}
    emails: dict[uuid.UUID, str] = {}
    if user_ids:
        emails = {
            user.id: user.email
            for user in db.scalars(select(AdminUser).where(AdminUser.id.in_(user_ids)))
        }
    items = []
    for row in rows:
        item = GitHubImportLogOut.model_validate(row)
        item.user_email = emails.get(row.user_id) if row.user_id else None
        items.append(item)
    return GitHubImportLogListOut(items=items, total=total)
