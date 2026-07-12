from flask import Blueprint, request, jsonify, g
from datetime import datetime
from backend.database import db
from backend.database.models import FuelLog
from backend.middleware.auth import authenticate, authorize

fuel_bp = Blueprint('fuel_logs', __name__, url_prefix='/fuel-logs')

def serialize_fuel(log):
    return {
        "id": log.id,
        "vehicle_id": log.vehicle_id,
        "vehicle_reg_number": log.vehicle.registration_number if log.vehicle else None,
        "trip_id": log.trip_id,
        "liters": float(log.liters) if log.liters is not None else None,
        "fuel_cost": float(log.fuel_cost) if log.fuel_cost is not None else None,
        "fuel_date": log.fuel_date.isoformat() if log.fuel_date else None,
        "odometer": float(log.odometer) if log.odometer is not None else None,
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

# GET /fuel-logs - Return all fuel records
@fuel_bp.route('', methods=['GET'])
@authenticate()
@authorize(roles=['Financial Analyst', 'Driver'])
def get_all_fuel_logs():
    try:
        from backend.utils.role_filters import get_driver_profile_id
        from backend.database.models import Trip
        from sqlalchemy import or_
        
        user = g.current_user
        query = FuelLog.query
        
        driver_id_filter = get_driver_profile_id(user)
        if driver_id_filter is not None:
            query = query.outerjoin(Trip).filter(
                or_(
                    FuelLog.created_by == user.id,
                    Trip.driver_id == driver_id_filter
                )
            )
            
        logs = query.order_by(FuelLog.created_at.desc(), FuelLog.id.desc()).all()
        return jsonify([serialize_fuel(log) for log in logs]), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch fuel logs", "details": str(e)}), 500

# GET /fuel/<id> - Return one fuel log
@fuel_bp.route('/<int:log_id>', methods=['GET'])
@authenticate()
@authorize(roles=['Financial Analyst'])
def get_fuel(log_id):
    try:
        log = FuelLog.query.get(log_id)
        if not log:
            return jsonify({"error": f"Fuel log with ID {log_id} not found"}), 404
        return jsonify(serialize_fuel(log)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch the fuel log", "details": str(e)}), 500

# POST /fuel-logs - Create a new fuel record
@fuel_bp.route('', methods=['POST'])
@authenticate()
@authorize(roles=['Financial Analyst', 'Driver'])
def create_fuel_log():
    data = request.get_json() or {}
    errors = {}
    
    vehicle_id = data.get('vehicle_id')
    liters = data.get('liters')
    fuel_cost = data.get('fuel_cost')
    fuel_date_str = data.get('fuel_date')
    odometer = data.get('odometer')
    trip_id = data.get('trip_id')
    created_by = data.get('created_by')
    
    # Validation: vehicle_id
    if vehicle_id is None:
        errors['vehicle_id'] = 'vehicle_id is required'
    else:
        try:
            vehicle_id = int(vehicle_id)
        except (ValueError, TypeError):
            errors['vehicle_id'] = 'vehicle_id must be an integer'
            
    # Validation: liters
    if liters is None:
        errors['liters'] = 'liters is required'
    else:
        try:
            liters_val = float(liters)
            if liters_val <= 0:
                errors['liters'] = 'liters must be greater than 0'
            else:
                liters = liters_val
        except (ValueError, TypeError):
            errors['liters'] = 'liters must be a numeric value'
            
    # Validation: fuel_cost
    if fuel_cost is None:
        errors['fuel_cost'] = 'fuel_cost is required'
    else:
        try:
            cost_val = float(fuel_cost)
            if cost_val < 0:
                errors['fuel_cost'] = 'fuel_cost cannot be negative'
            else:
                fuel_cost = cost_val
        except (ValueError, TypeError):
            errors['fuel_cost'] = 'fuel_cost must be a numeric value'
            
    # Validation: fuel_date
    if not fuel_date_str or not str(fuel_date_str).strip():
        errors['fuel_date'] = 'fuel_date is required'
    else:
        try:
            fuel_date = parse_date(fuel_date_str)
        except ValueError as ve:
            errors['fuel_date'] = str(ve)
            
    # Validation: odometer
    if odometer is not None:
        try:
            odo_val = float(odometer)
            if odo_val < 0:
                errors['odometer'] = 'odometer cannot be negative'
            else:
                odometer = odo_val
        except (ValueError, TypeError):
            errors['odometer'] = 'odometer must be a numeric value'

    # Validation: trip_id
    if trip_id is not None:
        try:
            trip_id = int(trip_id)
        except (ValueError, TypeError):
            errors['trip_id'] = 'trip_id must be an integer'

    # Validation: created_by
    if created_by is not None:
        try:
            created_by = int(created_by)
        except (ValueError, TypeError):
            errors['created_by'] = 'created_by must be an integer'
            
    if errors:
        return jsonify({"errors": errors}), 400
        
    try:
        # TODO: Validate that vehicle_id exists in vehicles table when Vehicle model is implemented
        # TODO: Validate that trip_id exists in trips table when Trip model is implemented
        # TODO: Validate that created_by exists in users table when User model is implemented
        
        new_log = FuelLog(
            vehicle_id=vehicle_id,
            trip_id=trip_id,
            liters=liters,
            fuel_cost=fuel_cost,
            fuel_date=fuel_date,
            odometer=odometer,
            created_by=created_by
        )
        
        db.session.add(new_log)
        db.session.commit()
        return jsonify(serialize_fuel(new_log)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create fuel log", "details": str(e)}), 500

# PUT /fuel-logs/<id> - Update an existing fuel record
@fuel_bp.route('/<int:log_id>', methods=['PUT'])
@authenticate()
@authorize(roles=['Financial Analyst'])
def update_fuel_log(log_id):
    try:
        log = FuelLog.query.get(log_id)
        if not log:
            return jsonify({"error": f"Fuel log with ID {log_id} not found"}), 404
            
        data = request.get_json() or {}
        errors = {}
        
        # Validations for updates
        # Update only: liters, fuel_cost, fuel_date, odometer, trip_id
        
        liters = data.get('liters')
        fuel_cost = data.get('fuel_cost')
        fuel_date_str = data.get('fuel_date')
        odometer = data.get('odometer')
        trip_id = data.get('trip_id')
        
        if 'liters' in data:
            if liters is None:
                errors['liters'] = 'liters cannot be empty'
            else:
                try:
                    liters_val = float(liters)
                    if liters_val <= 0:
                        errors['liters'] = 'liters must be greater than 0'
                    else:
                        liters = liters_val
                except (ValueError, TypeError):
                    errors['liters'] = 'liters must be a numeric value'
                    
        if 'fuel_cost' in data:
            if fuel_cost is None:
                errors['fuel_cost'] = 'fuel_cost cannot be empty'
            else:
                try:
                    cost_val = float(fuel_cost)
                    if cost_val < 0:
                        errors['fuel_cost'] = 'fuel_cost cannot be negative'
                    else:
                        fuel_cost = cost_val
                except (ValueError, TypeError):
                    errors['fuel_cost'] = 'fuel_cost must be a numeric value'
                    
        if 'fuel_date' in data:
            if not fuel_date_str or not str(fuel_date_str).strip():
                errors['fuel_date'] = 'fuel_date cannot be empty'
            else:
                try:
                    fuel_date = parse_date(fuel_date_str)
                except ValueError as ve:
                    errors['fuel_date'] = str(ve)
                    
        if 'odometer' in data:
            if odometer is not None:
                try:
                    odo_val = float(odometer)
                    if odo_val < 0:
                        errors['odometer'] = 'odometer cannot be negative'
                    else:
                        odometer = odo_val
                except (ValueError, TypeError):
                    errors['odometer'] = 'odometer must be a numeric value'
            else:
                odometer = None
                
        if 'trip_id' in data:
            if trip_id is not None:
                try:
                    trip_id = int(trip_id)
                except (ValueError, TypeError):
                    errors['trip_id'] = 'trip_id must be an integer'
            else:
                trip_id = None
                
        if errors:
            return jsonify({"errors": errors}), 400
            
        # Perform updates
        if 'liters' in data:
            log.liters = liters
        if 'fuel_cost' in data:
            log.fuel_cost = fuel_cost
        if 'fuel_date' in data:
            log.fuel_date = fuel_date
        if 'odometer' in data:
            log.odometer = odometer
        if 'trip_id' in data:
            # TODO: Validate that trip_id exists in trips table when Trip model is implemented
            log.trip_id = trip_id
            
        db.session.commit()
        return jsonify(serialize_fuel(log)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update fuel log", "details": str(e)}), 500

# DELETE /fuel-logs/<id> - Delete a fuel record
@fuel_bp.route('/<int:log_id>', methods=['DELETE'])
@authenticate()
@authorize(roles=['Financial Analyst'])
def delete_fuel_log(log_id):
    try:
        log = FuelLog.query.get(log_id)
        if not log:
            return jsonify({"error": f"Fuel log with ID {log_id} not found"}), 404
            
        db.session.delete(log)
        db.session.commit()
        return jsonify({"message": "Fuel log deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete fuel log", "details": str(e)}), 500
