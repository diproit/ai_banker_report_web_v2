from flask import Blueprint, request, jsonify, make_response
from service.auth import authenticate_user, register_user
from flask_jwt_extended import jwt_required, get_jwt, unset_jwt_cookies
from utils.decorators import admin_required
from flask_jwt_extended import create_access_token


auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    user_name = data.get('user_name')
    password = data.get('password')
    if not user_name or not password:
        return jsonify({'message': 'User name and password are required'}), 400
    user = authenticate_user(user_name, password)
    if user:
        access_token = create_access_token(
            identity=str(user['id']),
            additional_claims={
                'role': user.get('user_role')
            }
        )
        
        # Create response with HTTP-only cookie
        response = make_response(jsonify({'user': user, 'access_token': access_token}))
        response.set_cookie(
            'access_token_cookie',
            value=access_token,
            httponly=True,
            secure=True,  # Set to True in production with HTTPS
            samesite='Strict',
            max_age=3600 * 24  # 24 hours
        )
        return response
    return jsonify({'message': 'Invalid credentials'}), 401


@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'message': 'Logout successful'}))
    unset_jwt_cookies(response)
    return response


@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify if the current token is valid and return user data"""
    from models.it_user_master import ItUserMaster
    from config.database import get_session
    from sqlmodel import select
    
    claims = get_jwt()
    user_id = claims.get('sub')
    
    # Fetch full user data from database
    try:
        with get_session() as session:
            user_obj = session.exec(
                select(ItUserMaster).where(ItUserMaster.id == int(user_id))
            ).first()
            
            if user_obj:
                user_dict = user_obj.dict()
                user_dict.pop('password', None)  # Remove password from response
                user_dict.pop('password_old1', None)  # Remove old passwords
                user_dict.pop('password_od2', None)
                
                # Convert user_role enum to string for JSON response
                if user_dict.get('user_role'):
                    user_dict['user_role'] = user_dict['user_role'].value
                else:
                    user_dict['user_role'] = 'CLERK'  # Default role
                
                return jsonify({
                    'valid': True,
                    'user': user_dict
                })
    except Exception as e:
        print(f"Error fetching user data: {e}")
    
    # Fallback if user not found in database
    return jsonify({
        'valid': True,
        'user_id': user_id,
        'role': claims.get('role')
    })


@auth_bp.route('/register', methods=['POST'])
@jwt_required()
@admin_required
def register():
    data = request.json
    user_name = data.get('user_name')
    name = data.get('name')
    password = data.get('password')
    user_role = data.get('user_role', 'CLERK')  # Default to clerk role
    
    if not user_name or not password:
        return jsonify({'success': False, 'message': 'User name and password are required'}), 400
    if not name:
        return jsonify({'success': False, 'message': 'Name is required'}), 400
        
    result = register_user(user_name, name, password, user_role)
    if result['success']:
        return jsonify({'success': True, 'message': 'User registered successfully'})
    return jsonify({'success': False, 'message': result['message']}), 400