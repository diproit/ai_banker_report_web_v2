from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_session
from services.translation_service import TranslationService
from schemas.translation_schemas import TranslationResponse

router = APIRouter()


@router.get("/translations/nav-items", response_model=TranslationResponse)
async def get_nav_translations(
    session: AsyncSession = Depends(get_session)
):
    """
    Retrieve navigation item translations for all languages.
    """
    translation_service = TranslationService(session)
    translations = await translation_service.get_nav_translations()
    
    return TranslationResponse(translations=translations)
