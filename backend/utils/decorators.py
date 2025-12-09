from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from sqlmodel import select
from models.it_user_master import ItUserMaster, UserRole
from config.database import get_session
import logging

logger = logging.getLogger(__name__)


def admin_required(f):
    """Decorator to require admin role for accessing the endpoint"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = get_jwt_identity()
            claims = get_jwt()
            user_role = claims.get('role', None)
            if not user_id:
                return jsonify({
                    'success': False,
                    'error': 'Authentication required'
                }), 401
            if user_role != 'ADMIN':
                logger.warning(f"Unauthorized access attempt by user ID: {user_id}, Role: {user_role}")
                return jsonify({
                    'success': False,
                    'error': 'Admin access required. Only administrators can perform this action.'
                }), 403
            logger.info(f"Admin access granted for user ID: {user_id}")
            return f(*args, **kwargs)
                
        except ValueError as ve:
            logger.error(f"Invalid user ID format: {user_id}")
            return jsonify({
                'success': False,
                'error': 'Invalid user ID'
            }), 400
        except Exception as e:
            logger.error(f"Error checking admin access for user ID {user_id}: {e}")
            return jsonify({
                'success': False,
                'error': 'Internal server error'
            }), 500
    
    return decorated_function


def role_required(*allowed_roles):
    """Decorator to require specific roles for accessing the endpoint"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                user_id = get_jwt_identity()
                claims = get_jwt()
                user_role = claims.get('role', None)
                if not user_id:
                    return jsonify({
                        'success': False,
                        'error': 'Authentication required'
                    }), 401
                if user_role not in [role.value for role in allowed_roles]:
                    logger.warning(f"Unauthorized access attempt by user ID: {user_id}, Role: {user_role}. Required roles: {allowed_roles}")
                    return jsonify({
                        'success': False,
                        'error': f"Access denied. Required role(s): {', '.join([role.value for role in allowed_roles])}"                    
                    }), 403
                logger.info(f"Role-based access granted for user ID: {user_id}, Role: {user_role}")
                return f(*args, **kwargs)
                    
            except ValueError as ve:
                logger.error(f"Invalid user ID format: {user_id}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid user ID'
                }), 400
            except Exception as e:
                logger.error(f"Error checking role access for user ID {user_id}: {e}")
                return jsonify({
                    'success': False,
                    'error': 'Internal server error'
                }), 500
        
        return decorated_function
    return decorator