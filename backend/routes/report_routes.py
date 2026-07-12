import csv
import io
from flask import Blueprint, jsonify, Response
from sqlalchemy import text
from backend.database import db
from backend.database.models import MaintenanceLog, FuelLog, Expense
from backend.middleware.auth import authenticate, authorize

report_bp = Blueprint('reports', __name__, url_prefix='/reports')

def generate_csv_response(headers, rows, filename):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    
    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = f'attachment; filename={filename}'
    return response

# GET /reports/dashboard
@report_bp.route('/dashboard', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
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
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
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
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
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
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
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
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
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


# GET /reports/export/maintenance - Export all maintenance records as a CSV file
@report_bp.route('/export/maintenance', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
def export_maintenance_csv():
    try:
        logs = MaintenanceLog.query.order_by(MaintenanceLog.id).all()
        rows = []
        for log in logs:
            rows.append([
                log.id,
                log.vehicle_id,
                log.maintenance_type or '',
                log.workshop or '',
                log.description or '',
                float(log.maintenance_cost) if log.maintenance_cost is not None else '',
                log.start_date.isoformat() if log.start_date else '',
                log.end_date.isoformat() if log.end_date else '',
                log.status
            ])
        headers = [
            'Maintenance ID', 'Vehicle ID', 'Maintenance Type', 'Workshop', 
            'Description', 'Maintenance Cost', 'Start Date', 'End Date', 'Status'
        ]
        return generate_csv_response(headers, rows, 'maintenance_records.csv')
    except Exception as e:
        return jsonify({"error": "Failed to export maintenance CSV", "details": str(e)}), 500


# GET /reports/export/fuel - Export all fuel log records as a CSV file
@report_bp.route('/export/fuel', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
def export_fuel_csv():
    try:
        logs = FuelLog.query.order_by(FuelLog.id).all()
        rows = []
        for log in logs:
            rows.append([
                log.id,
                log.vehicle_id,
                log.trip_id if log.trip_id is not None else '',
                float(log.liters) if log.liters is not None else '',
                float(log.fuel_cost) if log.fuel_cost is not None else '',
                log.fuel_date.isoformat() if log.fuel_date else '',
                float(log.odometer) if log.odometer is not None else ''
            ])
        headers = [
            'Fuel Log ID', 'Vehicle ID', 'Trip ID', 'Liters', 'Fuel Cost', 
            'Fuel Date', 'Odometer'
        ]
        return generate_csv_response(headers, rows, 'fuel_logs.csv')
    except Exception as e:
        return jsonify({"error": "Failed to export fuel CSV", "details": str(e)}), 500


# GET /reports/export/expenses - Export all expense records as a CSV file
@report_bp.route('/export/expenses', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
def export_expenses_csv():
    try:
        expenses = Expense.query.order_by(Expense.id).all()
        rows = []
        for exp in expenses:
            rows.append([
                exp.id,
                exp.expense_type,
                float(exp.amount) if exp.amount is not None else '',
                exp.description or '',
                exp.expense_date.isoformat() if exp.expense_date else '',
                exp.vehicle_id if exp.vehicle_id is not None else '',
                exp.trip_id if exp.trip_id is not None else ''
            ])
        headers = [
            'Expense ID', 'Expense Type', 'Amount', 'Description', 
            'Expense Date', 'Vehicle ID', 'Trip ID'
        ]
        return generate_csv_response(headers, rows, 'expense_records.csv')
    except Exception as e:
        return jsonify({"error": "Failed to export expense CSV", "details": str(e)}), 500


# GET /reports/export/operational-cost - Export operational cost summary as a CSV file
@report_bp.route('/export/operational-cost', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
def export_operational_cost_csv():
    try:
        fuel_cost = db.session.query(db.func.sum(FuelLog.fuel_cost)).scalar() or 0
        maintenance_cost = db.session.query(db.func.sum(MaintenanceLog.maintenance_cost)).scalar() or 0
        other_expenses = db.session.query(
            db.func.sum(Expense.amount)
        ).filter(Expense.expense_type.notin_(['Fuel', 'Maintenance'])).scalar() or 0
        grand_total = float(fuel_cost) + float(maintenance_cost) + float(other_expenses)
        
        rows = [[
            float(fuel_cost),
            float(maintenance_cost),
            float(other_expenses),
            grand_total
        ]]
        headers = ['Fuel Cost', 'Maintenance Cost', 'Other Expenses', 'Grand Total']
        return generate_csv_response(headers, rows, 'operational_cost_summary.csv')
    except Exception as e:
        return jsonify({"error": "Failed to export operational cost CSV", "details": str(e)}), 500

