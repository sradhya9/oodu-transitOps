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

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'message': 'Email is required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        # Generic response to prevent email enumeration
        return jsonify({'message': 'If that email exists, a reset request has been sent to the Fleet Manager.'}), 200
        
    # Check if a pending request already exists
    existing = PasswordResetRequest.query.filter_by(user_id=user.id, status='Pending').first()
    if existing:
        return jsonify({'message': 'A reset request is already pending for this account.'}), 400
        
    reset_req = PasswordResetRequest(user_id=user.id)
    db.session.add(reset_req)
    db.session.commit()
    
    return jsonify({'message': 'Password reset request submitted. Awaiting Fleet Manager approval.'}), 200

@auth_bp.route('/reset-requests', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager'])
def get_reset_requests():
    requests = PasswordResetRequest.query.filter_by(status='Pending').all()
    res = []
    for req in requests:
        res.append({
            'id': req.id,
            'user_id': req.user_id,
            'email': req.user.email,
            'name': req.user.full_name,
            'role': req.user.role.name,
            'requested_at': req.created_at.isoformat()
        })
    return jsonify(res), 200

@auth_bp.route('/approve-reset/<int:request_id>', methods=['POST'])
@authenticate()
@authorize(roles=['Fleet Manager'])
def approve_reset(request_id):
    reset_req = PasswordResetRequest.query.get(request_id)
    if not reset_req or reset_req.status != 'Pending':
        return jsonify({'message': 'Request not found or not pending'}), 404
        
    # Generate codes
    special_code = generate_random_code(12)
    emailed_code = generate_random_code(6)
    
    reset_req.special_access_code = special_code
    reset_req.emailed_code = emailed_code
    reset_req.status = 'Approved'
    reset_req.expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    db.session.commit()
    
    # In a real system, you would trigger an email with `emailed_code` here.
    return jsonify({
        'message': 'Request approved.',
        'special_access_code': special_code,
        'emailed_code': emailed_code, # Displayed only so admin can tell user, or for testing
        'user_email': reset_req.user.email
    }), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    special_code = data.get('special_access_code')
    emailed_code = data.get('emailed_code')
    new_password = data.get('new_password')
    
    if not all([email, special_code, emailed_code, new_password]):
        return jsonify({'message': 'All fields are required.'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'Invalid reset request.'}), 400
        
    reset_req = PasswordResetRequest.query.filter_by(
        user_id=user.id, 
        special_access_code=special_code, 
        emailed_code=emailed_code, 
        status='Approved'
    ).first()
    
    if not reset_req:
        return jsonify({'message': 'Invalid codes provided.'}), 400
        
    if reset_req.expires_at and reset_req.expires_at < datetime.datetime.utcnow():
        reset_req.status = 'Completed' # Invalidating it
        db.session.commit()
        return jsonify({'message': 'Reset codes have expired.'}), 400
        
    user.set_password(new_password)
    reset_req.status = 'Completed'
    db.session.commit()
    
    return jsonify({'message': 'Password has been reset successfully.'}), 200
