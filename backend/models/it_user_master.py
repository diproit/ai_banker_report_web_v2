from sqlmodel import SQLModel, Field, Relationship, Column, Enum
from typing import Optional, List
from datetime import datetime
from enum import Enum as PyEnum
from models.it_user_group import ItUserGroup
from models.gl_branch import GlBranch

class UserRole(str, PyEnum):
    ADMIN = 'ADMIN'
    FIELD_OFFICER = 'FIELD_OFFICER'
    CLERK = 'CLERK'
    BRANCH_MANAGER = 'BRANCH_MANAGER'
    CASHIER = 'CASHIER'

class ItUserMaster(SQLModel, table=True):
    __tablename__ = 'it_user_master'
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_group_id: Optional[int] = Field(default=None, foreign_key="it_user_group.id")
    customer_id: Optional[int] = Field(default=None)
    active_branch_id: Optional[int] = Field(default=None, foreign_key="gl_branch.id")
    name: Optional[str] = Field(default=None, max_length=300)
    user_name: Optional[str] = Field(default=None, max_length=50)
    password: Optional[str] = Field(default=None, max_length=500)
    password_old1: Optional[str] = Field(default=None, max_length=500)
    password_od2: Optional[str] = Field(default=None, max_length=500)
    ref_number: Optional[str] = Field(default=None, max_length=11)
    password_status: Optional[int] = Field(default=None)
    report_status: Optional[int] = Field(default=None)
    status: Optional[int] = Field(default=None)
    
    # New user_role column, defined with the Python Enum
    user_role: Optional[UserRole] = Field(
        sa_column=Column(Enum(UserRole)),
        default=UserRole.CLERK
    )
    c_at: Optional[datetime] = Field(default=None)
    c_by: Optional[int] = Field(default=None)
    m_at: Optional[datetime] = Field(default=None)
    m_by: Optional[int] = Field(default=None)

    # Relationships
    user_group: Optional[ItUserGroup] = Relationship(back_populates="users")
    active_branch: Optional[GlBranch] = Relationship(back_populates="users")
    report_designs: List["ItReportDesign"] = Relationship(back_populates="user_master")
    report_configs: List["ItReportConfig"] = Relationship(back_populates="user_master")