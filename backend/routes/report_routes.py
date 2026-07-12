from flask import Blueprint, jsonify
from sqlalchemy import text
from backend.database import db
from backend.models.maintenance import MaintenanceLog
from backend.models.fuel import FuelLog
from backend.models.expense import Expense

report_bp = Blueprint('reports', __name__, url_prefix='/reports')

# GET /reports/dashboard
@report_bp.route('/dashboard', methods=['GET'])
def get_dashboard_summary():
    try:
        # TODO: Once Vehicle ORM model is implemented, query the actual total vehicles count:
        # total_vehicles = Vehicle.query.count()
        total_vehicles_placeholder = 0 
        
        # TODO: Once Trip ORM model is implemented, query the actual active trips count:
        # active_trips = Trip.query.filter(Trip.status == 'Dispatched').count()
        active_trips_placeholder = 0
        
        # Calculate vehicles in shop (unique vehicle IDs with "Open" maintenance logs)
        vehicles_in_shop = db.session.query(
            db.func.count(db.distinct(MaintenanceLog.vehicle_id))
        ).filter(MaintenanceLog.status == 'Open').scalar() or 0
        
        # Calculate total fuel cost
        total_fuel_cost = db.session.query(db.func.sum(FuelLog.fuel_cost)).scalar() or 0
        
        # Calculate total maintenance cost
        total_maintenance_cost = db.session.query(db.func.sum(MaintenanceLog.maintenance_cost)).scalar() or 0
        
        # Calculate total other expenses (excluding 'Fuel' and 'Maintenance' types to avoid double-counting)
        total_other_expenses = db.session.query(
            db.func.sum(Expense.amount)
        ).filter(Expense.expense_type.notin_(['Fuel', 'Maintenance'])).scalar() or 0
        
        # Calculate total operational cost (sum of fuel, maintenance, and other expenses)
        total_operational_cost = float(total_fuel_cost) + float(total_maintenance_cost) + float(total_other_expenses)
        
        return jsonify({
            "total_vehicles": total_vehicles_placeholder,
            "active_trips": active_trips_placeholder,
            "vehicles_in_shop": vehicles_in_shop,
            "total_fuel_cost": float(total_fuel_cost),
            "total_maintenance_cost": float(total_maintenance_cost),
            "total_other_expenses": float(total_other_expenses),
            "total_operational_cost": total_operational_cost,
            "_notes": {
                "total_vehicles": "Pending Vehicle ORM implementation",
                "active_trips": "Pending Trip ORM implementation"
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to generate dashboard summary", "details": str(e)}), 500


# GET /reports/fuel-efficiency
@report_bp.route('/fuel-efficiency', methods=['GET'])
def get_fuel_efficiency():
    try:
        # TODO: Once Vehicle ORM and Trip ORM models are available, define proper models and relationships.
        # Below uses a raw SQL query to join fuel_logs, trips, and optionally vehicles.
        query = text("""
            SELECT 
                f.vehicle_id, 
                v.registration_number,
                SUM(t.actual_distance) AS total_distance,
                SUM(f.liters) AS total_fuel
            FROM fuel_logs f
            INNER JOIN trips t ON f.trip_id = t.id
            LEFT JOIN vehicles v ON f.vehicle_id = v.id
            GROUP BY f.vehicle_id, v.registration_number
            HAVING SUM(f.liters) > 0
        """)
        
        results = db.session.execute(query).fetchall()
        
        report_data = []
        for row in results:
            vehicle_id = row[0]
            registration_number = row[1]
            total_distance = float(row[2]) if row[2] is not None else 0.0
            total_fuel = float(row[3]) if row[3] is not None else 0.0
            
            fuel_efficiency = total_distance / total_fuel if total_fuel > 0 else 0.0
            
            record = {
                "vehicle_id": vehicle_id,
                "total_distance": total_distance,
                "total_fuel": total_fuel,
                "fuel_efficiency": fuel_efficiency
            }
            if registration_number is not None:
                record["registration_number"] = registration_number
                
            report_data.append(record)
            
        return jsonify(report_data), 200
        
    except Exception as e:
        # Fallback in case raw SQL tables are empty/missing, returning an empty list
        return jsonify({"error": "Failed to calculate fuel efficiency", "details": str(e)}), 500


# GET /reports/fleet-utilization
@report_bp.route('/fleet-utilization', methods=['GET'])
def get_fleet_utilization():
    # TODO: This calculation requires the Vehicle ORM model.
    # Once the Vehicle model is available, fleet utilization is calculated as:
    # utilization = (Vehicle.query.filter(Vehicle.status == 'On Trip').count() / Vehicle.query.count()) * 100
    return jsonify({
        "message": "Vehicle integration is pending. Complete calculation once Vehicle ORM is available.",
        "fleet_utilization": None,
        "status": "pending_integration",
        "_todo": "utilization = (vehicles_on_trip / total_vehicles) * 100"
    }), 200


# GET /reports/vehicle-roi
@report_bp.route('/vehicle-roi', methods=['GET'])
def get_vehicle_roi():
    # TODO: Once Vehicle and Trip ORM models are available, query revenue from completed trips
    # and acquisition cost from vehicles to compute ROI for each vehicle:
    # ROI = (Revenue - (MaintenanceCost + FuelCost)) / AcquisitionCost
    return jsonify({
        "message": "Vehicle ROI calculations are pending Vehicle and Trip ORM models availability.",
        "roi_records": [],
        "status": "pending_integration",
        "_todo": "ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost"
    }), 200


# GET /reports/operational-cost
@report_bp.route('/operational-cost', methods=['GET'])
def get_operational_cost():
    try:
        # Calculate total fuel cost
        fuel_cost = db.session.query(db.func.sum(FuelLog.fuel_cost)).scalar() or 0
        
        # Calculate total maintenance cost
        maintenance_cost = db.session.query(db.func.sum(MaintenanceLog.maintenance_cost)).scalar() or 0
        
        # Calculate total other expenses (excluding 'Fuel' and 'Maintenance' types)
        other_expenses = db.session.query(
            db.func.sum(Expense.amount)
        ).filter(Expense.expense_type.notin_(['Fuel', 'Maintenance'])).scalar() or 0
        
        # Calculate grand total
        grand_total = float(fuel_cost) + float(maintenance_cost) + float(other_expenses)
        
        return jsonify({
            "fuel_cost": float(fuel_cost),
            "maintenance_cost": float(maintenance_cost),
            "other_expenses": float(other_expenses),
            "grand_total": grand_total
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to calculate operational costs", "details": str(e)}), 500
