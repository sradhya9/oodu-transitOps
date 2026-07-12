from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import or_, desc, asc
from backend.database.models import db, Trip, Vehicle, Driver, FuelLog
from backend.middleware.auth import authenticate, authorize

trip_bp = Blueprint('trip', __name__, url_prefix='/api/trips')

@trip_bp.route('', methods=['GET'])
@authenticate()
@authorize(roles=['Dispatcher', 'Safety Officer'])
def get_trips():
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        vehicle_id = request.args.get('vehicle_id', '')
        driver_id = request.args.get('driver_id', '')
        
        sort_by = request.args.get('sort_by', 'created_at')
        sort_dir = request.args.get('sort_dir', 'desc')
        
        query = Trip.query.join(Vehicle).join(Driver)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Trip.trip_number.ilike(search_term),
                    Trip.source_location.ilike(search_term),
                    Trip.destination_location.ilike(search_term),
                    Vehicle.registration_number.ilike(search_term),
                    Driver.full_name.ilike(search_term)
                )
            )
            
        if status:
            query = query.filter(Trip.status == status)
        if vehicle_id:
            query = query.filter(Trip.vehicle_id == vehicle_id)
        if driver_id:
            query = query.filter(Trip.driver_id == driver_id)
            
        # Sorting
        if sort_by == 'vehicle':
            column = Vehicle.registration_number
        elif sort_by == 'driver':
            column = Driver.full_name
        elif hasattr(Trip, sort_by):
            column = getattr(Trip, sort_by)
        else:
            column = Trip.created_at
            
        if sort_dir.lower() == 'asc':
            query = query.order_by(asc(column))
        else:
            query = query.order_by(desc(column))
            
        paginated = query.paginate(page=page, per_page=limit, error_out=False)
        
        # Summary calculations
        total = Trip.query.count()
        draft = Trip.query.filter_by(status='Draft').count()
        active = Trip.query.filter_by(status='Dispatched').count()
        completed = Trip.query.filter_by(status='Completed').count()
        cancelled = Trip.query.filter_by(status='Cancelled').count()
        
        trips_list = [{
            'id': t.id,
            'trip_number': t.trip_number,
            'vehicle_id': t.vehicle_id,
            'vehicle_registration': t.vehicle.registration_number if t.vehicle else None,
            'driver_id': t.driver_id,
            'driver_name': t.driver.full_name if t.driver else None,
            'source_location': t.source_location,
            'destination_location': t.destination_location,
            'cargo_weight': float(t.cargo_weight),
            'planned_distance': float(t.planned_distance) if t.planned_distance else None,
            'status': t.status,
            'dispatch_time': t.dispatch_time.isoformat() if t.dispatch_time else None,
            'completion_time': t.completion_time.isoformat() if t.completion_time else None,
            'created_at': t.created_at.isoformat() if t.created_at else None
        } for t in paginated.items]
        
        return jsonify({
            'success': True,
            'data': trips_list,
            'meta': {
                'total_records': paginated.total,
                'total_pages': paginated.pages,
                'current_page': paginated.page,
                'limit': paginated.per_page
            },
            'summary': {
                'total': total,
                'draft': draft,
                'active': active,
                'completed': completed,
                'cancelled': cancelled
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@trip_bp.route('/<int:id>', methods=['GET'])
@authenticate()
@authorize(roles=['Dispatcher', 'Safety Officer'])
def get_trip(id):
    try:
        t = Trip.query.get(id)
        if not t:
            return jsonify({'success': False, 'message': 'Trip not found'}), 404
            
        data = {
            'id': t.id,
            'trip_number': t.trip_number,
            'vehicle_id': t.vehicle_id,
            'driver_id': t.driver_id,
            'source_location': t.source_location,
            'destination_location': t.destination_location,
            'cargo_weight': float(t.cargo_weight),
            'planned_distance': float(t.planned_distance) if t.planned_distance else None,
            'actual_distance': float(t.actual_distance) if t.actual_distance else None,
            'start_odometer': float(t.start_odometer) if t.start_odometer else None,
            'end_odometer': float(t.end_odometer) if t.end_odometer else None,
            'revenue': float(t.revenue) if t.revenue else None,
            'status': t.status,
            'dispatch_time': t.dispatch_time.isoformat() if t.dispatch_time else None,
            'completion_time': t.completion_time.isoformat() if t.completion_time else None
        }
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@trip_bp.route('', methods=['POST'])
@authenticate()
@authorize(roles=['Dispatcher'])
def create_trip():
    try:
        data = request.json
        
        # Validations
        vehicle = Vehicle.query.get(data['vehicle_id'])
        driver = Driver.query.get(data['driver_id'])
        
        if not vehicle:
            return jsonify({'success': False, 'message': 'Vehicle not found'}), 400
        if not driver:
            return jsonify({'success': False, 'message': 'Driver not found'}), 400
            
        if vehicle.status != 'Available':
            return jsonify({'success': False, 'message': f'Vehicle is not available (Current Status: {vehicle.status})'}), 400
            
        if driver.status != 'Available':
            return jsonify({'success': False, 'message': f'Driver is not available (Current Status: {driver.status})'}), 400
            
        if driver.license_expiry and driver.license_expiry < datetime.utcnow().date():
            return jsonify({'success': False, 'message': 'Driver license has expired'}), 400
            
        cargo_weight = float(data['cargo_weight'])
        if cargo_weight > float(vehicle.max_load_capacity):
            return jsonify({'success': False, 'message': 'Cargo weight exceeds maximum vehicle capacity'}), 400
            
        # Generate Trip Number (TRP-YYYYMMDD-XXXX)
        count = Trip.query.count() + 1
        trip_num = f"TRP-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"
        
        new_trip = Trip(
            trip_number=trip_num,
            vehicle_id=vehicle.id,
            driver_id=driver.id,
            source_location=data['source_location'],
            destination_location=data['destination_location'],
            cargo_weight=cargo_weight,
            planned_distance=float(data.get('planned_distance') or 0),
            status='Draft'
        )
        
        db.session.add(new_trip)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Trip created successfully', 'id': new_trip.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@trip_bp.route('/<int:id>/dispatch', methods=['PUT'])
@authenticate()
@authorize(roles=['Dispatcher'])
def dispatch_trip(id):
    try:
        trip = Trip.query.get(id)
        if not trip:
            return jsonify({'success': False, 'message': 'Trip not found'}), 404
            
        if trip.status != 'Draft':
            return jsonify({'success': False, 'message': 'Only Draft trips can be dispatched'}), 400
            
        vehicle = Vehicle.query.get(trip.vehicle_id)
        driver = Driver.query.get(trip.driver_id)
        
        if vehicle.status != 'Available':
            return jsonify({'success': False, 'message': 'Vehicle is no longer available'}), 400
        if driver.status != 'Available':
            return jsonify({'success': False, 'message': 'Driver is no longer available'}), 400
            
        # Dispatch Transaction
        trip.status = 'Dispatched'
        trip.dispatch_time = datetime.utcnow()
        trip.start_odometer = vehicle.odometer
        
        vehicle.status = 'On Trip'
        driver.status = 'On Trip'
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Trip dispatched successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@trip_bp.route('/<int:id>/complete', methods=['PUT'])
@authenticate()
@authorize(roles=['Dispatcher'])
def complete_trip(id):
    try:
        trip = Trip.query.get(id)
        if not trip:
            return jsonify({'success': False, 'message': 'Trip not found'}), 404
            
        if trip.status != 'Dispatched':
            return jsonify({'success': False, 'message': 'Only Dispatched trips can be completed'}), 400
            
        data = request.json
        end_odometer = float(data.get('end_odometer') or 0)
        revenue = float(data.get('revenue') or 0)
        fuel_consumed = float(data.get('fuel_consumed') or 0)
        
        if trip.start_odometer and end_odometer < float(trip.start_odometer):
            return jsonify({'success': False, 'message': 'Invalid completion data: End odometer cannot be less than start odometer'}), 400
            
        trip.status = 'Completed'
        trip.completion_time = datetime.utcnow()
        trip.end_odometer = end_odometer
        trip.actual_distance = end_odometer - float(trip.start_odometer) if trip.start_odometer else 0
        trip.revenue = revenue
        
        vehicle = Vehicle.query.get(trip.vehicle_id)
        driver = Driver.query.get(trip.driver_id)
        
        if vehicle:
            vehicle.status = 'Available'
            vehicle.odometer = end_odometer
        if driver:
            driver.status = 'Available'
            
        # Create Fuel Log for consumed fuel
        if fuel_consumed > 0 and vehicle:
            fuel_log = FuelLog(
                vehicle_id=vehicle.id,
                trip_id=trip.id,
                liters=fuel_consumed,
                fuel_cost=data.get('fuel_cost', 0),
                fuel_date=datetime.utcnow().date(),
                odometer=end_odometer
            )
            db.session.add(fuel_log)
            
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Trip completed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@trip_bp.route('/<int:id>/cancel', methods=['PUT'])
@authenticate()
@authorize(roles=['Dispatcher'])
def cancel_trip(id):
    try:
        trip = Trip.query.get(id)
        if not trip:
            return jsonify({'success': False, 'message': 'Trip not found'}), 404
            
        if trip.status in ['Completed', 'Cancelled']:
            return jsonify({'success': False, 'message': 'Cannot cancel this trip'}), 400
            
        trip.status = 'Cancelled'
        
        vehicle = Vehicle.query.get(trip.vehicle_id)
        driver = Driver.query.get(trip.driver_id)
        
        if vehicle and vehicle.status == 'On Trip':
            vehicle.status = 'Available'
        if driver and driver.status == 'On Trip':
            driver.status = 'Available'
            
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Trip cancelled successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
