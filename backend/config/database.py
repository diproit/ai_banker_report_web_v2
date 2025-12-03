import os
from typing import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from config.config import settings

# Load environment variables
load_dotenv()

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=True,  # Set to False in production
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)


async def create_db_and_tables():
    """Create database tables based on SQLModel models."""
    async with engine.begin() as conn:
        # Import all models to ensure they're registered
        from models import it_user_master, it_nav_menu, it_user_nav_rights
        
        # Create all tables
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get async database session.
    
    Usage in FastAPI:
        @app.get("/")
        async def read_items(session: AsyncSession = Depends(get_session)):
            # Use session here
    """
    async with AsyncSessionLocal() as session:
        yield session


async def close_db():
    """Close database connections."""
    await engine.dispose()