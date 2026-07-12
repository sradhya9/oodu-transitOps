import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import create_app
from backend.database.models import db, Vehicle, Driver, Trip, User, Role
from datetime import datetime, date

app = create_app()

with app.app_context():
    # Ensure all tables exist (important for the new PasswordResetRequest model)
    db.create_all()
    
    # Only seed if no vehicles exist
    if Vehicle.query.count() == 0:
        print("Seeding vehicles...")
        v1 = Vehicle(registration_number='NYC-1001', vehicle_name='Volvo FH16', vehicle_type='Truck', max_load_capacity=20000, odometer=15000, acquisition_cost=120000, status='Available', acquisition_date=date(2023, 1, 15))
        v2 = Vehicle(registration_number='NYC-1002', vehicle_name='Mercedes Actros', vehicle_type='Truck', max_load_capacity=22000, odometer=25000, acquisition_cost=135000, status='On Trip', acquisition_date=date(2023, 3, 10))
        v3 = Vehicle(registration_number='NYC-1003', vehicle_name='Ford Transit', vehicle_type='Van', max_load_capacity=5000, odometer=5000, acquisition_cost=45000, status='In Shop', acquisition_date=date(2024, 2, 5))
        db.session.add_all([v1, v2, v3])
        db.session.commit()

        print("Seeding drivers...")
        d1 = Driver(full_name='John Smith', license_number='DL-998877', license_category='Class A', license_expiry=date(2028, 5, 20), contact_number='555-0101', status='Available', joining_date=date(2022, 1, 10))
        d2 = Driver(full_name='Sarah Connor', license_number='DL-554433', license_category='Class A', license_expiry=date(2027, 8, 15), contact_number='555-0202', status='On Trip', joining_date=date(2021, 6, 1))
        d3 = Driver(full_name='Mike Tyson', license_number='DL-112233', license_category='Class B', license_expiry=date(2029, 1, 10), contact_number='555-0303', status='Off Duty', joining_date=date(2023, 11, 20))
        db.session.add_all([d1, d2, d3])
        db.session.commit()

        print("Seeding trips...")
        admin = User.query.filter_by(email='admin@transitops.com').first()
        admin_id = admin.id if admin else None

        t1 = Trip(trip_number='TRP-2026-001', vehicle_id=v2.id, driver_id=d2.id, source_location='New York, NY', destination_location='Boston, MA', cargo_weight=15000, planned_distance=215, status='Dispatched', created_by=admin_id)
        t2 = Trip(trip_number='TRP-2026-002', vehicle_id=v1.id, driver_id=d1.id, source_location='New York, NY', destination_location='Philadelphia, PA', cargo_weight=8000, planned_distance=95, status='Draft', created_by=admin_id)
        t3 = Trip(trip_number='TRP-2026-003', vehicle_id=v1.id, driver_id=d3.id, source_location='Newark, NJ', destination_location='Washington, DC', cargo_weight=12000, planned_distance=220, status='Completed', created_by=admin_id)
        db.session.add_all([t1, t2, t3])
        db.session.commit()
        
        print("Database seeded with sample vehicles and trips successfully!")
    else:
        print("Database already contains vehicle data. Vehicle seeding skipped.")
        
    print("Seeding users for all roles...")
    roles = {r.role_name: r for r in Role.query.all()}
    
    users_to_add = []
    if 'Dispatcher' in roles and not User.query.filter_by(email='dispatcher@transitops.com').first():
        u = User(full_name='Diana Dispatch', email='dispatcher@transitops.com', role_id=roles['Dispatcher'].id)
        u.set_password('password123')
        users_to_add.append(u)
        
    if 'Safety Officer' in roles and not User.query.filter_by(email='safety@transitops.com').first():
        u = User(full_name='Sam Safety', email='safety@transitops.com', role_id=roles['Safety Officer'].id)
        u.set_password('password123')
        users_to_add.append(u)
        
    if 'Financial Analyst' in roles and not User.query.filter_by(email='finance@transitops.com').first():
        u = User(full_name='Fiona Finance', email='finance@transitops.com', role_id=roles['Financial Analyst'].id)
        u.set_password('password123')
        users_to_add.append(u)
        
    if users_to_add:
        db.session.add_all(users_to_add)
        db.session.commit()
        print(f"Seeded {len(users_to_add)} new users successfully!")
    else:
        print("Users already seeded.")
