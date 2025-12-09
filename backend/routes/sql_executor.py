from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from service.sql_executor import SqlExecutorService
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

# Create blueprint
sql_executor_bp = Blueprint('sql_executor', __name__)

# Initialize service
sql_executor_service = SqlExecutorService()

@sql_executor_bp.route('/runQuery', methods=['POST'])
# @jwt_required()  # Temporarily disabled for testing - TODO: Re-enable after fixing JWT token issues
def run_query():
    """
    Execute a SQL query
    
    Expected JSON payload:
    {
        "query": "SELECT * FROM table_name",
        "limit": 10  // optional
    }
    
    Returns:
    {
        "success": true/false,
        "data": [...],
        "columns": [...],
        "row_count": number,
        "query": "executed query",
        "error": "error message if any"
    }
    """
    try:
        # Get current user from JWT (optional for now)
        try:
            current_user = get_jwt_identity()
            logger.info(f"User {current_user} is executing a query")
        except:
            current_user = "anonymous"
            logger.info("Anonymous user executing a query")
        
        # Get request data
        data = request.get_json()
        logger.info(f"Received data: {data}")
        
        if not data:
            logger.error("No JSON data provided")
            return jsonify({
                "success": False,
                "error": "No JSON data provided"
            }), 400
        
        # Extract query and limit
        query = data.get('query')
        limit = data.get('limit', None)
        
        # Validate required fields
        if not query:
            return jsonify({
                "success": False,
                "error": "Query parameter is required"
            }), 400
        
        # Validate limit if provided
        if limit is not None:
            try:
                limit = int(limit)
                if limit <= 0:
                    limit = None
            except (ValueError, TypeError):
                return jsonify({
                    "success": False,
                    "error": "Limit must be a positive integer"
                }), 400
        
        # Execute query
        result = sql_executor_service.execute_query(query, limit)
        
        # Determine HTTP status code
        status_code = 200 if result.get('success') else 400
        
        # Log the execution
        if result.get('success'):
            logger.info(f"Query executed successfully by user {current_user}. Returned {result.get('row_count', 0)} rows")
        else:
            logger.warning(f"Query execution failed for user {current_user}: {result.get('error')}")
        
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Unexpected error in run_query endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500
