from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_session
from services.user_nav_service import UserNavService
from schemas.nav_schemas import UserNavRightsListResponse

router = APIRouter()


@router.get("/users/{user_id}/nav-menu", response_model=UserNavRightsListResponse)
async def get_user_nav_menu(
    user_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Retrieve navigation menu items for a given user_id.
    
    Returns only navigation menu items where can_view = True.
    """
    try:
        # Create service instance
        user_nav_service = UserNavService(session)
        
        # Get navigation menu through service
        nav_rights, total_count = await user_nav_service.get_user_navigation_menu(user_id)
        
        return UserNavRightsListResponse(
            user_id=user_id,
            nav_rights=nav_rights,
            total_count=total_count
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))