from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class CiCustomerType(SQLModel, table=True):
    """Customer type information model"""

    __tablename__ = "ci_customer_type"

    id: Optional[int] = Field(default=None, primary_key=True)
    prefix: Optional[str] = Field(default=None, max_length=11)
    last_number: Optional[int] = Field(default=None)
    type_ln1: Optional[str] = Field(default=None, max_length=150)
    type_ln2: Optional[str] = Field(default=None, max_length=150)
    type_ln3: Optional[str] = Field(default=None, max_length=150)
    type: Optional[int] = Field(default=None)
    no_of_sms: Optional[int] = Field(default=None)
    nic_status: Optional[int] = Field(default=None)
    status: Optional[int] = Field(default=None)
    nic_mand: Optional[int] = Field(default=0)
    phone_mand: Optional[int] = Field(default=0)
    c_at: Optional[datetime] = Field(default=None)
    c_by: Optional[int] = Field(default=None)
    m_at: Optional[datetime] = Field(default=None)
    m_by: Optional[int] = Field(default=None)
