from flask import Blueprint, request, jsonify
from datetime import datetime
from backend.database import db
from backend.database.models import MaintenanceLog

maintenance_bp = Blueprint('maintenance', __name__, url_prefix='/maintenance')

def serialize_maintenance(log):
    return {
        "id": log.id,
        "vehicle_id": log.vehicle_id,
        "vehicle_registration": log.vehicle.registration_number if log.vehicle else f"#{log.vehicle_id}",
        "maintenance_type": log.maintenance_type,
        "description": log.description,
        "workshop": log.workshop,
        "maintenance_cost": float(log.maintenance_cost) if log.maintenance_cost is not None else None,
        "start_date": log.start_date.isoformat() if log.start_date else None,
        "end_date": log.end_date.isoformat() if log.end_date else None,
        "status": log.status,
        "created_by": log.created_by,
        "created_at": log.created_at.isoformat() if log.created_at else None
    }

def parse_date(date_str):
    if not date_str or not str(date_str).strip():
        return None
    try:
        return datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise ValueError("Invalid date format. Must be YYYY-MM-DD")

# GET /maintenance - Return all maintenance records ordered by newest first
@maintenance_bp.route('', methods=['GET'])
def get_all_maintenance():
    try:
        logs = MaintenanceLog.query.order_by(MaintenanceLog.created_at.desc(), MaintenanceLog.id.desc()).all()
        return jsonify([serialize_maintenance(log) for log in logs]), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch maintenance records", "details": str(e)}), 500

# GET /maintenance/<id> - Return a single maintenance record
@maintenance_bp.route('/<int:log_id>', methods=['GET'])
def get_maintenance(log_id):
    try:
        log = MaintenanceLog.query.get(log_id)
        if not log:
            return jsonify({"error": f"Maintenance record with ID {log_id} not found"}), 404
        return jsonify(serialize_maintenance(log)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch the maintenance record", "details": str(e)}), 500

# POST /maintenance - Create a new maintenance record
@maintenance_bp.route('', methods=['POST'])
def create_maintenance():
    data = request.get_json() or {}
    
    # Validation
    errors = {}
    vehicle_id = data.get('vehicle_id')
    maintenance_type = data.get('maintenance_type')
    start_date_str = data.get('start_date')
    maintenance_cost = data.get('maintenance_cost')
    status = data.get('status', 'Open')
    
    if vehicle_id is None:
        errors['vehicle_id'] = 'vehicle_id is required'
    if not maintenance_type or not str(maintenance_type).strip():
        errors['maintenance_type'] = 'maintenance_type is required'
    
    # Validate start_date
    if not start_date_str or not str(start_date_str).strip():
        errors['start_date'] = 'start_date is required'
    else:
        try:
            start_date = parse_date(start_date_str)
        except ValueError as ve:
            errors['start_date'] = str(ve)
            
    # Validate end_date
    end_date = None
    if data.get('end_date'):
        try:
            end_date = parse_date(data['end_date'])
        except ValueError as ve:
            errors['end_date'] = str(ve)
            
    # Validate maintenance_cost
    if maintenance_cost is not None:
        try:
            float(maintenance_cost)
        except (ValueError, TypeError):
            errors['maintenance_cost'] = 'maintenance_cost must be a numeric value'

    # Validate status
    if status not in ('Open', 'Completed'):
        errors['status'] = "status must be either 'Open' or 'Completed'"
        
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        new_log = MaintenanceLog(
            vehicle_id=vehicle_id,
            maintenance_type=maintenance_type,
            description=data.get('description'),
            workshop=data.get('workshop'),
            maintenance_cost=maintenance_cost,
            start_date=start_date,
            end_date=end_date,
            status=status,
            created_by=data.get('created_by')
        )
        
        db.session.add(new_log)
        db.session.flush() # flush to get transaction/id and allow hooks before commit

        # TODO:
        # When a maintenance record is created,
        # set the corresponding vehicle status to "In Shop".
        
        db.session.commit()
        return jsonify(serialize_maintenance(new_log)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create maintenance record", "details": str(e)}), 500

# PUT /maintenance/<id> - Update an existing maintenance record
@maintenance_bp.route('/<int:log_id>', methods=['PUT'])
def update_maintenance(log_id):
    try:
        log = MaintenanceLog.query.get(log_id)
        if not log:
            return jsonify({"error": f"Maintenance record with ID {log_id} not found"}), 404
            
        data = request.get_json() or {}
        
        # Validations for updates
        errors = {}
        
        if 'maintenance_type' in data:
            val = data['maintenance_type']
            if not val or not str(val).strip():
                errors['maintenance_type'] = 'maintenance_type cannot be empty'
                
        if 'maintenance_cost' in data and data['maintenance_cost'] is not None:
            try:
                float(data['maintenance_cost'])
            except (ValueError, TypeError):
                errors['maintenance_cost'] = 'maintenance_cost must be a numeric value'
                
        if 'status' in data:
            if data['status'] not in ('Open', 'Completed'):
                errors['status'] = "status must be either 'Open' or 'Completed'"
                
        if 'end_date' in data and data['end_date']:
            try:
                parse_date(data['end_date'])
            except ValueError as ve:
                errors['end_date'] = str(ve)
                
        if errors:
            return jsonify({"errors": errors}), 400
        
        # Perform updates
        if 'maintenance_type' in data:
            log.maintenance_type = data['maintenance_type']
        if 'description' in data:
            log.description = data['description']
        if 'workshop' in data:
            log.workshop = data['workshop']
        if 'maintenance_cost' in data:
            log.maintenance_cost = data['maintenance_cost']
        if 'status' in data:
            log.status = data['status']
            
            # TODO:
            # When maintenance is completed,
            # set the corresponding vehicle status back to "Available"
            # unless it is "Retired".
            
        if 'end_date' in data:
            if data['end_date']:
                log.end_date = parse_date(data['end_date'])
            else:
                log.end_date = None

        db.session.commit()
        return jsonify(serialize_maintenance(log)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update maintenance record", "details": str(e)}), 500

# DELETE /maintenance/<id> - Delete a maintenance record
@maintenance_bp.route('/<int:log_id>', methods=['DELETE'])
def delete_maintenance(log_id):
    try:
        log = MaintenanceLog.query.get(log_id)
        if not log:
            return jsonify({"error": f"Maintenance record with ID {log_id} not found"}), 404
            
        # Delete only if status == "Completed"
        if log.status == "Open":
            return jsonify({"error": f"Cannot delete open maintenance record with ID {log_id}. Complete it first."}), 400
            
        db.session.delete(log)
        db.session.commit()
        
        return jsonify({"message": "Maintenance record deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete maintenance record", "details": str(e)}), 500

