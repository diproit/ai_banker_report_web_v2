from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime


class ItInstitute(SQLModel, table=True):
    __tablename__ = 'it_institute'
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name_ln1: Optional[str] = Field(default=None, max_length=300)
    name_ln2: Optional[str] = Field(default=None, max_length=300)
    name_ln3: Optional[str] = Field(default=None, max_length=300)
    address_ln1: Optional[str] = Field(default=None, max_length=300)
    address_ln2: Optional[str] = Field(default=None, max_length=300)
    address_ln3: Optional[str] = Field(default=None, max_length=300)
    email: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    reg_num: Optional[str] = Field(default=None, max_length=12)
    reg_date: Optional[datetime] = Field(default=None)
    sms_mask: Optional[str] = Field(default=None, max_length=12)
    sms_mask_id: Optional[str] = Field(default=None, max_length=12)
    swift_code: Optional[str] = Field(default=None, max_length=11)
    coop_fund: Optional[float] = Field(default=None)
    statu_reserves: Optional[float] = Field(default=None)
    profit: Optional[float] = Field(default=None)
    status: Optional[int] = Field(default=None)
    c_at: Optional[datetime] = Field(default=None)
    c_by: Optional[int] = Field(default=None)
    m_at: Optional[datetime] = Field(default=None)
    m_by: Optional[int] = Field(default=None)
    age_min: Optional[int] = Field(default=None)
    age_max: Optional[int] = Field(default=None)

    branches: List["GlBranch"] = Relationship(back_populates="institute")