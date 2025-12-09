import os
from typing import Optional
from dotenv import load_dotenv
from sqlmodel import create_engine, Session, SQLModel
from urllib.parse import quote_plus
import logging
from contextlib import contextmanager
from flask import Flask

logger = logging.getLogger(__name__)
load_dotenv()

# Global engine instance
_engine: Optional[object] = None

def create_db_engine():
    """Create and configure the database engine with optimized settings"""
    password = quote_plus(os.environ.get('DB_PASSWORD', ''))
    user = os.environ.get('DB_USER', '')
    host = os.environ.get('DB_HOST', '')
    database = os.environ.get('DB_NAME', '')
    
    if not all([user, password, host, database]):
        raise ValueError("Database configuration incomplete. Check environment variables.")
    
    db_url = f"mysql+pymysql://{user}:{password}@{host}/{database}"
    
    return create_engine(
        db_url,
        echo=False,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_timeout=30,
        connect_args={
            'connect_timeout': 10,
            'read_timeout': 30,
            'write_timeout': 30,
            'charset': 'utf8mb4'
        }
    )

def get_engine():
    """Get the database engine (singleton pattern)"""
    global _engine
    if _engine is None:
        _engine = create_db_engine()
    return _engine

def init_db(app: Flask):
    """Initialize database with Flask app"""
    try:
        engine = get_engine()
        # Create all tables
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created successfully!")
        return True
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        return False

@contextmanager
def get_session():
    """
    Context manager for database sessions
    Standard pattern for service layer operations
    """
    session = Session(get_engine())
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        session.close()