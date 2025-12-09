from typing import List, Dict, Any
from sqlmodel import select, delete
from models.it_user_nav_rights import ItUserNavRights
from models.it_nav_menu import ItNavMenu
from config.database import get_session
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class UserRightsService:
    def get_user_nav_rights(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get user rights in the format expected by frontend            
        """
        try:
            with get_session() as session:
                statement = select(ItUserNavRights.nav_menu_id).where(
                    ItUserNavRights.user_id == user_id,
                    ItUserNavRights.can_view == True
                )
                results = session.exec(statement).all()
                
                # Convert to the format expected by frontend
                rights = [{"menu_item_id": nav_menu_id} for nav_menu_id in results]
                return rights
        except Exception as e:
            logger.error(f"Error fetching user rights for user {user_id}: {e}")
            return []
    
    def update_user_rights_bulk(self, user_id: int, changes: Dict[str, bool]) -> bool:
        """
        Update multiple user rights based on pending changes from frontend
        """
        try:
            with get_session() as session:
                for menu_item_id_str, has_access in changes.items():
                    nav_menu_id = int(menu_item_id_str)  # Convert string key to int
                    
                    # Validate that the nav_menu_id exists and is active
                    nav_menu_statement = select(ItNavMenu).where(
                        ItNavMenu.id == nav_menu_id,
                        ItNavMenu.is_active == True
                    )
                    nav_menu = session.exec(nav_menu_statement).first()
                    
                    if not nav_menu:
                        logger.warning(f"Invalid or inactive menu ID: {nav_menu_id}")
                        continue
                    
                    if has_access:
                        # Check if the right already exists
                        existing_right_statement = select(ItUserNavRights).where(
                            ItUserNavRights.user_id == user_id,
                            ItUserNavRights.nav_menu_id == nav_menu_id
                        )
                        existing_right = session.exec(existing_right_statement).first()
                        
                        if existing_right:
                            # Update existing right
                            existing_right.can_view = True
                            existing_right.updated_at = datetime.now()
                        else:
                            # Create new right
                            new_right = ItUserNavRights(
                                user_id=user_id,
                                nav_menu_id=nav_menu_id,
                                can_view=True
                            )
                            session.add(new_right)
                    else:
                        # Remove the right
                        delete_statement = delete(ItUserNavRights).where(
                            ItUserNavRights.user_id == user_id,
                            ItUserNavRights.nav_menu_id == nav_menu_id
                        )
                        session.exec(delete_statement)
                
                # Session will be committed automatically by the context manager
                logger.info(f"Successfully updated {len(changes)} rights for user {user_id}")
                return True
        except Exception as e:
            logger.error(f"Error updating bulk user rights for user {user_id}: {e}")
            return False