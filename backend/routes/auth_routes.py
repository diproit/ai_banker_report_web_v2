from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from config.database import get_session
from config.config import settings
from schemas.auth_schemas import LoginRequest, LoginResponse, UserResponse, VerifyTokenResponse
from services.auth_service import authenticate_user, create_access_token
from utils.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """
    Authenticate user and return JWT token.
    
    - **user_name**: Username for login
    - **password**: User password
    """
    try:
        # Authenticate user
        user = await authenticate_user(session, login_data.user_name, login_data.password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": str(user["id"]),
                "user_name": user["user_name"],
                "role": user["user_role"]
            },
            expires_delta=access_token_expires
        )
        
        # Set HTTP-only cookie (optional - for additional security)
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        logger.info(f"User logged in successfully: {user['user_name']}")
        
        return LoginResponse(
            success=True,
            message="Login successful",
            user=UserResponse(**user),
            access_token=access_token,
            token_type="bearer"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )


@router.post("/logout")
async def logout(response: Response):
    """
    Logout user by clearing the authentication cookie.
    """
    response.delete_cookie(key="access_token")
    return {"success": True, "message": "Logout successful"}


@router.get("/verify", response_model=VerifyTokenResponse)
async def verify_token(current_user: UserResponse = Depends(get_current_user)):
    """
    Verify the current JWT token and return user information.
    Requires valid authentication token in Authorization header.
    """
    try:
        return VerifyTokenResponse(
            valid=True,
            user=current_user,
            message="Token is valid"
        )
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """
    Get current authenticated user information.
    """
    return current_user
