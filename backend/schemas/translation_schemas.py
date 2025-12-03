from typing import Dict, Any
from pydantic import BaseModel


class TranslationResponse(BaseModel):
    translations: Dict[str, Dict[str, str]]
    
    class Config:
        from_attributes = True
