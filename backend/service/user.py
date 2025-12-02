from config.database import get_session
from models.it_user_nav_rights import UserInfo
from sqlmodel import select
import logging
from models.it_user_master import ItUserMaster
from typing import List
from datetime import datetime

logger = logging.getLogger(__name__)

def get_all_users() -> List[UserInfo]:
    """Get all users with basic information (excluding password)"""
    try:
        with get_session() as session:
            users = session.exec(
                select(ItUserMaster.id, ItUserMaster.user_name, ItUserMaster.name, ItUserMaster.user_role, ItUserMaster.c_at, ItUserMaster.status)
                .where(ItUserMaster.status == 1)  # Only active users
                .order_by(ItUserMaster.user_name)
            ).all()
            
            # Convert to UserInfo objects - adapting to existing UserInfo structure
            user_list = [
                UserInfo(
                    id=user.id,
                    username=user.user_name,
                    email=user.name or "",  # Use name field as email placeholder since email doesn't exist in it_user_master
                    user_role=user.user_role.value if user.user_role else "CLERK",
                    created_at=user.c_at or datetime.utcnow()
                )
                for user in users
            ]
            
            logger.info(f"Retrieved {len(user_list)} users")
            return user_list
            
    except Exception as e:
        logger.error(f"Error fetching all users: {e}")
        return []
