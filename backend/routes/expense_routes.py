from flask import Blueprint, request, jsonify, g
from datetime import datetime
from backend.database import db
from backend.database.models import Expense
from backend.middleware.auth import authenticate, authorize

expense_bp = Blueprint('expenses', __name__, url_prefix='/expenses')

VALID_EXPENSE_TYPES = {'Fuel', 'Maintenance', 'Toll', 'Repair', 'Insurance', 'Other'}

def serialize_expense(expense):
    return {
        "id": expense.id,
        "vehicle_id": expense.vehicle_id,
        "vehicle_reg_number": expense.vehicle.registration_number if expense.vehicle else None,
        "trip_id": expense.trip_id,
        "expense_type": expense.expense_type,
        "amount": float(expense.amount) if expense.amount is not None else None,
        "description": expense.description,
        "expense_date": expense.expense_date.isoformat() if expense.expense_date else None,
        "created_by": expense.created_by,
        "created_at": expense.created_at.isoformat() if expense.created_at else None
    }

def parse_date(date_str):
    if not date_str or not str(date_str).strip():
        return None
    try:
        return datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise ValueError("Invalid date format. Must be YYYY-MM-DD")

# GET /expenses - Return all expense records
@expense_bp.route('', methods=['GET'])
@authenticate()
@authorize(roles=['Financial Analyst', 'Driver'])
def get_all_expenses():
    try:
        user = g.current_user
        query = Expense.query
        if user.role.role_name == 'Driver':
            query = query.filter(Expense.created_by == user.id)
            
        logs = query.order_by(Expense.created_at.desc(), Expense.id.desc()).all()
        return jsonify([serialize_expense(log) for log in logs]), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch expenses", "details": str(e)}), 500

# GET /expenses/<id> - Return one expense record
@expense_bp.route('/<int:log_id>', methods=['GET'])
@authenticate()
@authorize(roles=['Financial Analyst'])
def get_expense(log_id):
    try:
        log = Expense.query.get(log_id)
        if not log:
            return jsonify({"error": f"Expense record with ID {log_id} not found"}), 404
        return jsonify(serialize_expense(log)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch the expense record", "details": str(e)}), 500

# POST /expenses - Create a new expense record
@expense_bp.route('', methods=['POST'])
@authenticate()
@authorize(roles=['Financial Analyst', 'Driver'])
def create_expense():
    data = request.get_json() or {}
    errors = {}
    
    expense_type = data.get('expense_type')
    amount = data.get('amount')
    expense_date_str = data.get('expense_date')
    vehicle_id = data.get('vehicle_id')
    trip_id = data.get('trip_id')
    description = data.get('description')
    created_by = data.get('created_by')
    
    # Validation: expense_type
    if not expense_type or not str(expense_type).strip():
        errors['expense_type'] = 'expense_type is required'
    elif expense_type not in VALID_EXPENSE_TYPES:
        errors['expense_type'] = f"expense_type must be one of: {', '.join(sorted(VALID_EXPENSE_TYPES))}"
        
    # Validation: amount
    if amount is None:
        errors['amount'] = 'amount is required'
    else:
        try:
            amount_val = float(amount)
            if amount_val < 0:
                errors['amount'] = 'amount cannot be negative'
            else:
                amount = amount_val
        except (ValueError, TypeError):
            errors['amount'] = 'amount must be a numeric value'
            
    # Validation: expense_date
    if not expense_date_str or not str(expense_date_str).strip():
        errors['expense_date'] = 'expense_date is required'
    else:
        try:
            expense_date = parse_date(expense_date_str)
        except ValueError as ve:
            errors['expense_date'] = str(ve)
            
    # Validation: vehicle_id
    if vehicle_id is not None:
        try:
            vehicle_id = int(vehicle_id)
        except (ValueError, TypeError):
            errors['vehicle_id'] = 'vehicle_id must be an integer'
            
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
        
        new_expense = Expense(
            expense_type=expense_type,
            amount=amount,
            expense_date=expense_date,
            vehicle_id=vehicle_id,
            trip_id=trip_id,
            description=description,
            created_by=created_by
        )
        
        db.session.add(new_expense)
        db.session.commit()
        return jsonify(serialize_expense(new_expense)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create expense record", "details": str(e)}), 500

# PUT /expenses/<id> - Update an existing expense record
@expense_bp.route('/<int:log_id>', methods=['PUT'])
@authenticate()
@authorize(roles=['Financial Analyst'])
def update_expense(log_id):
    try:
        log = Expense.query.get(log_id)
        if not log:
            return jsonify({"error": f"Expense record with ID {log_id} not found"}), 404
            
        data = request.get_json() or {}
        errors = {}
        
        expense_type = data.get('expense_type')
        amount = data.get('amount')
        expense_date_str = data.get('expense_date')
        vehicle_id = data.get('vehicle_id')
        trip_id = data.get('trip_id')
        
        if 'expense_type' in data:
            if not expense_type or not str(expense_type).strip():
                errors['expense_type'] = 'expense_type cannot be empty'
            elif expense_type not in VALID_EXPENSE_TYPES:
                errors['expense_type'] = f"expense_type must be one of: {', '.join(sorted(VALID_EXPENSE_TYPES))}"
                
        if 'amount' in data:
            if amount is None:
                errors['amount'] = 'amount cannot be empty'
            else:
                try:
                    amount_val = float(amount)
                    if amount_val < 0:
                        errors['amount'] = 'amount cannot be negative'
                    else:
                        amount = amount_val
                except (ValueError, TypeError):
                    errors['amount'] = 'amount must be a numeric value'
                    
        if 'expense_date' in data:
            if not expense_date_str or not str(expense_date_str).strip():
                errors['expense_date'] = 'expense_date cannot be empty'
            else:
                try:
                    expense_date = parse_date(expense_date_str)
                except ValueError as ve:
                    errors['expense_date'] = str(ve)
                    
        if 'vehicle_id' in data:
            if vehicle_id is not None:
                try:
                    vehicle_id = int(vehicle_id)
                except (ValueError, TypeError):
                    errors['vehicle_id'] = 'vehicle_id must be an integer'
            else:
                vehicle_id = None
                
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
        if 'expense_type' in data:
            log.expense_type = expense_type
        if 'amount' in data:
            log.amount = amount
        if 'expense_date' in data:
            log.expense_date = expense_date
        if 'vehicle_id' in data:
            # TODO: Validate that vehicle_id exists in vehicles table when Vehicle model is implemented
            log.vehicle_id = vehicle_id
        if 'trip_id' in data:
            # TODO: Validate that trip_id exists in trips table when Trip model is implemented
            log.trip_id = trip_id
        if 'description' in data:
            log.description = data.get('description')
            
        db.session.commit()
        return jsonify(serialize_expense(log)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update expense record", "details": str(e)}), 500

# DELETE /expenses/<id> - Delete an expense record
@expense_bp.route('/<int:log_id>', methods=['DELETE'])
@authenticate()
@authorize(roles=['Financial Analyst'])
def delete_expense(log_id):
    try:
        log = Expense.query.get(log_id)
        if not log:
            return jsonify({"error": f"Expense record with ID {log_id} not found"}), 404
            
        db.session.delete(log)
        db.session.commit()
        return jsonify({"message": "Expense record deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete expense record", "details": str(e)}), 500
