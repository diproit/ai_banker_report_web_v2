from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict


class QueryExecuteRequest(BaseModel):
    """Request model for executing SQL queries"""

    query: str = Field(..., description="SQL query to execute")
    limit: Optional[int] = Field(None, description="Maximum number of rows to return", gt=0)


class QueryExecuteResponse(BaseModel):
    """Response model for SQL query execution"""

    success: bool = Field(..., description="Whether the query executed successfully")
    data: List[Dict[str, Any]] = Field(default_factory=list, description="Query result data")
    rows: Optional[List[Dict[str, Any]]] = Field(None, description="Query result rows (alias for data)")
    columns: Optional[List[str]] = Field(None, description="Column names from the query")
    row_count: Optional[int] = Field(None, description="Number of rows returned")
    query: Optional[str] = Field(None, description="The executed query")
    error: Optional[str] = Field(None, description="Error message if query failed")
