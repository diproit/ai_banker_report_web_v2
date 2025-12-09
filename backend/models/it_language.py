from sqlmodel import Field, Relationship
from models.base_model import BaseModel
from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from models.it_prompt_master import ItPromptMaster

class ItLanguage(BaseModel, table=True):
    __tablename__ = "it_language"
    
    language: str = Field(nullable=False, max_length=10, unique=True)  # Language code (e.g., 'english', 'sinhala')
    display_name: str = Field(nullable=False, max_length=50)  # Display name (e.g., 'English', 'සිංහල')
    
    # Relationship with ItPromptMaster
    prompts: List["ItPromptMaster"] = Relationship(back_populates="language_ref")
