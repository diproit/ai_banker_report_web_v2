from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select
from typing import List, Optional

from models.it_user_nav_rights import ItUserNavRights
from models.it_nav_menu import ItNavMenu
from models.it_user_master import ItUserMaster
from schemas.nav_schemas import UserNavRightResponse


class UserNavService:
    """Service class for handling user navigation business logic."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_by_id(self, user_id: int) -> Optional[ItUserMaster]:
        """Get user by ID."""
        statement = select(ItUserMaster).where(ItUserMaster.id == user_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()
    
    async def get_user_nav_rights(self, user_id: int) -> List[ItUserNavRights]:
        """
        Get active navigation rights for a user where can_view is True.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            List of user navigation rights with loaded nav_menu relationships
        """
        statement = (
            select(ItUserNavRights)
            .options(selectinload(ItUserNavRights.nav_menu))
            .where(ItUserNavRights.user_id == user_id)
            .where(ItUserNavRights.can_view == True)
            .where(ItUserNavRights.is_active == True)
            .join(ItNavMenu)
            .where(ItNavMenu.is_active == True)
        )
        
        result = await self.session.execute(statement)
        return result.scalars().all()
    
    async def format_nav_rights_response(self, nav_rights: List[ItUserNavRights]) -> List[UserNavRightResponse]:
        """
        Convert navigation rights to response format.
        
        Args:
            nav_rights: List of navigation rights from database
            
        Returns:
            List of formatted navigation right responses
        """
        nav_rights_list = []
        for nav_right in nav_rights:
            if hasattr(nav_right, 'nav_menu') and nav_right.nav_menu:
                nav_rights_list.append(UserNavRightResponse.model_validate(nav_right))
        
        return nav_rights_list
    
    async def get_user_navigation_menu(self, user_id: int) -> tuple[List[UserNavRightResponse], int]:
        """
        Get formatted navigation menu for a user.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            Tuple of (formatted_nav_rights, total_count)
            
        Raises:
            ValueError: If user not found
        """
        # Check if user exists
        user = await self.get_user_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Get navigation rights
        nav_rights = await self.get_user_nav_rights(user_id)
        
        # Format response
        formatted_nav_rights = await self.format_nav_rights_response(nav_rights)
        
        return formatted_nav_rights, len(formatted_nav_rights)