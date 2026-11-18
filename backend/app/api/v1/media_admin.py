"""Admin media library endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import require_super_admin
from app.core.config import settings
from app.core.constants import MEDIA_FOLDERS
from app.db.session import get_db
from app.models import AdminUser
from app.schemas.common import MessageResponse
from app.schemas.media import (
    MediaListOut,
    MediaOut,
    MediaUpdate,
    MediaUsageOut,
)
from app.services import activity
from app.services import media as media_service
from app.services.media import MediaError

router = APIRouter(prefix="/admin/media", tags=["admin:media"])


async def _read_upload(file: UploadFile) -> bytes:
    total = 0
    chunks: list[bytes] = []
    while True:
        chunk = await file.read(64 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > settings.media_max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Images must be {settings.media_max_bytes // (1024 * 1024)} MB or smaller.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("", response_model=MediaOut, status_code=status.HTTP_201_CREATED)
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    alt_text: str | None = Form(default=None),
    folder: str | None = Form(default=None),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(require_super_admin),
) -> MediaOut:
    data = await _read_upload(file)

    try:
        asset = media_service.store(
            db,
            uploader=admin,
            original_filename=file.filename or "image",
            content_type=file.content_type,
            data=data,
            title=title,
            alt_text=alt_text,
            folder=folder,
        )
    except MediaError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    activity.record(
        db,
        activity.MEDIA_UPLOADED,
        user_id=admin.id,
        identifier=admin.email,
        detail=f"{asset.filename} ({asset.width}x{asset.height})",
        request=request,
    )
    return MediaOut.model_validate(asset)


@router.get("", response_model=MediaListOut)
def list_media(
    search: str | None = Query(default=None, max_length=120),
    kind: str | None = Query(default=None, max_length=20),
    folder: str | None = Query(default=None, max_length=40),
    attached_to_type: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_super_admin),
) -> MediaListOut:
    items, total = media_service.list_assets(
        db,
        search=search,
        kind=kind,
        folder=folder,
        attached_to_type=attached_to_type,
        limit=limit,
        offset=offset,
    )
    return MediaListOut(
        items=[MediaOut.model_validate(item) for item in items],
        total=total,
        folders=list(MEDIA_FOLDERS),
    )


@router.get("/{asset_id}/usage", response_model=MediaUsageOut)
def media_usage(
    asset_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_super_admin),
) -> MediaUsageOut:
    asset = media_service.get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")
    entries = media_service.usage_for_asset(db, asset)
    return MediaUsageOut(count=len(entries), entries=entries)


@router.post("/{asset_id}/replace", response_model=MediaOut)
async def replace_media(
    asset_id: uuid.UUID,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(require_super_admin),
) -> MediaOut:
    asset = media_service.get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")
    data = await _read_upload(file)
    try:
        asset = media_service.replace_asset(
            db,
            asset,
            original_filename=file.filename or asset.original_filename,
            content_type=file.content_type,
            data=data,
        )
    except MediaError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    activity.record(
        db,
        activity.MEDIA_UPDATED,
        user_id=admin.id,
        identifier=admin.email,
        detail=f"Media file replaced: {asset.filename}",
        request=request,
    )
    return MediaOut.model_validate(asset)


@router.patch("/{asset_id}", response_model=MediaOut)
def update_media(
    asset_id: uuid.UUID,
    payload: MediaUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(require_super_admin),
) -> MediaOut:
    asset = media_service.get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")
    values = payload.model_dump(exclude_unset=True)
    asset = media_service.update_asset(db, asset, **values)
    activity.record(
        db,
        activity.MEDIA_UPDATED,
        user_id=admin.id,
        identifier=admin.email,
        detail=f"Media metadata updated: {asset.filename}",
        request=request,
    )
    return MediaOut.model_validate(asset)


@router.delete("/{asset_id}", response_model=MessageResponse)
def delete_media(
    asset_id: uuid.UUID,
    request: Request,
    force: bool = Query(default=False),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(require_super_admin),
) -> MessageResponse:
    asset = media_service.get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")
    filename = asset.filename
    try:
        media_service.delete_asset(db, asset, force=force)
    except MediaError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    activity.record(
        db,
        activity.MEDIA_DELETED,
        user_id=admin.id,
        identifier=admin.email,
        detail=filename,
        request=request,
    )
    return MessageResponse(message="Media asset deleted.")
