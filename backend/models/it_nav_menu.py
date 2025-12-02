from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, Relationship
from models.base_model import BaseModel

if TYPE_CHECKING:
    from models.it_user_nav_rights import ItUserNavRights


class ItNavMenu(BaseModel, table=True):
    __tablename__ = "it_nav_menu"

    title: str = Field(max_length=255, nullable=False)
    title_si: Optional[str] = Field(default=None, max_length=255)
    title_ta: Optional[str] = Field(default=None, max_length=255)
    title_tl: Optional[str] = Field(default=None, max_length=255)
    title_th: Optional[str] = Field(default=None, max_length=255)
    url: str = Field(max_length=255, nullable=False)
    parent_id: Optional[int] = Field(default=None, foreign_key="it_nav_menu.id")
    level: int = Field(default=0, nullable=False)
    path: str = Field(max_length=500, nullable=False)
    group_name: Optional[str] = Field(default=None, max_length=255)
    sort_order: int = Field(default=0, nullable=False)
    it_report_structures_id: Optional[int] = Field(default=None)
    has_children: bool = Field(default=False, nullable=False)
    key_binding: Optional[str] = Field(default=None, max_length=255)

    # Relationships
    user_nav_rights: List["ItUserNavRights"] = Relationship(back_populates="nav_menu")
    
    # Self-referential relationships for parent/children
    parent: Optional["ItNavMenu"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "ItNavMenu.id"}
    )
    children: List["ItNavMenu"] = Relationship(back_populates="parent")
