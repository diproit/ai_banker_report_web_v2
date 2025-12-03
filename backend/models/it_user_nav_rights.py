from typing import Optional, TYPE_CHECKING

from .base_model import BaseModel
from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .it_nav_menu import ItNavMenu
    from .it_user_master import ItUserMaster


class ItUserNavRights(BaseModel, table=True):
	__tablename__ = "it_user_nav_rights"

	user_id: int = Field(nullable=False, foreign_key="it_user_master.id")
	nav_menu_id: int = Field(nullable=False, foreign_key="it_nav_menu.id")
	can_view: bool = Field(default=True, nullable=False)
	quick_access: bool = Field(default=False, nullable=False)

	# Relationships
	user: Optional["ItUserMaster"] = Relationship(back_populates="nav_rights")
	nav_menu: Optional["ItNavMenu"] = Relationship(back_populates="user_nav_rights")

	__table_args__ = (UniqueConstraint("user_id", "nav_menu_id", name="unique_user_nav_right"),)

