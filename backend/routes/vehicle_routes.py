from flask import Blueprint, request, jsonify
from datetime import datetime, date
from sqlalchemy import or_, desc, asc
from sqlalchemy.exc import IntegrityError
from backend.database import db
from backend.database.models import Vehicle

vehicle_bp = Blueprint('vehicles', __name__, url_prefix='/api/vehicles')

def serialize_vehicle(vehicle):
    return {
        "id": vehicle.id,
        "registration_number": vehicle.registration_number,
        "vehicle_name": vehicle.vehicle_name,
        "vehicle_model": vehicle.vehicle_model,
        "vehicle_type": vehicle.vehicle_type,
        "max_load_capacity": float(vehicle.max_load_capacity) if vehicle.max_load_capacity else 0,
        "odometer": float(vehicle.odometer) if vehicle.odometer else 0,
        "acquisition_cost": float(vehicle.acquisition_cost) if vehicle.acquisition_cost else 0,
        "acquisition_date": vehicle.acquisition_date.isoformat() if vehicle.acquisition_date else None,
        "status": vehicle.status,
        "created_at": vehicle.created_at.isoformat() if vehicle.created_at else None,
        "updated_at": vehicle.updated_at.isoformat() if vehicle.updated_at else None
    }

@vehicle_bp.route('', methods=['GET'])
def get_vehicles():
    try:
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        # Search and Filter parameters
        search = request.args.get('search', '')
        v_type = request.args.get('type', '')
        status = request.args.get('status', '')
        purchase_date = request.args.get('purchaseDate', '')
        
        # Sorting parameters
        sort_by = request.args.get('sortBy', 'id')
        sort_order = request.args.get('sortOrder', 'asc')

        query = db.session.query(Vehicle)

        # Apply Search
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Vehicle.registration_number.ilike(search_term),
                    Vehicle.vehicle_name.ilike(search_term),
                    Vehicle.vehicle_model.ilike(search_term)
                )
            )

        # Apply Filters
        if v_type:
            query = query.filter(Vehicle.vehicle_type == v_type)
        if status:
            query = query.filter(Vehicle.status == status)
        if purchase_date:
            try:
                date_obj = datetime.strptime(purchase_date, "%Y-%m-%d").date()
                query = query.filter(Vehicle.acquisition_date == date_obj)
            except ValueError:
                pass # Invalid date format, ignore

        # Apply Sorting
        valid_sort_fields = {
            'registration_number': Vehicle.registration_number,
            'vehicle_name': Vehicle.vehicle_name,
            'vehicle_type': Vehicle.vehicle_type,
            'acquisition_date': Vehicle.acquisition_date,
            'odometer': Vehicle.odometer,
            'acquisition_cost': Vehicle.acquisition_cost,
            'id': Vehicle.id
        }
        
        sort_column = valid_sort_fields.get(sort_by, Vehicle.id)
        if sort_order.lower() == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Pagination
        paginated_vehicles = query.paginate(page=page, per_page=limit, error_out=False)

        return jsonify({
            "success": True,
            "message": "Vehicles retrieved successfully",
            "data": {
                "items": [serialize_vehicle(v) for v in paginated_vehicles.items],
                "total": paginated_vehicles.total,
                "page": paginated_vehicles.page,
                "pages": paginated_vehicles.pages,
                "limit": paginated_vehicles.per_page
            }
        }), 200

    except Exception as e:
        print(f"Error fetching vehicles: {e}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch vehicles",
            "error": str(e)
        }), 500

@vehicle_bp.route('/available', methods=['GET'])
def get_available_vehicles():
    try:
        vehicles = db.session.query(Vehicle).filter(Vehicle.status == 'Available').all()
        return jsonify({
            "success": True,
            "message": "Available vehicles retrieved successfully",
            "data": [serialize_vehicle(v) for v in vehicles]
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch available vehicles",
            "error": str(e)
        }), 500

@vehicle_bp.route('/<int:id>', methods=['GET'])
def get_vehicle(id):
    try:
        vehicle = db.session.get(Vehicle, id)
        if not vehicle:
            return jsonify({"success": False, "message": "Vehicle not found"}), 404
        
        return jsonify({
            "success": True,
            "message": "Vehicle retrieved successfully",
            "data": serialize_vehicle(vehicle)
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch vehicle"}), 500

def validate_vehicle_data(data):
    errors = []
    
    # Required fields
    required_fields = ['registration_number', 'vehicle_name', 'vehicle_type', 'max_load_capacity', 'acquisition_cost']
    for field in required_fields:
        if not data.get(field):
            errors.append(f"{field.replace('_', ' ').title()} is required.")
            
    # Value validations
    try:
        if 'max_load_capacity' in data and float(data['max_load_capacity']) <= 0:
            errors.append("Maximum Load Capacity must be greater than zero.")
    except (ValueError, TypeError):
        errors.append("Invalid Maximum Load Capacity.")

    try:
        if 'odometer' in data and data['odometer'] is not None and float(data['odometer']) < 0:
            errors.append("Odometer cannot be negative.")
    except (ValueError, TypeError):
        errors.append("Invalid Odometer value.")

    try:
        if 'acquisition_cost' in data and float(data['acquisition_cost']) <= 0:
            errors.append("Acquisition Cost must be greater than zero.")
    except (ValueError, TypeError):
        errors.append("Invalid Acquisition Cost.")

    if 'acquisition_date' in data and data['acquisition_date']:
        try:
            purchase_date = datetime.strptime(data['acquisition_date'], "%Y-%m-%d").date()
            if purchase_date > date.today():
                errors.append("Purchase Date cannot be a future date.")
        except ValueError:
            errors.append("Invalid Purchase Date format (YYYY-MM-DD expected).")

    allowed_statuses = ['Available', 'On Trip', 'In Shop', 'Retired']
    if 'status' in data and data['status'] not in allowed_statuses:
        errors.append("Invalid Vehicle Status.")
        
    allowed_types = ['Truck', 'Mini Truck', 'Van', 'Pickup', 'Bike', 'Trailer', 'Container']
    if 'vehicle_type' in data and data['vehicle_type'] not in allowed_types:
        errors.append("Invalid Vehicle Type.")

    return errors

@vehicle_bp.route('', methods=['POST'])
def create_vehicle():
    data = request.json
    
    errors = validate_vehicle_data(data)
    if errors:
        return jsonify({"success": False, "message": "Validation failed", "errors": errors}), 400

    try:
        # Check uniqueness
        existing = db.session.query(Vehicle).filter_by(registration_number=data['registration_number']).first()
        if existing:
            return jsonify({"success": False, "message": "Registration Number must be unique."}), 400

        acq_date_str = data.get('acquisition_date')
        acq_date = None
        if acq_date_str:
            acq_date = datetime.strptime(acq_date_str, "%Y-%m-%d").date()

        new_vehicle = Vehicle(
            registration_number=data['registration_number'],
            vehicle_name=data['vehicle_name'],
            vehicle_model=data.get('vehicle_model') or None,
            vehicle_type=data['vehicle_type'],
            max_load_capacity=float(data['max_load_capacity']),
            odometer=float(data.get('odometer') or 0),
            acquisition_cost=float(data['acquisition_cost']),
            acquisition_date=acq_date,
            status=data.get('status', 'Available')
        )
        
        db.session.add(new_vehicle)
        db.session.commit()
        
        return jsonify({
            "success": True, 
            "message": "Vehicle created successfully", 
            "data": serialize_vehicle(new_vehicle)
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"success": False, "message": "Database error, possibly duplicate registration number."}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error creating vehicle: {e}")
        return jsonify({"success": False, "message": "Failed to create vehicle"}), 500

@vehicle_bp.route('/<int:id>', methods=['PUT'])
def update_vehicle(id):
    vehicle = db.session.get(Vehicle, id)
    if not vehicle:
        return jsonify({"success": False, "message": "Vehicle not found"}), 404

    # Business Rule: Retired vehicles cannot be edited
    if vehicle.status == 'Retired':
        return jsonify({"success": False, "message": "Retired vehicles cannot be edited."}), 403

    data = request.json
    
    # Registration number is read-only for updates, but we need it for validation check
    # We temporarily inject it so validation passes
    temp_data = dict(data)
    temp_data['registration_number'] = vehicle.registration_number
    
    errors = validate_vehicle_data(temp_data)
    if errors:
        return jsonify({"success": False, "message": "Validation failed", "errors": errors}), 400

    try:
        # Update fields (except registration_number)
        vehicle.vehicle_name = data.get('vehicle_name', vehicle.vehicle_name)
        vehicle.vehicle_model = data.get('vehicle_model') or None
        vehicle.vehicle_type = data.get('vehicle_type', vehicle.vehicle_type)
        
        if 'max_load_capacity' in data:
            vehicle.max_load_capacity = float(data['max_load_capacity'])
        if 'odometer' in data:
            vehicle.odometer = float(data['odometer'] or 0)
        if 'acquisition_cost' in data:
            vehicle.acquisition_cost = float(data['acquisition_cost'])
            
        if 'acquisition_date' in data:
            acq_date_str = data['acquisition_date']
            if acq_date_str:
                vehicle.acquisition_date = datetime.strptime(acq_date_str, "%Y-%m-%d").date()
            else:
                vehicle.acquisition_date = None
        
        # Only update status if provided
        if 'status' in data:
            vehicle.status = data['status']
            
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Vehicle updated successfully",
            "data": serialize_vehicle(vehicle)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating vehicle: {e}")
        return jsonify({"success": False, "message": "Failed to update vehicle"}), 500

@vehicle_bp.route('/<int:id>', methods=['DELETE'])
def delete_vehicle(id):
    vehicle = db.session.get(Vehicle, id)
    if not vehicle:
        return jsonify({"success": False, "message": "Vehicle not found"}), 404

    try:
        db.session.delete(vehicle)
        db.session.commit()
        return jsonify({"success": True, "message": "Vehicle deleted successfully"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"success": False, "message": "Cannot delete vehicle because it is referenced in other records (e.g., trips, maintenance logs)."}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to delete vehicle"}), 500
