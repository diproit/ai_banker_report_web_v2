from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    user_name: str = Field(..., min_length=2, max_length=50, description="Username for login")
    password: str = Field(..., min_length=1, description="User password")


class UserResponse(BaseModel):
    id: int
    user_name: str
    name: Optional[str] = None
    user_role: str
    active_branch_id: Optional[int] = None
    user_group_id: Optional[int] = None
    status: Optional[int] = None
    
    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None
    access_token: Optional[str] = None
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None


class VerifyTokenResponse(BaseModel):
    valid: bool
    user: Optional[UserResponse] = None
    message: Optional[str] = None
