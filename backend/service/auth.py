from datetime import datetime
import bcrypt
import logging
from sqlmodel import select
from models.it_user_master import ItUserMaster, UserRole
from config.database import get_session
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def authenticate_user(user_name: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user with user_name and password"""
    try:
        with get_session() as session:
            user_obj = session.exec(
                select(ItUserMaster).where(ItUserMaster.user_name == user_name)
            ).first()
            
            if user_obj and bcrypt.checkpw(password.encode('utf-8'), user_obj.password.encode('utf-8')):
                user_dict = user_obj.dict()
                user_dict.pop('password', None)  # Remove password from response
                user_dict.pop('password_old1', None)  # Remove old passwords too
                user_dict.pop('password_od2', None)
                
                # Convert user_role enum to string for JSON response
                if user_dict.get('user_role'):
                    user_dict['user_role'] = user_dict['user_role'].value
                else:
                    user_dict['user_role'] = 'CLERK'  # Default role
                
                logger.info(f"User authenticated successfully: {user_name}")
                return user_dict
            
            logger.warning(f"Authentication failed for user_name: {user_name}")
            return None
            
    except Exception as e:
        logger.error(f"Authentication error for user_name {user_name}: {e}")
        return None


def register_user(user_name: str, name: str, password: str, user_role: str = 'CLERK') -> Dict[str, Any]:
    """Register a new user with proper validation and error handling"""
    try:
        with get_session() as session:
            # Check for existing username
            existing_username = session.exec(
                select(ItUserMaster).where(ItUserMaster.user_name == user_name)
            ).first()
            if existing_username:
                logger.warning(f"Registration failed - username already exists: {user_name}")
                return {'success': False, 'message': 'Username already exists'}
            
            # Hash password and create user
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Convert string role to enum
            try:
                role_enum = UserRole(user_role.upper())
            except ValueError:
                role_enum = UserRole.CLERK  # Default to clerk if invalid role
            
            new_user = ItUserMaster(
                user_name=user_name,
                name=name,
                password=password_hash,
                user_role=role_enum,
                status=1,  # Active status
                c_at=datetime.utcnow(),
                c_by=1  # System user ID, you might want to make this configurable
            )
            
            session.add(new_user)
            
            logger.info(f"User registered successfully: {user_name} ({name})")
            return {'success': True, 'message': 'User registered successfully'}
            
    except Exception as e:
        logger.error(f"Registration error for user {user_name}: {e}")
        return {'success': False, 'message': 'Registration failed due to server error'}