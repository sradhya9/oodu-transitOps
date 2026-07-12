from flask import Blueprint, jsonify, request
from backend.database.models import db, SystemSetting
from backend.middleware.auth import authenticate, authorize

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('', methods=['GET'])
@authenticate()
def get_settings():
    try:
        settings = SystemSetting.query.all()
        data = {s.setting_key: {"value": s.setting_value, "description": s.description} for s in settings}
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@settings_bp.route('', methods=['PUT'])
@authenticate()
@authorize(roles=['System Admin', 'Fleet Manager'])
def update_settings():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
            
        for key, val in data.items():
            setting = SystemSetting.query.filter_by(setting_key=key).first()
            if setting:
                setting.setting_value = str(val)
            else:
                # Optionally allow creating new settings dynamically
                new_setting = SystemSetting(setting_key=key, setting_value=str(val))
                db.session.add(new_setting)
                
        db.session.commit()
        return jsonify({'success': True, 'message': 'Settings updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
