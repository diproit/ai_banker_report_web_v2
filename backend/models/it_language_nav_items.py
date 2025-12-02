from sqlmodel import Field, SQLModel


class ItLanguageNavItems(SQLModel, table=True):
    __tablename__ = "it_language_nav_items"

    id: int = Field(default=None, primary_key=True)
    common_json: str = Field(nullable=False)
