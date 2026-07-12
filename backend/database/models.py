from datetime import datetime
from backend.database import db

class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    role_name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    role = db.relationship('Role', backref=db.backref('users', lazy=True))

class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    registration_number = db.Column(db.String(30), nullable=False, unique=True)
    vehicle_name = db.Column(db.String(100), nullable=False)
    vehicle_model = db.Column(db.String(100))
    vehicle_type = db.Column(db.Enum('Truck', 'Mini Truck', 'Van', 'Pickup', 'Bike', 'Trailer', 'Container', name='vehicle_type_enum'), nullable=False)
    max_load_capacity = db.Column(db.Numeric(10, 2), nullable=False)
    odometer = db.Column(db.Numeric(12, 2), default=0)
    acquisition_cost = db.Column(db.Numeric(12, 2), nullable=False)
    acquisition_date = db.Column(db.Date)
    status = db.Column(db.Enum('Available', 'On Trip', 'In Shop', 'Retired', name='vehicle_status_enum'), default='Available')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Driver(db.Model):
    __tablename__ = 'drivers'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(120), nullable=False)
    license_number = db.Column(db.String(100), nullable=False, unique=True)
    license_category = db.Column(db.String(20))
    license_expiry = db.Column(db.Date, nullable=False)
    contact_number = db.Column(db.String(20))
    safety_score = db.Column(db.Numeric(5, 2), default=100)
    joining_date = db.Column(db.Date)
    status = db.Column(db.Enum('Available', 'On Trip', 'Off Duty', 'Suspended', name='driver_status_enum'), default='Available')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Trip(db.Model):
    __tablename__ = 'trips'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    trip_number = db.Column(db.String(30), nullable=False, unique=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    source_location = db.Column(db.String(150), nullable=False)
    destination_location = db.Column(db.String(150), nullable=False)
    cargo_weight = db.Column(db.Numeric(10, 2), nullable=False)
    planned_distance = db.Column(db.Numeric(10, 2))
    actual_distance = db.Column(db.Numeric(10, 2))
    start_odometer = db.Column(db.Numeric(12, 2))
    end_odometer = db.Column(db.Numeric(12, 2))
    revenue = db.Column(db.Numeric(12, 2), default=0)
    status = db.Column(db.Enum('Draft', 'Dispatched', 'Completed', 'Cancelled', name='trip_status_enum'), default='Draft')
    dispatch_time = db.Column(db.DateTime)
    completion_time = db.Column(db.DateTime)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', backref=db.backref('trips', lazy=True))
    driver = db.relationship('Driver', backref=db.backref('trips', lazy=True))
    creator = db.relationship('User', backref=db.backref('created_trips', lazy=True))

class MaintenanceLog(db.Model):
    __tablename__ = 'maintenance_logs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    maintenance_type = db.Column(db.String(100))
    description = db.Column(db.Text)
    workshop = db.Column(db.String(100))
    maintenance_cost = db.Column(db.Numeric(12, 2))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    status = db.Column(db.Enum('Open', 'Completed', name='maintenance_status_enum'), default='Open')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', backref=db.backref('maintenance_logs', lazy=True))

class FuelLog(db.Model):
    __tablename__ = 'fuel_logs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'))
    liters = db.Column(db.Numeric(10, 2), nullable=False)
    fuel_cost = db.Column(db.Numeric(12, 2), nullable=False)
    fuel_date = db.Column(db.Date, nullable=False)
    odometer = db.Column(db.Numeric(12, 2))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', backref=db.backref('fuel_logs', lazy=True))
    trip = db.relationship('Trip', backref=db.backref('fuel_logs', lazy=True))

class Expense(db.Model):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'))
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'))
    expense_type = db.Column(db.Enum('Fuel', 'Maintenance', 'Toll', 'Repair', 'Insurance', 'Other', name='expense_type_enum'), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    description = db.Column(db.Text)
    expense_date = db.Column(db.Date, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', backref=db.backref('expenses', lazy=True))
    trip = db.relationship('Trip', backref=db.backref('expenses', lazy=True))
