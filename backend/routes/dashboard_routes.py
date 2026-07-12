from flask import Blueprint, jsonify
from sqlalchemy import func
from backend.database import db
from backend.database.models import Vehicle, Driver, Trip
from backend.middleware.auth import authenticate, authorize

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@authenticate()
def get_dashboard_stats():
    try:
        # Vehicles
        total_vehicles = db.session.query(func.count(Vehicle.id)).filter(Vehicle.status != 'Retired').scalar() or 0
        available_vehicles = db.session.query(func.count(Vehicle.id)).filter(Vehicle.status == 'Available').scalar() or 0
        maintenance_vehicles = db.session.query(func.count(Vehicle.id)).filter(Vehicle.status == 'In Shop').scalar() or 0
        on_trip_vehicles = db.session.query(func.count(Vehicle.id)).filter(Vehicle.status == 'On Trip').scalar() or 0

        # Trips
        active_trips = db.session.query(func.count(Trip.id)).filter(Trip.status == 'Dispatched').scalar() or 0
        pending_trips = db.session.query(func.count(Trip.id)).filter(Trip.status == 'Draft').scalar() or 0

        # Drivers
        drivers_on_duty = db.session.query(func.count(Driver.id)).filter(
            Driver.status.in_(['Available', 'On Trip'])
        ).scalar() or 0

        # Fleet Utilization %
        fleet_utilization = 0
        if total_vehicles > 0:
            fleet_utilization = round((on_trip_vehicles / total_vehicles) * 100)

        return jsonify({
            "activeVehicles": total_vehicles,
            "availableVehicles": available_vehicles,
            "maintenanceVehicles": maintenance_vehicles,
            "activeTrips": active_trips,
            "pendingTrips": pending_trips,
            "driversOnDuty": drivers_on_duty,
            "fleetUtilization": fleet_utilization
        }), 200

    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        return jsonify({"error": "Failed to fetch dashboard statistics"}), 500

@dashboard_bp.route('/recent-trips', methods=['GET'])
@authenticate()
def get_recent_trips():
    try:
        # Fetch top 5 recent trips, order by id desc (or created_at)
        recent_trips_query = db.session.query(Trip).order_by(Trip.id.desc()).limit(5).all()
        
        recent_trips = []
        for trip in recent_trips_query:
            vehicle_reg = trip.vehicle.registration_number if trip.vehicle else '—'
            driver_name = trip.driver.full_name if trip.driver else '—'
            
            # Simple ETA mock logic since we don't have ETA field in DB. 
            # In a real app this would be calculated from dispatch_time and distance.
            eta = '—'
            if trip.status == 'Dispatched':
                eta = 'In Progress'
            elif trip.status == 'Draft':
                eta = 'Awaiting vehicle'
            
            # Status class mapped for frontend CSS
            status_class_map = {
                'Draft': 'draft',
                'Dispatched': 'dispatched',
                'Completed': 'completed',
                'Cancelled': 'draft' # Map cancelled to grey badge
            }

            recent_trips.append({
                "id": trip.trip_number,
                "vehicle": vehicle_reg,
                "driver": driver_name,
                "status": trip.status,
                "eta": eta,
                "statusClass": status_class_map.get(trip.status, 'draft')
            })

        return jsonify(recent_trips), 200

    except Exception as e:
        print(f"Error fetching recent trips: {e}")
        return jsonify({"error": "Failed to fetch recent trips"}), 500
