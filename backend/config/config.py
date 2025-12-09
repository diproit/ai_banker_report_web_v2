import os
from dotenv import load_dotenv
from typing import Optional
from urllib.parse import quote_plus

# Load environment variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "AIB Reports API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration
    DB_HOST: str = os.getenv("DB_HOST")
    DB_USER: str = os.getenv("DB_USER")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD")
    DB_NAME: str = os.getenv("DB_NAME")

    # Security - JWT Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-default-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
    
    # CORS Configuration
    CORS_ORIGINS: list = [
        "http://localhost:5173",  # Vite default
        "http://localhost:3000",  # React default
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    @property
    def database_url(self) -> str:
        # URL encode the password to handle special characters
        encoded_password = quote_plus(self.DB_PASSWORD)
        return f"mysql+aiomysql://{self.DB_USER}:{encoded_password}@{self.DB_HOST}/{self.DB_NAME}"

settings = Settings()