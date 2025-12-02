import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

load_dotenv()

class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get('JWT_SECRET', 'your_jwt_secret_key')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET', 'your_jwt_secret_key')
    JWT_TOKEN_LOCATION = ['cookies', 'headers']  # Accept JWT from cookies or headers
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_EXP_DELTA_SECONDS', 3600))
    JWT_COOKIE_SECURE = os.environ.get('JWT_COOKIE_SECURE', 'False').lower() in ('true', '1', 'yes')
    JWT_COOKIE_CSRF_PROTECT = os.environ.get('JWT_COOKIE_CSRF_PROTECT', 'False').lower() in ('true', '1', 'yes')
    JWT_COOKIE_SAMESITE = os.environ.get('JWT_COOKIE_SAMESITE', 'Strict')
    
    DB_HOST = os.environ.get('DB_HOST')
    DB_USER = os.environ.get('DB_USER') 
    DB_PASSWORD = os.environ.get('DB_PASSWORD')
    DB_NAME = os.environ.get('DB_NAME')
    
    # AI Backend Selection with validation
    AI_BACKEND = os.environ.get('AI_BACKEND', 'OpenAI')
    
    # Validate AI_BACKEND value
    SUPPORTED_AI_BACKENDS = ['GenAI', 'OpenAI']
    if AI_BACKEND not in SUPPORTED_AI_BACKENDS:
        raise ValueError(f"Invalid AI_BACKEND: {AI_BACKEND}. Supported: {SUPPORTED_AI_BACKENDS}")
    
    # AI Chat backend config (OpenAI-compatible)
    AI_CHAT_URL = os.environ.get('AI_CHAT_URL')
    AI_CHAT_TOKEN = os.environ.get('AI_CHAT_TOKEN', '')
    AI_CHAT_MODEL = os.environ.get('AI_CHAT_MODEL', 'gemma3:latest')
    
    # Gemini API config
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    
    # System prompt
    AI_SYSTEM_PROMPT = os.environ.get('AI_SYSTEM_PROMPT', 'You are a trusted microfinance advisor and professional accountant, specializing in Sri Lankan and Southeast Asian financial matters. Provide clear, practical, and culturally relevant advice on microfinance, banking, and accounting topics. Your responses should reflect the expertise, ethics, and attention to detail of an experienced accounting professional, always considering local regulations and business realities. Always reply in the same language as the user.')
    
    # Configuration validation
    @classmethod
    def validate_ai_config(cls):
        """Validate AI configuration based on selected backend"""
        if cls.AI_BACKEND in ['GenAI', 'gemini']:
            if not cls.GEMINI_API_KEY:
                logger.warning("GEMINI_API_KEY not set. Gemini provider will use mock responses.")
        elif cls.AI_BACKEND in ['OpenAI', 'openai']:
            if not cls.AI_CHAT_URL:
                logger.warning("AI_CHAT_URL not set. OpenAI provider will use mock responses.")
    
    @classmethod
    def validate_db_config(cls):
        """Validate database configuration"""
        required_db_vars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
        missing_vars = [var for var in required_db_vars if not getattr(cls, var)]
        
        if missing_vars:
            raise ValueError(f"Missing required database environment variables: {', '.join(missing_vars)}")
        
        logger.info("Database configuration validated successfully")

