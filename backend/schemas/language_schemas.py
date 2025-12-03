from typing import List
from datetime import datetime
from pydantic import BaseModel


class LanguageResponse(BaseModel):
    id: int
    language: str
    display_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LanguageListResponse(BaseModel):
    languages: List[LanguageResponse]
    total_count: int
