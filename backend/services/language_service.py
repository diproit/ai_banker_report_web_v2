from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List

from models.it_language import ItLanguage
from schemas.language_schemas import LanguageResponse


class LanguageService:
    """Service class for handling language business logic."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_active_languages(self) -> List[ItLanguage]:
        """
        Get all active languages.
        
        Returns:
            List of active languages ordered by display_name
        """
        statement = (
            select(ItLanguage)
            .where(ItLanguage.is_active == True)
            .order_by(ItLanguage.display_name)
        )
        
        result = await self.session.execute(statement)
        return result.scalars().all()
    
    async def get_languages_response(self) -> tuple[List[LanguageResponse], int]:
        """
        Get formatted language list.
        
        Returns:
            Tuple of (formatted_languages, total_count)
        """
        languages = await self.get_active_languages()
        
        languages_list = [
            LanguageResponse.model_validate(lang) for lang in languages
        ]
        
        return languages_list, len(languages_list)
