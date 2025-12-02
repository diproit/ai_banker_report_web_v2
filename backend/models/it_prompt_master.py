from sqlmodel import Field, Relationship
from typing import Optional, TYPE_CHECKING
from enum import Enum
from models.base_model import BaseModel

if TYPE_CHECKING:
    from models.it_language import ItLanguage

class PromptType(str, Enum):
    system = "system"
    user = "user"

class ItPromptMaster(BaseModel, table=True):
    __tablename__ = 'it_prompt_master'
    
    prompt_text: Optional[str] = Field(default=None, nullable=True, max_length=1000)  # Language-based prompt text for display
    prompt: str = Field(nullable=False, max_length=1000)
    prompt_type: PromptType = Field(nullable=False)
    prompt_query: Optional[str] = Field(default=None, nullable=True, max_length=500)
    note: Optional[str] = Field(default=None, nullable=True, max_length=500)
    language_code: str = Field(foreign_key="it_language.language", nullable=False, default="english")
    sort_order: Optional[int] = Field(default=0, nullable=True)
    has_placeholders: bool = Field(default=False, nullable=False)
    
    # Relationship with ItLanguage
    language_ref: Optional["ItLanguage"] = Relationship(back_populates="prompts")
