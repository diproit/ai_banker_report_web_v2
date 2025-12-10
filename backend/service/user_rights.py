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
        Optimized to use batch queries instead of individual queries per item
        """
        try:
            with get_session() as session:
                # Convert string keys to integers
                menu_ids = [int(menu_id_str) for menu_id_str in changes.keys()]
                
                # Batch query: Validate all menu items exist and are active in one query
                valid_menu_statement = select(ItNavMenu.id).where(
                    ItNavMenu.id.in_(menu_ids),
                    ItNavMenu.is_active == True
                )
                valid_menu_ids = set(session.exec(valid_menu_statement).all())
                
                # Batch query: Get all existing rights for this user and these menu items
                existing_rights_statement = select(ItUserNavRights).where(
                    ItUserNavRights.user_id == user_id,
                    ItUserNavRights.nav_menu_id.in_(menu_ids)
                )
                existing_rights = session.exec(existing_rights_statement).all()
                existing_rights_map = {right.nav_menu_id: right for right in existing_rights}
                
                # Process changes in memory
                to_add = []
                to_delete = []
                
                for menu_item_id_str, has_access in changes.items():
                    nav_menu_id = int(menu_item_id_str)
                    
                    # Skip invalid menu IDs
                    if nav_menu_id not in valid_menu_ids:
                        logger.warning(f"Invalid or inactive menu ID: {nav_menu_id}")
                        continue
                    
                    if has_access:
                        existing_right = existing_rights_map.get(nav_menu_id)
                        if existing_right:
                            # Update existing right
                            existing_right.can_view = True
                            existing_right.updated_at = datetime.now()
                        else:
                            # Mark for creation
                            to_add.append(ItUserNavRights(
                                user_id=user_id,
                                nav_menu_id=nav_menu_id,
                                can_view=True
                            ))
                    else:
                        # Mark for deletion
                        if nav_menu_id in existing_rights_map:
                            to_delete.append(nav_menu_id)
                
                # Batch operations
                if to_add:
                    session.add_all(to_add)
                
                if to_delete:
                    delete_statement = delete(ItUserNavRights).where(
                        ItUserNavRights.user_id == user_id,
                        ItUserNavRights.nav_menu_id.in_(to_delete)
                    )
                    session.exec(delete_statement)
                
                # Session will be committed automatically by the context manager
                logger.info(f"Successfully updated {len(changes)} rights for user {user_id} (added: {len(to_add)}, deleted: {len(to_delete)})")
                return True
        except Exception as e:
            logger.error(f"Error updating bulk user rights for user {user_id}: {e}")
            return False