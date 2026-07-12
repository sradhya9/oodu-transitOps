from flask import Blueprint, request, jsonify
import jwt
import datetime
import random
import string
from backend.database.models import db, User, Role, PasswordResetRequest
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

@auth_bp.route('/reset-requests', methods=['GET'])
@authenticate()
@authorize(roles=['System Admin', 'Fleet Manager'])
def get_reset_requests():
    requests = PasswordResetRequest.query.filter_by(status='Pending').all()
    data = []
    for req in requests:
        data.append({
            'id': req.id,
            'name': req.user.full_name,
            'email': req.user.email,
            'role': req.user.role.role_name,
            'requested_at': req.created_at.isoformat()
        })
    return jsonify(data), 200

@auth_bp.route('/approve-reset/<int:request_id>', methods=['POST'])
@authenticate()
@authorize(roles=['System Admin', 'Fleet Manager'])
def approve_reset(request_id):
    req = PasswordResetRequest.query.get(request_id)
    if not req or req.status != 'Pending':
        return jsonify({'message': 'Request not found or already processed'}), 404
        
    req.special_access_code = generate_random_code(8)
    req.emailed_code = generate_random_code(6)
    req.status = 'Approved'
    req.expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    db.session.commit()
    
    return jsonify({
        'special_access_code': req.special_access_code,
        'emailed_code': req.emailed_code
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if not user:
        # Prevent email enumeration
        return jsonify({'message': 'If email exists, a request has been made.'}), 200
        
    # Check if pending request exists
    existing = PasswordResetRequest.query.filter_by(user_id=user.id, status='Pending').first()
    if not existing:
        new_req = PasswordResetRequest(user_id=user.id, status='Pending')
        db.session.add(new_req)
        db.session.commit()
        
    return jsonify({'message': 'Password reset request submitted.'}), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    special = data.get('special_access_code')
    emailed = data.get('emailed_code')
    new_password = data.get('new_password')
    
    req = PasswordResetRequest.query.filter_by(
        special_access_code=special, 
        emailed_code=emailed,
        status='Approved'
    ).first()
    
    if not req or (req.expires_at and req.expires_at < datetime.datetime.utcnow()):
        return jsonify({'message': 'Invalid or expired codes.'}), 400
        
    req.user.set_password(new_password)
    req.status = 'Completed'
    db.session.commit()
    
    return jsonify({'message': 'Password has been reset successfully.'}), 200

