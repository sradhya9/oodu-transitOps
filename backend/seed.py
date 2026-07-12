import sys
import os
import random
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import create_app
from backend.database.models import db, Vehicle, Driver, Trip, User, Role, MaintenanceLog, FuelLog, Expense

app = create_app()

def generate_mock_data():
    with app.app_context():
        # Clear existing data
        print("Clearing existing data...")
        db.drop_all()
        db.create_all()

        print("Creating Roles...")
        roles = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst']
        role_objs = {}
        for r_name in roles:
            role = Role(role_name=r_name)
            db.session.add(role)
            db.session.commit()
            role_objs[r_name] = role

        print("Creating Users...")
        users = []
        # Create 3 users for each role
        user_data = [
            ('Fleet Manager', ['Alex Fleet', 'Jordan Manager', 'Taylor Boss']),
            ('Dispatcher', ['Sam Dispatch', 'Riley Route', 'Casey Hub']),
            ('Safety Officer', ['Morgan Safe', 'Jamie Secure', 'Drew Inspect']),
            ('Financial Analyst', ['Charlie Finance', 'Avery Money', 'Quinn Ledger']),
        ]

        for role_name, names in user_data:
            for idx, name in enumerate(names):
                email = f"{name.split()[0].lower()}{idx+1}@transitops.com"
                user = User(
                    full_name=name,
                    email=email,
                    role_id=role_objs[role_name].id
                )
                user.set_password('password123')
                db.session.add(user)
                users.append(user)
        
        # Add the main admin for backward compatibility
        admin = User(full_name='Admin Fleet', email='admin@transitops.com', role_id=role_objs['Fleet Manager'].id)
        admin.set_password('password123')
        db.session.add(admin)
        users.append(admin)
        
        db.session.commit()

        print("Creating Vehicles...")
        vehicles = []
        vehicle_types = ['Truck', 'Mini Truck', 'Van', 'Pickup', 'Trailer']
        statuses = ['Available', 'On Trip', 'In Shop']
        for i in range(1, 21):
            v = Vehicle(
                registration_number=f"TR-{1000+i}",
                vehicle_name=f"Fleet {random.choice(['Volvo', 'Ford', 'Mercedes', 'Scania'])} V{i}",
                vehicle_type=random.choice(vehicle_types),
                max_load_capacity=random.uniform(2000, 25000),
                odometer=random.uniform(5000, 150000),
                acquisition_cost=random.uniform(30000, 150000),
                acquisition_date=date.today() - timedelta(days=random.randint(100, 1500)),
                status=random.choice(statuses)
            )
            db.session.add(v)
            vehicles.append(v)
        db.session.commit()

        print("Creating Drivers...")
        drivers = []
        driver_statuses = ['Available', 'On Trip', 'Off Duty']
        for i in range(1, 21):
            d = Driver(
                full_name=f"Driver {i}",
                license_number=f"DL-{50000+i}",
                license_category=random.choice(['Class A', 'Class B', 'Class C']),
                license_expiry=date.today() + timedelta(days=random.randint(100, 1500)),
                contact_number=f"555-01{i:02d}",
                safety_score=random.uniform(75, 100),
                joining_date=date.today() - timedelta(days=random.randint(50, 1000)),
                status=random.choice(driver_statuses)
            )
            db.session.add(d)
            drivers.append(d)
        db.session.commit()

        print("Creating Trips, Maintenance, Fuel, and Expenses...")
        fm_users = [u for u in users if u.role_id == role_objs['Fleet Manager'].id]
        dispatch_users = [u for u in users if u.role_id == role_objs['Dispatcher'].id]
        
        for i in range(1, 41):
            # Trips
            v = random.choice(vehicles)
            d = random.choice(drivers)
            creator = random.choice(dispatch_users)
            
            planned_dist = random.uniform(50, 800)
            status = random.choice(['Completed', 'Dispatched', 'Draft'])
            
            trip = Trip(
                trip_number=f"TRP-2026-{i:03d}",
                vehicle_id=v.id,
                driver_id=d.id,
                source_location=random.choice(['New York, NY', 'Boston, MA', 'Chicago, IL', 'Miami, FL']),
                destination_location=random.choice(['Philadelphia, PA', 'Washington, DC', 'Atlanta, GA', 'Dallas, TX']),
                cargo_weight=random.uniform(1000, float(v.max_load_capacity)),
                planned_distance=planned_dist,
                actual_distance=planned_dist * random.uniform(0.9, 1.1) if status == 'Completed' else None,
                revenue=random.uniform(500, 5000) if status == 'Completed' else 0,
                status=status,
                created_by=creator.id
            )
            db.session.add(trip)
            db.session.flush() # get trip id
            
            # Maintenance
            if random.random() > 0.6:
                m_cost = random.uniform(200, 2000)
                m = MaintenanceLog(
                    vehicle_id=v.id,
                    maintenance_type=random.choice(['Oil Change', 'Tire Replacement', 'Engine Tune-up', 'Brake Inspection']),
                    description=f"Routine maintenance for vehicle {v.registration_number}",
                    workshop="Main Depot Workshop",
                    maintenance_cost=m_cost,
                    start_date=date.today() - timedelta(days=random.randint(1, 60)),
                    end_date=date.today() - timedelta(days=random.randint(0, 10)),
                    status='Completed',
                    created_by=random.choice(fm_users).id
                )
                db.session.add(m)
                
                # Expense for maintenance
                e = Expense(
                    vehicle_id=v.id,
                    expense_type='Maintenance',
                    amount=m_cost,
                    description="Maintenance cost",
                    expense_date=m.start_date,
                    created_by=random.choice(fm_users).id
                )
                db.session.add(e)

            # Fuel Log
            if status == 'Completed' or status == 'Dispatched':
                liters = random.uniform(50, 300)
                fuel_cost = liters * 1.5 # 1.5 per liter
                f = FuelLog(
                    vehicle_id=v.id,
                    trip_id=trip.id,
                    liters=liters,
                    fuel_cost=fuel_cost,
                    fuel_date=date.today() - timedelta(days=random.randint(1, 30)),
                    odometer=float(v.odometer) + float(planned_dist) * random.random(),
                    created_by=creator.id
                )
                db.session.add(f)
                
                # Expense for fuel
                e_fuel = Expense(
                    vehicle_id=v.id,
                    trip_id=trip.id,
                    expense_type='Fuel',
                    amount=fuel_cost,
                    description="Fuel cost for trip",
                    expense_date=f.fuel_date,
                    created_by=creator.id
                )
                db.session.add(e_fuel)
                
        db.session.commit()
        print("Database seeding completed successfully!")
        print("\n--- TEST CREDENTIALS ---")
        print("All passwords are: password123")
        print("Admins/Fleet Managers:")
        for u in [u for u in users if u.role_id == role_objs['Fleet Manager'].id]:
            print(f" - {u.email}")
        print("Dispatchers:")
        for u in [u for u in users if u.role_id == role_objs['Dispatcher'].id]:
            print(f" - {u.email}")
        print("Safety Officers:")
        for u in [u for u in users if u.role_id == role_objs['Safety Officer'].id]:
            print(f" - {u.email}")
        print("Financial Analysts:")
        for u in [u for u in users if u.role_id == role_objs['Financial Analyst'].id]:
            print(f" - {u.email}")

if __name__ == '__main__':
    generate_mock_data()
