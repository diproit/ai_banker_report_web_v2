from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Dict, Any
import json

from models.it_language_nav_items import ItLanguageNavItems


class TranslationService:
    """Service class for handling translation business logic."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_nav_translations(self) -> Dict[str, Dict[str, str]]:
        """
        Get navigation item translations for all languages.
        
        Returns:
            Dictionary with language codes as keys and translation mappings as values
        """
        statement = select(ItLanguageNavItems).limit(1)
        result = await self.session.execute(statement)
        translation_row = result.scalar_one_or_none()
        
        if not translation_row or not translation_row.common_json:
            return {}
        
        try:
            translations = json.loads(translation_row.common_json)
            return translations
        except json.JSONDecodeError:
            return {}
