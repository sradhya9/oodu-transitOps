from functools import wraps
from flask import request, jsonify, g
import jwt
from backend.config.settings import Config
from backend.database.models import User

def authenticate():
    """
    Middleware to verify JWT token in the Authorization header.
    Stores the user in flask.g.current_user.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = None
            if 'Authorization' in request.headers:
                auth_header = request.headers['Authorization']
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
            
            if not token:
                return jsonify({'message': 'Authentication token is missing. Login mandatory.'}), 401
                
            try:
                data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
                current_user = User.query.get(data['user_id'])
                if not current_user:
                    return jsonify({'message': 'User associated with token not found.'}), 401
            except jwt.ExpiredSignatureError:
                return jsonify({'message': 'Token has expired.'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'message': 'Invalid token.'}), 401
                
            g.current_user = current_user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def authorize(roles):
    """
    Middleware to check if g.current_user has one of the allowed roles.
    Must be used AFTER @authenticate().
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                return jsonify({'message': 'Authentication required before authorization.'}), 401
                
            if g.current_user.role.role_name not in roles:
                return jsonify({'message': f'Unauthorized. Requires one of: {", ".join(roles)}'}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator
