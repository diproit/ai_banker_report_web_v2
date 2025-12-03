from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Any, Optional
import logging
import re
import json

logger = logging.getLogger(__name__)


class SqlExecutorService:
    """Service class for executing SQL queries safely"""

    async def execute_query(
        self, session: AsyncSession, query: str, limit: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Execute a SQL query and return results

        Args:
            session: Database session
            query (str): The SQL query to execute
            limit (int, optional): Maximum number of rows to return

        Returns:
            Dict[str, Any]: Dictionary containing query results and metadata
        """
        try:
            # Strip comments from the query
            query = self._strip_sql_comments(query)

            # Add backticks to aliases with spaces
            query = self._add_backticks_to_aliases(query)

            # Validate query (basic security check)
            if not self._is_safe_query(query):
                return {
                    "success": False,
                    "error": "Query contains potentially unsafe operations",
                    "data": [],
                }

            # Apply limit if specified
            if limit and limit > 0:
                query_upper = query.upper().strip()
                if not query_upper.endswith(";"):
                    query = query.rstrip(";")

                if "LIMIT" not in query_upper:
                    query = f"{query} LIMIT {limit}"

            # Execute query
            result = await session.execute(text(query))

            # Fetch results
            rows = result.fetchall()
            columns = list(result.keys()) if rows else []

            # Convert rows to list of dictionaries
            data = []
            for row in rows:
                row_dict = {}
                for i, column in enumerate(columns):
                    value = row[i]
                    # Handle datetime and other special types
                    if hasattr(value, "isoformat"):
                        value = value.isoformat()
                    elif value is None:
                        value = None
                    else:
                        # Convert to string if it's not a basic type
                        try:
                            json.dumps(value)
                        except (TypeError, ValueError):
                            value = str(value)
                    row_dict[column] = value
                data.append(row_dict)

            return {
                "success": True,
                "data": data,
                "rows": data,
                "columns": columns,
                "row_count": len(data),
                "query": query,
            }

        except SQLAlchemyError as e:
            logger.error(f"Database error executing query: {str(e)}")
            error_msg = str(e)

            # Provide more user-friendly error messages
            if "doesn't exist" in error_msg.lower():
                error_msg = "One or more tables in the query don't exist."
            elif "not found" in error_msg.lower():
                error_msg = "One or more columns in the query don't exist."
            elif "syntax" in error_msg.lower():
                error_msg = "SQL syntax error in the query."
            else:
                error_msg = f"Database error: {error_msg}"

            return {"success": False, "error": error_msg, "data": []}
        except Exception as e:
            logger.error(f"Unexpected error executing query: {str(e)}")
            return {"success": False, "error": f"Unexpected error: {str(e)}", "data": []}

    def _strip_sql_comments(self, query: str) -> str:
        """Remove SQL comments from query"""
        # Remove single-line comments (-- comment)
        query = re.sub(r"--[^\n]*", "", query)
        # Remove multi-line comments (/* comment */)
        query = re.sub(r"/\*.*?\*/", "", query, flags=re.DOTALL)
        return query.strip()

    def _add_backticks_to_aliases(self, query: str) -> str:
        """
        Add backticks to AS aliases that contain spaces or are not already quoted

        Args:
            query (str): SQL query to process

        Returns:
            str: Query with backticks added to aliases with spaces
        """

        def replace_alias(match):
            as_keyword = match.group(1)  # 'AS' or 'as' or 'As'
            whitespace = match.group(2)  # Space(s) after AS
            alias = match.group(3).strip()  # The alias itself
            trailing = match.group(4) if match.group(4) else ""  # Trailing comma/whitespace

            # If already quoted with backticks, double quotes, or single quotes, keep as is
            if (
                (alias.startswith("`") and alias.endswith("`"))
                or (alias.startswith('"') and alias.endswith('"'))
                or (alias.startswith("'") and alias.endswith("'"))
            ):
                return f"{as_keyword}{whitespace}{alias}{trailing}"

            # If alias contains spaces or special characters, wrap in backticks
            if " " in alias or any(
                char in alias for char in ["-", ".", "/", "\\", "(", ")", "[", "]"]
            ):
                return f"{as_keyword}{whitespace}`{alias}`{trailing}"

            # Otherwise, keep as is (simple identifier)
            return f"{as_keyword}{whitespace}{alias}{trailing}"

        pattern = r"\b(AS)(\s+)([^,\n]+?)(\s*(?=,|\bFROM\b|\bWHERE\b|\bJOIN\b|\bGROUP\b|\bORDER\b|\bHAVING\b|\bLIMIT\b|;|$))"

        result = re.sub(pattern, replace_alias, query, flags=re.IGNORECASE)
        return result

    def _is_safe_query(self, query: str) -> bool:
        """
        Basic security check for SQL queries

        Args:
            query (str): SQL query to validate

        Returns:
            bool: True if query appears safe, False otherwise
        """

        def _remove_quoted_parts(s: str) -> str:
            return re.sub(r"`[^`]*`|'[^']*'|\"[^\"]*\"|\[[^\]]*\]", " ", s)

        sanitized = _remove_quoted_parts(query)
        query_upper = sanitized.upper().strip()

        # List of dangerous SQL keywords/operations
        dangerous_keywords = [
            "DROP",
            "DELETE",
            "INSERT",
            "UPDATE",
            "ALTER",
            "CREATE",
            "TRUNCATE",
            "REPLACE",
            "MERGE",
            "GRANT",
            "REVOKE",
            "EXEC",
            "EXECUTE",
            "CALL",
            "LOAD",
            "OUTFILE",
            "INFILE",
        ]

        # Check for dangerous keywords at word boundaries
        for keyword in dangerous_keywords:
            pattern = r"\b" + keyword + r"\b"
            if re.search(pattern, query_upper):
                return False

        return True


sql_executor_service = SqlExecutorService()
