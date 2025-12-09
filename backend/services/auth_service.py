from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.it_user_master import ItUserMaster
from schemas.auth_schemas import TokenData, UserResponse
from config.config import settings
import logging

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("sub")
        user_name: str = payload.get("user_name")
        user_role: str = payload.get("role")
        
        if user_id is None:
            return None
            
        return TokenData(user_id=int(user_id), user_name=user_name, user_role=user_role)
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        return None


async def authenticate_user(session: AsyncSession, user_name: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user with username and password"""
    try:
        # Fetch user from database
        result = await session.execute(
            select(ItUserMaster).where(ItUserMaster.user_name == user_name)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.warning(f"Authentication failed - user not found: {user_name}")
            return None
        
        # Check if user is active
        if user.status != 1:
            logger.warning(f"Authentication failed - user inactive: {user_name}")
            return None
        
        # Verify password
        if not verify_password(password, user.password):
            logger.warning(f"Authentication failed - invalid password: {user_name}")
            return None
        
        # Convert to dict and remove sensitive fields
        user_dict = {
            "id": user.id,
            "user_name": user.user_name,
            "name": user.name,
            "user_role": user.user_role if user.user_role else "CLERK",
            "active_branch_id": user.active_branch_id,
            "user_group_id": user.user_group_id,
            "status": user.status,
        }
        
        logger.info(f"User authenticated successfully: {user_name}")
        return user_dict
        
    except Exception as e:
        logger.error(f"Authentication error for user {user_name}: {e}")
        return None


async def get_user_by_id(session: AsyncSession, user_id: int) -> Optional[UserResponse]:
    """Get user by ID"""
    try:
        result = await session.execute(
            select(ItUserMaster).where(ItUserMaster.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        return UserResponse(
            id=user.id,
            user_name=user.user_name,
            name=user.name,
            user_role=user.user_role if user.user_role else "CLERK",
            active_branch_id=user.active_branch_id,
            user_group_id=user.user_group_id,
            status=user.status,
        )
    except Exception as e:
        logger.error(f"Error fetching user by ID {user_id}: {e}")
        return None
