from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from config.database import get_engine
from utils.sql_parser import strip_sql_comments
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class SqlExecutorService:
    """Service class for executing SQL queries safely"""
    
    def __init__(self):
        # Don't hold persistent connection - get fresh connection for each query
        pass
    
    def execute_query(self, query: str, limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute a SQL query and return results
        
        Args:
            query (str): The SQL query to execute
            limit (int, optional): Maximum number of rows to return
            
        Returns:
            Dict[str, Any]: Dictionary containing query results and metadata
        """
        try:
            # Strip comments from the query using centralized utility
            query = strip_sql_comments(query)
            
            # Add backticks to aliases with spaces
            query = self._add_backticks_to_aliases(query)
            
            # Validate query (basic security check)
            if not self._is_safe_query(query):
                return {
                    "success": False,
                    "error": "Query contains potentially unsafe operations",
                    "data": []
                }
            
            # Apply limit if specified
            if limit and limit > 0:
                # Check if query already has a LIMIT clause
                query_upper = query.upper().strip()
                if not query_upper.endswith(';'):
                    query = query.rstrip(';')
                
                if 'LIMIT' not in query_upper:
                    query = f"{query} LIMIT {limit}"
            
            # Execute query with retry logic for connection issues
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # Get a fresh engine connection for each attempt
                    engine = get_engine()
                    
                    with engine.connect() as connection:
                        # Set connection timeout for long queries
                        connection.execute(text("SET SESSION wait_timeout = 300"))
                        connection.execute(text("SET SESSION interactive_timeout = 300"))
                        
                        result = connection.execute(text(query))
                        
                        # Fetch results
                        rows = result.fetchall()
                        columns = list(result.keys())
                        
                        # Convert rows to list of dictionaries
                        data = []
                        for row in rows:
                            row_dict = {}
                            for i, column in enumerate(columns):
                                value = row[i]
                                # Handle datetime and other special types
                                if hasattr(value, 'isoformat'):
                                    value = value.isoformat()
                                elif value is None:
                                    value = None
                                else:
                                    # Convert to string if it's not a basic type
                                    try:
                                        # Check if it's a basic JSON serializable type
                                        import json
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
                            "query": query
                        }
                        
                except SQLAlchemyError as e:
                    error_str = str(e)
                    # Check if it's a connection-related error
                    if "MySQL server has gone away" in error_str or "Lost connection" in error_str or "ConnectionResetError" in error_str:
                        logger.warning(f"Database connection lost on attempt {attempt + 1}/{max_retries}: {error_str}")
                        if attempt < max_retries - 1:
                            import time
                            time.sleep(1)  # Wait 1 second before retry
                            continue
                    # Re-raise the exception if it's not a connection issue or we've exhausted retries
                    raise
                
        except SQLAlchemyError as e:
            logger.error(f"Database error executing query: {str(e)}")
            error_msg = str(e)
            
            # Provide more user-friendly error messages
            if "MySQL server has gone away" in error_msg:
                error_msg = "Database connection lost. Please try again."
            elif "Table" in error_msg and "doesn't exist" in error_msg:
                error_msg = "One or more tables in the query don't exist."
            elif "Column" in error_msg and "not found" in error_msg:
                error_msg = "One or more columns in the query don't exist."
            elif "Syntax error" in error_msg or "syntax" in error_msg.lower():
                error_msg = "SQL syntax error in the query."
            else:
                error_msg = f"Database error: {error_msg}"
                
            return {
                "success": False,
                "error": error_msg,
                "data": []
            }
        except Exception as e:
            logger.error(f"Unexpected error executing query: {str(e)}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "data": []
            }
    
    def _add_backticks_to_aliases(self, query: str) -> str:
        """
        Add backticks to AS aliases that contain spaces or are not already quoted
        
        Args:
            query (str): SQL query to process
            
        Returns:
            str: Query with backticks added to aliases with spaces
        """
        import re
        
        # Pattern to match AS aliases:
        # AS followed by either:
        # 1. Already quoted with backticks: `alias name`
        # 2. Already quoted with double quotes: "alias name"
        # 3. Already quoted with single quotes: 'alias name'
        # 4. Unquoted alias (may have spaces)
        # Capture until comma, FROM, WHERE, JOIN, GROUP, ORDER, HAVING, LIMIT, or end of string
        
        def replace_alias(match):
            as_keyword = match.group(1)  # 'AS' or 'as' or 'As'
            whitespace = match.group(2)  # Space(s) after AS
            alias = match.group(3).strip()  # The alias itself
            trailing = match.group(4) if match.group(4) else ''  # Trailing comma/whitespace
            
            # If already quoted with backticks, double quotes, or single quotes, keep as is
            if (alias.startswith('`') and alias.endswith('`')) or \
               (alias.startswith('"') and alias.endswith('"')) or \
               (alias.startswith("'") and alias.endswith("'")):
                return f"{as_keyword}{whitespace}{alias}{trailing}"
            
            # If alias contains spaces or special characters, wrap in backticks
            if ' ' in alias or any(char in alias for char in ['-', '.', '/', '\\', '(', ')', '[', ']']):
                return f"{as_keyword}{whitespace}`{alias}`{trailing}"
            
            # Otherwise, keep as is (simple identifier)
            return f"{as_keyword}{whitespace}{alias}{trailing}"
        
        # Pattern explanation:
        # \bAS\b - match AS keyword (case insensitive with re.IGNORECASE)
        # (\s+) - capture whitespace after AS
        # ([^,\n]+?) - capture alias (non-greedy, up to comma or newline)
        # (?=\s*(?:,|\bFROM\b|\bWHERE\b|\bJOIN\b|\bGROUP\b|\bORDER\b|\bHAVING\b|\bLIMIT\b|;|$)) - lookahead for what comes after
        pattern = r'\b(AS)(\s+)([^,\n]+?)(\s*(?=,|\bFROM\b|\bWHERE\b|\bJOIN\b|\bGROUP\b|\bORDER\b|\bHAVING\b|\bLIMIT\b|;|$))'
        
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
        # Sanitize the query by removing quoted/backticked/bracketed content
        # so keywords appearing inside aliases or string literals don't trigger false positives.
        import re
        def _remove_quoted_parts(s: str) -> str:
            return re.sub(r'`[^`]*`|' + r"'[^']*'|\"[^\"]*\"|\[[^\]]*\]", ' ', s)

        sanitized = _remove_quoted_parts(query)
        query_upper = sanitized.upper().strip()

        # List of dangerous SQL keywords/operations
        dangerous_keywords = [
            'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE',
            'TRUNCATE', 'REPLACE', 'MERGE', 'GRANT', 'REVOKE',
            'EXEC', 'EXECUTE', 'CALL', 'LOAD', 'OUTFILE', 'INFILE'
        ]

        # Check for dangerous keywords at word boundaries on the sanitized string
        for keyword in dangerous_keywords:
            pattern = r'\b' + keyword + r'\b'
            if re.search(pattern, query_upper):
                return False

        return True
