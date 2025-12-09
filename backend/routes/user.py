from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from service.user import get_all_users
from utils.decorators import admin_required


user_bp = Blueprint('user-management', __name__)


@user_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_users():
    """Get all users with basic information - Admin only"""
    try:
        users = get_all_users()
        return jsonify({
            'success': True,
            'users': [user.model_dump() for user in users]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching users: {str(e)}'
        }), 500
