from datetime import datetime
from sqlmodel import SQLModel, Field
from models.base_model import BaseModel

class User(BaseModel, table=True):
    __tablename__ = 'users'
    username: str = Field(max_length=80)
    email: str = Field(max_length=120)
    password_hash: str = Field(max_length=256)
    user_role: int = Field(default=None, nullable=True)