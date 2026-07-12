import csv
import io
from flask import Blueprint, jsonify, Response
from sqlalchemy import text
from backend.database import db
from backend.database.models import MaintenanceLog, FuelLog, Expense, Vehicle, Trip
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
        # Get actual total vehicles count
        total_vehicles = Vehicle.query.filter(Vehicle.status != 'Retired').count()
        
        # Get actual active trips count
        active_trips = Trip.query.filter(Trip.status == 'Dispatched').count()
        
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
            "total_vehicles": total_vehicles,
            "active_trips": active_trips,
            "vehicles_in_shop": vehicles_in_shop,
            "total_fuel_cost": float(total_fuel_cost),
            "total_maintenance_cost": float(total_maintenance_cost),
            "total_other_expenses": float(total_other_expenses),
            "total_operational_cost": total_operational_cost
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
    try:
        total_vehicles = Vehicle.query.filter(Vehicle.status != 'Retired').count()
        vehicles_on_trip = Vehicle.query.filter(Vehicle.status == 'On Trip').count()
        
        utilization = 0
        if total_vehicles > 0:
            utilization = (vehicles_on_trip / total_vehicles) * 100
            
        return jsonify({
            "fleet_utilization": round(utilization, 2),
            "total_vehicles": total_vehicles,
            "vehicles_on_trip": vehicles_on_trip,
            "status": "success"
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to calculate fleet utilization", "details": str(e)}), 500


# GET /reports/vehicle-roi
@report_bp.route('/vehicle-roi', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Financial Analyst'])
def get_vehicle_roi():
    try:
        vehicles = Vehicle.query.filter(Vehicle.status != 'Retired').all()
        roi_records = []
        
        for v in vehicles:
            total_revenue = db.session.query(db.func.sum(Trip.revenue)).filter(Trip.vehicle_id == v.id, Trip.status == 'Completed').scalar() or 0
            total_maintenance = db.session.query(db.func.sum(MaintenanceLog.maintenance_cost)).filter(MaintenanceLog.vehicle_id == v.id).scalar() or 0
            total_fuel = db.session.query(db.func.sum(FuelLog.fuel_cost)).filter(FuelLog.vehicle_id == v.id).scalar() or 0
            
            acquisition_cost = float(v.acquisition_cost) if v.acquisition_cost else 0.0
            
            roi = 0
            if acquisition_cost > 0:
                roi = (float(total_revenue) - (float(total_maintenance) + float(total_fuel))) / acquisition_cost
                roi = round(roi * 100, 2)
                
            roi_records.append({
                "vehicle_id": v.id,
                "registration_number": v.registration_number,
                "total_revenue": float(total_revenue),
                "total_maintenance": float(total_maintenance),
                "total_fuel": float(total_fuel),
                "acquisition_cost": acquisition_cost,
                "roi_percentage": roi
            })
            
        # Sort by ROI descending
        roi_records.sort(key=lambda x: x['roi_percentage'], reverse=True)
            
        return jsonify({
            "roi_records": roi_records,
            "status": "success"
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to calculate vehicle ROI", "details": str(e)}), 500


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

