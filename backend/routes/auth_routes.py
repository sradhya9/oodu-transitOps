from flask import Blueprint, request, jsonify
import jwt
import datetime
import random
import string
from backend.database.models import db, User, Role
from backend.config.settings import Config
from backend.middleware.auth import authenticate, authorize

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password are required'}), 400

    user = User.query.filter_by(email=data.get('email')).first()
    
    if not user or not user.check_password(data.get('password')):
        return jsonify({'message': 'Invalid credentials'}), 401

    # Generate JWT
    token_payload = {
        'user_id': user.id,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=12)
    }
    token = jwt.encode(token_payload, Config.SECRET_KEY, algorithm="HS256")

    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'name': user.full_name,
            'email': user.email,
            'role': user.role.role_name
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@authenticate()
def logout():
    # Since JWT is stateless, logout is handled by the frontend deleting the token.
    # We return 200 OK here for a consistent API interface.
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/me', methods=['GET'])
@authenticate()
def get_me():
    from flask import g
    user = g.current_user
    return jsonify({
        'user': {
            'id': user.id,
            'name': user.full_name,
            'email': user.email,
            'role': user.role.name
        }
    }), 200

def generate_random_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# Password reset routes temporarily disabled due to missing model

# @auth_bp.route('/forgot-password', methods=['POST'])
# def forgot_password(): ...

# @auth_bp.route('/reset-requests', methods=['GET'])
# def get_reset_requests(): ...

# @auth_bp.route('/approve-reset/<int:request_id>', methods=['POST'])
# def approve_reset(request_id): ...

# @auth_bp.route('/reset-password', methods=['POST'])
# def reset_password(): ...

