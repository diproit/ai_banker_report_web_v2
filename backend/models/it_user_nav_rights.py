from sqlmodel import SQLModel, Field, UniqueConstraint, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from models.base_model import BaseModel

if TYPE_CHECKING:
    from models.it_nav_menu import ItNavMenu

class ItUserNavRights(BaseModel, table=True):
    __tablename__ = 'it_user_nav_rights'
    
    user_id: int = Field(nullable=False, foreign_key="it_user_master.id")
    nav_menu_id: int = Field(nullable=False, foreign_key="it_nav_menu.id")
    can_view: bool = Field(default=True, nullable=False)
    
    # Relationships
    nav_menu: "ItNavMenu" = Relationship(back_populates="user_nav_rights")
    
    __table_args__ = (UniqueConstraint('user_id', 'nav_menu_id', name='unique_user_nav_right'),)

class UserInfo(BaseModel):
    """User information model for frontend"""
    id: int
    username: str
    email: str
    user_role: Optional[str] = None
    created_at: datetime
