from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from config.database import get_session
from services.sql_executor_service import sql_executor_service
from schemas.sql_executor_schemas import QueryExecuteRequest, QueryExecuteResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/runQuery", response_model=QueryExecuteResponse)
async def run_query(
    request: QueryExecuteRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Execute a SQL query

    Args:
        request: Query execution request with query string and optional limit
        session: Database session

    Returns:
        QueryExecuteResponse with query results or error
    """
    try:
        logger.info(f"Executing query with limit: {request.limit}")

        # Execute query
        result = await sql_executor_service.execute_query(
            session=session, query=request.query, limit=request.limit
        )

        # Log the execution
        if result.get("success"):
            logger.info(f"Query executed successfully. Returned {result.get('row_count', 0)} rows")
        else:
            logger.warning(f"Query execution failed: {result.get('error')}")

        return result

    except Exception as e:
        logger.error(f"Unexpected error in run_query endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
