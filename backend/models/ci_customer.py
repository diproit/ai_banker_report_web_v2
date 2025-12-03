from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class CiCustomer(SQLModel, table=True):
    """Customer information model"""

    __tablename__ = "ci_customer"

    id: Optional[int] = Field(default=None, primary_key=True)
    customer_number: Optional[str] = Field(default=None, max_length=11, index=True)
    customer_type_id: Optional[int] = Field(default=None, foreign_key="ci_customer_type.id")
    branch_id: Optional[int] = Field(default=None, foreign_key="gl_branch.id")
    title_ln1: Optional[str] = Field(default=None, max_length=10)
    title_ln2: Optional[str] = Field(default=None, max_length=10)
    title_ln3: Optional[str] = Field(default=None, max_length=10)
    full_name_ln1: Optional[str] = Field(default=None, max_length=300)
    full_name_ln2: Optional[str] = Field(default=None, max_length=400)
    full_name_ln3: Optional[str] = Field(default=None, max_length=400)
    ini_name_ln1: Optional[str] = Field(default=None, max_length=400)
    ini_name_ln2: Optional[str] = Field(default=None, max_length=400)
    ini_name_ln3: Optional[str] = Field(default=None, max_length=400)
    address_ln1: Optional[str] = Field(default=None, max_length=400)
    address_ln2: Optional[str] = Field(default=None, max_length=400)
    address_ln3: Optional[str] = Field(default=None, max_length=400)
    postal_code: Optional[str] = Field(default=None, max_length=6)
    ci_city_id: Optional[int] = Field(default=None)
    group_id: Optional[int] = Field(default=None)
    nic: Optional[str] = Field(default=None, max_length=14)
    gender: Optional[str] = Field(default=None, max_length=14)
    date_of_birth: Optional[datetime] = Field(default=None)
    member_date: Optional[datetime] = Field(default=None)
    married_status: Optional[str] = Field(default=None, max_length=14)
    mobile_1: Optional[str] = Field(default=None, max_length=20)
    mobile_2: Optional[str] = Field(default=None, max_length=14)
    home_phone: Optional[str] = Field(default=None, max_length=14)
    e_mail: Optional[str] = Field(default=None, max_length=300)
    credit_limit: Optional[float] = Field(default=None)
    credit_limit_date: Optional[datetime] = Field(default=None)
    status: Optional[int] = Field(default=None)
    inactive_reson: Optional[str] = Field(default=None, max_length=300)
    photo: Optional[bytes] = Field(default=None)
    signature: Optional[bytes] = Field(default=None)
    sms_status: Optional[int] = Field(default=None)
    dp_app_status: Optional[int] = Field(default=None)
    pos_app_status: Optional[int] = Field(default=None)
    c_at: Optional[datetime] = Field(default=None)
    c_by: Optional[int] = Field(default=None, foreign_key="it_user_master.id")
    m_at: Optional[datetime] = Field(default=None)
    m_by: Optional[int] = Field(default=None, foreign_key="it_user_master.id")
    field_officer_id: Optional[int] = Field(default=None)
