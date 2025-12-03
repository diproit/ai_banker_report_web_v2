from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_session
from services.language_service import LanguageService
from schemas.language_schemas import LanguageListResponse

router = APIRouter()


@router.get("/languages", response_model=LanguageListResponse)
async def get_languages(
    session: AsyncSession = Depends(get_session)
):
    """
    Retrieve all active languages.
    """
    language_service = LanguageService(session)
    languages, total_count = await language_service.get_languages_response()
    
    return LanguageListResponse(
        languages=languages,
        total_count=total_count
    )
