from sqlmodel import SQLModel, Field, Relationship, Text
from typing import Optional
from datetime import datetime
from models.it_user_master import ItUserMaster
from models.gl_branch import GlBranch
from models.it_report_structures import ItReportStructure


class ItReportDesign(SQLModel, table=True):
    __tablename__ = "it_report_design"   # match your actual DB table
    id: Optional[int] = Field(default=None, primary_key=True)

    it_user_master_id: Optional[int] = Field(default=None, foreign_key="it_user_master.id")
    branch_id: Optional[int] = Field(default=None, foreign_key="gl_branch.id")
    it_report_structure_id: Optional[int] = Field(default=None, foreign_key="it_report_structures.id")

    report_design_json: str = Field(sa_type=Text)
    report_design_name: str = Field(max_length=255)

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    user_master: Optional["ItUserMaster"] = Relationship(back_populates="report_designs")
    branch: Optional["GlBranch"] = Relationship(back_populates="report_designs")
    report_structure: Optional["ItReportStructure"] = Relationship(back_populates="report_designs")

    def to_dict(self):   # 👈 FIXED INDENT (4 spaces inside class)
        return {
            "id": self.id,
            "it_user_master_id": self.it_user_master_id,
            "it_report_structure_id": self.it_report_structure_id,
            "report_design_json": self.report_design_json,
            "report_design_name": self.report_design_name,
            "branch_id": self.branch_id,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
