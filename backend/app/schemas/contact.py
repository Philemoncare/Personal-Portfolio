from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

InquiryType = Literal[
    "project_collaboration",
    "data_analytics",
    "development",
    "technology_community",
    "speaking_workshops",
    "general",
]


class ContactCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=160)
    inquiry_type: InquiryType | None = None
    message: str = Field(min_length=10, max_length=5000)
    # Honeypot: real visitors never fill this hidden field.
    website: str | None = Field(default=None, max_length=200)

    @field_validator("website")
    @classmethod
    def honeypot_must_be_empty(cls, value: str | None) -> str | None:
        if value:
            raise ValueError("We couldn't accept this message. Please try again.")
        return value

    @field_validator("name", "subject", "message")
    @classmethod
    def reject_control_characters(cls, value: str) -> str:
        if any(ord(char) < 32 and char not in "\n\t" for char in value):
            raise ValueError("Please remove any unusual characters and try again.")
        return value


class ContactReceipt(BaseModel):
    status: str
    message: str
    stored: bool = True
    email_delivery: Literal["configured", "not_configured"] = "not_configured"


class ContactMessageAdmin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    subject: str
    inquiry_type: str | None
    message: str
    status: str
    email_status: str
    created_at: datetime
    read_at: datetime | None
    replied_at: datetime | None
