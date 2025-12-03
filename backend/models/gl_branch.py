from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class GlBranch(SQLModel, table=True):
    """Branch information model"""

    __tablename__ = "gl_branch"

    id: Optional[int] = Field(default=None, primary_key=True)
    it_institute_id: Optional[int] = Field(default=None)
    ref_number: Optional[str] = Field(default=None, max_length=11)
    name_ln1: Optional[str] = Field(default=None, max_length=300)
    name_ln2: Optional[str] = Field(default=None, max_length=300)
    name_ln3: Optional[str] = Field(default=None, max_length=300)
    address_ln1: Optional[str] = Field(default=None, max_length=400)
    address_ln2: Optional[str] = Field(default=None, max_length=400)
    address_ln3: Optional[str] = Field(default=None, max_length=400)
    e_mail: Optional[str] = Field(default=None, max_length=300)
    telephone: Optional[str] = Field(default=None, max_length=50)
    sms_status: Optional[int] = Field(default=None)
    client_app_status: Optional[int] = Field(default=None)
    status: Optional[int] = Field(default=None)
    c_at: Optional[datetime] = Field(default=None)
    c_by: Optional[int] = Field(default=None)
    m_at: Optional[datetime] = Field(default=None)
    m_by: Optional[int] = Field(default=None)
