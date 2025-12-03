from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Enum

if TYPE_CHECKING:
    from .it_user_nav_rights import ItUserNavRights


class ItUserMaster(SQLModel, table=True):
    __tablename__ = "it_user_master"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_group_id: Optional[int] = Field(default=None, foreign_key="it_user_group.id")
    customer_id: Optional[int] = Field(default=None)
    active_branch_id: Optional[int] = Field(default=None, foreign_key="gl_branch.id")
    name: Optional[str] = Field(default=None, max_length=300)
    user_name: Optional[str] = Field(default=None, max_length=50)
    user_role: Optional[str] = Field(
        default="CLERK",
        sa_column=Enum(
            'ADMIN',
            'FIELD_OFFICER', 
            'CLERK',
            'BRANCH_MANAGER',
            'CASHIER',
            name='user_role_enum'
        )
    )
    password: Optional[str] = Field(default=None, max_length=500)
    password_old1: Optional[str] = Field(default=None, max_length=500)
    password_od2: Optional[str] = Field(default=None, max_length=500)
    ref_number: Optional[str] = Field(default=None, max_length=11)
    password_status: Optional[int] = Field(default=None)
    report_status: Optional[int] = Field(default=None)
    status: Optional[int] = Field(default=None)
    c_at: Optional[datetime] = Field(default=None)
    c_by: Optional[int] = Field(default=None)
    m_at: Optional[datetime] = Field(default=None)
    m_by: Optional[int] = Field(default=None)

    # Relationships
    nav_rights: List["ItUserNavRights"] = Relationship(back_populates="user")