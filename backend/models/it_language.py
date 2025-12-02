from typing import Optional
from sqlmodel import Field
from models.base_model import BaseModel


class ItLanguage(BaseModel, table=True):
    __tablename__ = "it_language"

    language: str = Field(max_length=10, nullable=False, unique=True)
    display_name: str = Field(max_length=50, nullable=False)
