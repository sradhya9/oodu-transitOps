from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import or_, desc, asc
from sqlalchemy.exc import IntegrityError
from backend.database.models import db, Driver
from backend.middleware.auth import authenticate, authorize

driver_bp = Blueprint('driver', __name__, url_prefix='/api/drivers')

@driver_bp.route('', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Safety Officer', 'Dispatcher'])
def get_drivers():
    try:
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        # Search and Filter parameters
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        category = request.args.get('category', '')
        expiry = request.args.get('expiry', '')
        
        # Sorting parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_dir = request.args.get('sort_dir', 'desc')
        
        query = Driver.query
        
        # Apply search
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Driver.full_name.ilike(search_term),
                    Driver.license_number.ilike(search_term),
                    Driver.contact_number.ilike(search_term)
                )
            )
            
        # Apply filters
        if status:
            query = query.filter(Driver.status == status)
        if category:
            query = query.filter(Driver.license_category == category)
        if expiry:
            query = query.filter(Driver.license_expiry == expiry)
            
        # Apply sorting
        if hasattr(Driver, sort_by):
            column = getattr(Driver, sort_by)
            if sort_dir.lower() == 'asc':
                query = query.order_by(asc(column))
            else:
                query = query.order_by(desc(column))
        else:
            query = query.order_by(desc(Driver.created_at))
            
        # Execute pagination
        paginated = query.paginate(page=page, per_page=limit, error_out=False)
        
        # Calculate summary statistics
        total = Driver.query.count()
        available = Driver.query.filter_by(status='Available').count()
        on_trip = Driver.query.filter_by(status='On Trip').count()
        off_duty = Driver.query.filter_by(status='Off Duty').count()
        suspended = Driver.query.filter_by(status='Suspended').count()
        
        # Format response
        drivers_list = [{
            'id': d.id,
            'full_name': d.full_name,
            'license_number': d.license_number,
            'license_category': d.license_category,
            'license_expiry': d.license_expiry.isoformat() if d.license_expiry else None,
            'contact_number': d.contact_number,
            'safety_score': float(d.safety_score) if d.safety_score is not None else 100.0,
            'joining_date': d.joining_date.isoformat() if d.joining_date else None,
            'status': d.status,
            'created_at': d.created_at.isoformat() if d.created_at else None
        } for d in paginated.items]
        
        return jsonify({
            'success': True,
            'data': drivers_list,
            'meta': {
                'total_records': paginated.total,
                'total_pages': paginated.pages,
                'current_page': paginated.page,
                'limit': paginated.per_page
            },
            'summary': {
                'total': total,
                'available': available,
                'on_trip': on_trip,
                'off_duty': off_duty,
                'suspended': suspended
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@driver_bp.route('/available', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Safety Officer', 'Dispatcher'])
def get_available_drivers():
    try:
        # Filter: Status=Available, Not Suspended, License Valid
        today = datetime.utcnow().date()
        drivers = Driver.query.filter(
            Driver.status == 'Available',
            Driver.license_expiry >= today
        ).all()
        
        drivers_list = [{
            'id': d.id,
            'full_name': d.full_name,
            'license_number': d.license_number,
            'safety_score': float(d.safety_score) if d.safety_score is not None else 100.0
        } for d in drivers]
        
        return jsonify({'success': True, 'data': drivers_list}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@driver_bp.route('/<int:id>', methods=['GET'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Safety Officer'])
def get_driver(id):
    try:
        driver = Driver.query.get(id)
        if not driver:
            return jsonify({'success': False, 'message': 'Driver not found'}), 404
            
        data = {
            'id': driver.id,
            'full_name': driver.full_name,
            'license_number': driver.license_number,
            'license_category': driver.license_category,
            'license_expiry': driver.license_expiry.isoformat() if driver.license_expiry else None,
            'contact_number': driver.contact_number,
            'safety_score': float(driver.safety_score) if driver.safety_score is not None else 100.0,
            'joining_date': driver.joining_date.isoformat() if driver.joining_date else None,
            'status': driver.status
        }
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@driver_bp.route('', methods=['POST'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Safety Officer'])
def create_driver():
    try:
        data = request.json
        
        # Uniqueness check for license number
        existing = Driver.query.filter_by(license_number=data['license_number']).first()
        if existing:
            return jsonify({'success': False, 'message': 'License Number must be unique.'}), 400
            
        expiry_date = None
        if data.get('license_expiry'):
            expiry_date = datetime.strptime(data['license_expiry'], "%Y-%m-%d").date()
            if expiry_date < datetime.utcnow().date():
                return jsonify({'success': False, 'message': 'License Expiry Date cannot be a past date.'}), 400
                
        joining_date = None
        if data.get('joining_date'):
            joining_date = datetime.strptime(data['joining_date'], "%Y-%m-%d").date()
            
        safety_score = float(data.get('safety_score') or 100.0)
        status = data.get('status', 'Available')
        
        # Business rule: Automatically suspend drivers with low safety score
        if safety_score < 50:
            status = 'Suspended'
            
        new_driver = Driver(
            full_name=data['full_name'],
            license_number=data['license_number'],
            license_category=data.get('license_category'),
            license_expiry=expiry_date,
            contact_number=data.get('contact_number'),
            safety_score=safety_score,
            joining_date=joining_date,
            status=status
        )
        
        db.session.add(new_driver)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Driver created successfully', 'id': new_driver.id}), 201
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Database integrity error. Check unique fields.'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@driver_bp.route('/<int:id>', methods=['PUT'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Safety Officer'])
def update_driver(id):
    try:
        driver = Driver.query.get(id)
        if not driver:
            return jsonify({'success': False, 'message': 'Driver not found'}), 404
            
        data = request.json
        
        # Status specific validation
        if driver.status == 'On Trip' and data.get('status') != 'On Trip' and data.get('status') is not None:
             # Wait, typically we don't allow changing status manually if they are on trip unless system does it
             # But admin might need to override. We'll allow it but usually it's handled by Trip dispatch.
             pass
        
        driver.full_name = data.get('full_name', driver.full_name)
        driver.license_category = data.get('license_category', driver.license_category)
        driver.contact_number = data.get('contact_number', driver.contact_number)
        
        if 'safety_score' in data:
            driver.safety_score = float(data['safety_score'])
            
        if 'status' in data:
            driver.status = data['status']
            
        # Business rule: Automatically suspend drivers with low safety score
        if driver.safety_score is not None and driver.safety_score < 50:
            driver.status = 'Suspended'
            
        if 'license_expiry' in data:
            expiry_str = data['license_expiry']
            if expiry_str:
                driver.license_expiry = datetime.strptime(expiry_str, "%Y-%m-%d").date()
            else:
                driver.license_expiry = None
                
        if 'joining_date' in data:
            joining_str = data['joining_date']
            if joining_str:
                driver.joining_date = datetime.strptime(joining_str, "%Y-%m-%d").date()
            else:
                driver.joining_date = None
                
        # Status already handled above (including business rule override)
            
        # Note: license_number is NOT updated as per business rules
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Driver updated successfully'}), 200
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Database integrity error.'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@driver_bp.route('/<int:id>', methods=['DELETE'])
@authenticate()
@authorize(roles=['Fleet Manager', 'Safety Officer'])
def delete_driver(id):
    try:
        driver = Driver.query.get(id)
        if not driver:
            return jsonify({'success': False, 'message': 'Driver not found'}), 404
            
        # The database foreign keys (e.g. trips) will cause an IntegrityError if active trips exist
        db.session.delete(driver)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Driver deleted successfully'}), 200
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Cannot delete driver. Driver is assigned to existing trips.'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
