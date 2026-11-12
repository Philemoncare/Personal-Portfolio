from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ContactCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=10, max_length=5000)
    # Honeypot: real visitors never fill this hidden field.
    website: str | None = Field(default=None, max_length=200)

    @field_validator("website")
    @classmethod
    def honeypot_must_be_empty(cls, value: str | None) -> str | None:
        if value:
            raise ValueError("Invalid submission")
        return value


class ContactReceipt(BaseModel):
    status: str
    message: str


class ContactMessageAdmin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    subject: str
    message: str
    status: str
    created_at: datetime
    read_at: datetime | None
