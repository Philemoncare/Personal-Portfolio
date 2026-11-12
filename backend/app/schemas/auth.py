from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    last_login_at: datetime | None
