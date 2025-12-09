from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from service.user_rights import UserRightsService
from utils.decorators import admin_required

user_rights_bp = Blueprint('user_rights', __name__)
user_rights_service = UserRightsService()

@user_rights_bp.route('/users/<int:user_id>/nav-rights', methods=['GET'])
@jwt_required()
@admin_required
def get_user_rights(user_id):
    """Get navigation menu rights for a specific user - Admin only"""
    try:
        rights = user_rights_service.get_user_nav_rights(user_id)
        return jsonify({
            'success': True,
            'rights': rights
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching user rights: {str(e)}'
        }), 500


@user_rights_bp.route('/users/<int:user_id>/nav-rights/bulk', methods=['POST'])
@jwt_required()
@admin_required
def update_user_rights_changes(user_id):
    """Update user rights based on pending changes from frontend - Admin only"""
    try:
        data = request.json
        changes = data.get('changes', {})
        
        if not isinstance(changes, dict):
            return jsonify({
                'success': False,
                'message': 'changes must be a dictionary'
            }), 400
        
        success = user_rights_service.update_user_rights_bulk(user_id, changes)
        if success:
            return jsonify({
                'success': True,
                'message': 'User rights updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to update user rights'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error updating user rights: {str(e)}'
        }), 500
