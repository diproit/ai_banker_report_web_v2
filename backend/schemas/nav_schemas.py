from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class NavMenuResponse(BaseModel):
    id: int
    title: str
    title_si: Optional[str] = None
    title_ta: Optional[str] = None
    title_tl: Optional[str] = None
    title_th: Optional[str] = None
    url: str
    parent_id: Optional[int] = None
    level: int
    path: str
    group_name: Optional[str] = None
    sort_order: int
    is_active: bool
    has_children: bool
    key_binding: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserNavRightResponse(BaseModel):
    id: int
    user_id: int
    nav_menu_id: int
    can_view: bool
    quick_access: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    nav_menu: NavMenuResponse

    class Config:
        from_attributes = True


class UserNavRightsListResponse(BaseModel):
    user_id: int
    nav_rights: List[UserNavRightResponse]
    total_count: int


class QuickAccessResponse(BaseModel):
    id: int
    title: str
    url: str
    level: int
    path: str
    group_name: Optional[str] = None
    sort_order: int

    class Config:
        from_attributes = True


class UserQuickAccessResponse(BaseModel):
    user_id: int
    quick_access_items: List[QuickAccessResponse]
    total_count: int


class HierarchicalNavMenuResponse(BaseModel):
    id: int
    title: str
    title_si: Optional[str] = None
    title_ta: Optional[str] = None
    title_tl: Optional[str] = None
    title_th: Optional[str] = None
    url: str
    parent_id: Optional[int] = None
    level: int
    path: str
    group_name: Optional[str] = None
    sort_order: int
    has_children: bool
    can_view: bool
    quick_access: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    children: List["HierarchicalNavMenuResponse"] = []

    class Config:
        from_attributes = True


# Update forward references
HierarchicalNavMenuResponse.model_rebuild()