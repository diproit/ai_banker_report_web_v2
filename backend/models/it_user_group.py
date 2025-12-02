from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class ItUserGroup(SQLModel, table=True):
    __tablename__ = 'it_user_group'
    
    id: Optional[int] = Field(default=None, primary_key=True)
    group_name: Optional[str] = Field(default=None, max_length=100)
    level: Optional[int] = Field(default=None)
    c_at: Optional[datetime] = Field(default=None)
    c_by: Optional[int] = Field(default=None)
    m_at: Optional[datetime] = Field(default=None)
    m_by: Optional[int] = Field(default=None)
    
    users: List["ItUserMaster"] = Relationship(back_populates="user_group")