from sqlmodel import SQLModel, Field, Text, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from models.base_model import BaseModel

if TYPE_CHECKING:
    from models.it_nav_menu import ItNavMenu
    from models.it_report_design import ItReportDesign
    from models.it_report_config import ItReportConfig

class ItReportStructure(BaseModel, table=True):
    __tablename__ = "it_report_structures"
    
    description: Optional[str] = Field(default=None, max_length=500)
    base_query: Optional[str] = Field(default=None, sa_type=Text, nullable=True)
    json_form: Optional[str] = Field(default=None, sa_type=Text, nullable=True)
    json_schema: Optional[str] = Field(default=None, sa_type=Text, nullable=True)
    placeholder_data: Optional[str] = Field(default=None, sa_type=Text, nullable=True)
    jrxml_json: Optional[str] = Field(default=None, sa_type=Text, nullable=True)

    # Relationships
    report_designs: list["ItReportDesign"] = Relationship(back_populates="report_structure")
    report_configs: list["ItReportConfig"] = Relationship(back_populates="report_structure")
    nav_menus: List["ItNavMenu"] = Relationship(back_populates="report_structure")
