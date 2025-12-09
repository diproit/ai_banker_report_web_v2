
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from service.nav import NavService
from utils.decorators import admin_required
from utils.sql_parser import BaseQueryValidationError


nav_bp = Blueprint('nav', __name__)
nav_service = NavService()


@nav_bp.route('/menu', methods=['GET'])
@jwt_required()
def get_nav_menu():
    """Get navigation menu for user"""
    try:
        user_id = get_jwt_identity()
        language = request.args.get('lang', 'en')  # Default to English
        nav_items = nav_service.get_user_navigation(int(user_id), language)
        return jsonify(nav_items)
    except Exception as e:
        return jsonify([]), 500


@nav_bp.route('/menu/all', methods=['GET'])
@jwt_required()
@admin_required
def get_all_nav_menu():
    """Get all available navigation menu items for user rights management - Admin only"""
    try:
        language = request.args.get('lang', 'en')  # Default to English
        all_items = nav_service.get_all_menu_items(language)
        
        return jsonify({
            'success': True,
            'data': all_items
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@nav_bp.route('/menu/level/<int:level>', methods=['GET'])
@jwt_required()
def get_menu_by_level(level):
    """Get menu items by hierarchy level"""
    try:
        language = request.args.get('lang', 'en')  # Default to English
        nav_items = nav_service.get_items_by_level(level, language)
        return jsonify({
            'success': True,
            'data': nav_items,
            'level': level
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@nav_bp.route('/menu/subtree/<int:item_id>', methods=['GET'])
@jwt_required()
def get_menu_subtree(item_id):
    """Get subtree under specific menu item"""
    try:
        user_id = get_jwt_identity()
        language = request.args.get('lang', 'en')  # Default to English
        nav_items = nav_service.get_subtree(item_id, int(user_id), language)
        return jsonify({
            'success': True,
            'data': nav_items,
            'parent_id': item_id
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@nav_bp.route('/menu', methods=['POST'])
@jwt_required()
@admin_required
def create_menu_item():
    """Create a new navigation menu item - Admin only"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        # Validate the data
        validation_errors = nav_service.validate_menu_item_data(data)
        if validation_errors:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'details': validation_errors
            }), 400
        
        # Create the item
        user_id = get_jwt_identity()
        created_item = nav_service.create_menu_item(data, int(user_id))
        
        return jsonify({
            'success': True,
            'message': 'Menu item created successfully',
            'data': created_item
        }), 201
        
    except Exception as ve:
        if isinstance(ve, BaseQueryValidationError):
            return jsonify({
                'success': False,
                'error': str(ve)
            }), 400
        return jsonify({
            'success': False,
            'error': f'Failed to create menu item: {str(ve)}'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to create menu item: {str(e)}'
        }), 500


@nav_bp.route('/menu/<int:item_id>', methods=['GET'])
@jwt_required()
def get_menu_item(item_id):
    """Get a specific menu item by ID"""
    try:
        item = nav_service.get_menu_item_by_id(item_id)
        
        if not item:
            return jsonify({
                'success': False,
                'error': 'Menu item not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': item
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@nav_bp.route('/menu/<int:item_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_menu_item(item_id):
    """Update an existing navigation menu item - Admin only"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        # Validate the data
        validation_errors = nav_service.validate_menu_item_data(data, item_id)
        if validation_errors:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'details': validation_errors
            }), 400
        
        # Update the item
        updated_item = nav_service.update_menu_item(item_id, data)
        
        return jsonify({
            'success': True,
            'message': 'Menu item updated successfully',
            'data': updated_item
        })
        
    except Exception as ve:
        if isinstance(ve, BaseQueryValidationError):
            return jsonify({
                'success': False,
                'error': str(ve)
            }), 400
        return jsonify({
            'success': False,
            'error': f'Failed to update menu item: {str(ve)}'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to update menu item: {str(e)}'
        }), 500


@nav_bp.route('/menu/<int:item_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_menu_item(item_id):
    """Delete a navigation menu item and its children - Admin only"""
    try:
        success = nav_service.delete_menu_item(item_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Menu item and its children deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to delete menu item'
            }), 500
        
    except ValueError as ve:
        return jsonify({
            'success': False,
            'error': str(ve)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to delete menu item: {str(e)}'
        }), 500


@nav_bp.route('/menu/validate', methods=['POST'])
@jwt_required()
@admin_required
def validate_menu_item():
    """Validate menu item data without creating it - Admin only"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        item_id = data.get('id')  # For update validation
        validation_errors = nav_service.validate_menu_item_data(data, item_id)
        
        return jsonify({
            'success': True,
            'valid': len(validation_errors) == 0,
            'errors': validation_errors
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@nav_bp.route('/menu/urls', methods=['GET'])
@jwt_required()
@admin_required
def get_existing_urls():
    """Get all existing URLs from navigation menu items for dropdown selection - Admin only"""
    try:
        urls = nav_service.get_all_existing_urls()
        return jsonify({
            'success': True,
            'data': urls
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching URLs: {str(e)}'
        }), 500


@nav_bp.route('/menu/groups', methods=['GET'])
@jwt_required()
@admin_required
def get_existing_groups():
    """Get all existing group names from navigation menu items for dropdown selection - Admin only"""
    try:
        groups = nav_service.get_existing_group_names()
        return jsonify({
            'success': True,
            'data': groups
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching group names: {str(e)}'
        }), 500
