import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    original_filename: str
    title: str
    url: str
    alt_text: str
    caption: str | None
    mime_type: str
    extension: str
    size_bytes: int
    width: int
    height: int
    kind: str
    folder: str
    checksum: str
    attached_to_type: str | None
    attached_to_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class MediaUsageEntry(BaseModel):
    type: str
    id: str
    title: str
    field: str


class MediaUsageOut(BaseModel):
    count: int
    entries: list[MediaUsageEntry]


class MediaListOut(BaseModel):
    items: list[MediaOut]
    total: int
    folders: list[str] = []


class MediaUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    alt_text: str | None = Field(default=None, min_length=1, max_length=300)
    caption: str | None = Field(default=None, max_length=400)
    folder: str | None = Field(default=None, max_length=40)
    attached_to_type: str | None = Field(default=None, max_length=40)
    attached_to_id: uuid.UUID | None = None
