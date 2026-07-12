from flask import Blueprint, jsonify
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from backend.database import db

main_bp = Blueprint('main', __name__)

@main_bp.route('/', methods=['GET'])
def index():
    return jsonify({
        "message": "TransitOps Backend Running Successfully"
    }), 200

@main_bp.route('/health', methods=['GET'])
def health_check():
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({
            "status": "OK",
            "database": "Connected"
        }), 200
    except OperationalError:
        return jsonify({
            "status": "FAILED",
            "database": "Disconnected"
        }), 503
    except Exception:
        return jsonify({
            "status": "FAILED",
            "database": "Disconnected"
        }), 503
