from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from models.base_model import BaseModel

if TYPE_CHECKING:
    from models.it_report_structures import ItReportStructure
    from models.it_user_nav_rights import ItUserNavRights

class ItNavMenu(BaseModel, table=True):
    __tablename__ = 'it_nav_menu'
    
    title: str = Field(nullable=False)  # English title (default)
    title_si: Optional[str] = Field(default=None, nullable=True)  # Sinhala title
    title_ta: Optional[str] = Field(default=None, nullable=True)  # Tamil title
    title_tl: Optional[str] = Field(default=None, nullable=True)  # Tagalog title
    title_th: Optional[str] = Field(default=None, nullable=True)  # Thai title
    url: str = Field(nullable=False)
    parent_id: Optional[int] = Field(default=None, nullable=True)
    level: int = Field(default=0, nullable=False)
    path: str = Field(nullable=False, description="Materialized path like '/1/3/15/'")
    group_name: Optional[str] = Field(default=None, nullable=True)
    sort_order: int = Field(default=0, nullable=False)
    it_report_structures_id: Optional[int] = Field(default=None, foreign_key="it_report_structures.id")
    has_children: bool = Field(default=False, nullable=False)

    # Relationships
    report_structure: Optional["ItReportStructure"] = Relationship(back_populates="nav_menus")
    user_nav_rights: List["ItUserNavRights"] = Relationship(back_populates="nav_menu")

# Helper functions for path management
class NavPathHelper:
    @staticmethod
    def generate_path(parent_path: str, item_id: int) -> str:
        """Generate materialized path"""
        if not parent_path or parent_path == '/':
            return f'/{item_id}/'
        return f'{parent_path}{item_id}/'
    
    @staticmethod
    def calculate_level(path: str) -> int:
        """Calculate level from path"""
        return len([p for p in path.split('/') if p]) - 1