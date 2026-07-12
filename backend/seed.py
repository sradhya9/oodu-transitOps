import sys
import os
import random
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import create_app
from backend.database.models import db, Vehicle, Driver, Trip, User, Role, MaintenanceLog, FuelLog, Expense

app = create_app()

def generate_mock_data():
    with app.app_context():
        # Clear existing data
        print("Clearing existing data (dropping and recreating tables)...")
        db.drop_all()
        db.create_all()

        print("Creating Roles...")
        roles = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst', 'Driver']
        role_objs = {}
        for r_name in roles:
            role = Role(role_name=r_name)
            db.session.add(role)
            db.session.commit()
            role_objs[r_name] = role

        print("Creating Users & Staff...")
        users = []
        
        # Indian staff names
        staff_data = [
            ('Fleet Manager', ['Rajesh Sharma', 'Amitabh Kumar', 'Sanjay Gupta', 'Admin Singh']),
            ('Dispatcher', ['Vikram Patel', 'Arjun Desai', 'Neha Reddy']),
            ('Safety Officer', ['Priya Menon', 'Kavita Iyer', 'Ramesh Naidu']),
            ('Financial Analyst', ['Ravi Verma', 'Meera Joshi', 'Siddharth Bose']),
        ]

        for role_name, names in staff_data:
            for idx, name in enumerate(names):
                first_name = name.split()[0].lower()
                email = f"{first_name}{idx+1}@transitops.in" if first_name != "admin" else "admin@transitops.in"
                user = User(
                    full_name=name,
                    email=email,
                    role_id=role_objs[role_name].id
                )
                user.set_password('password123')
                db.session.add(user)
                users.append(user)
        
        db.session.commit()

        print("Creating Vehicles...")
        vehicles = []
        
        # Realistic Indian commercial vehicles
        vehicle_models = [
            {"model": "Tata Signa 4825.T", "type": "Truck", "capacity": 35000, "cost": 4500000},
            {"model": "Ashok Leyland 4220", "type": "Truck", "capacity": 30000, "cost": 4200000},
            {"model": "Tata LPT 1918", "type": "Truck", "capacity": 12500, "cost": 2600000},
            {"model": "Eicher Pro 3019", "type": "Truck", "capacity": 12000, "cost": 2400000},
            {"model": "Mahindra Bolero Maxi Truck Plus", "type": "Pickup", "capacity": 1200, "cost": 750000},
            {"model": "Tata Intra V30", "type": "Pickup", "capacity": 1300, "cost": 820000},
            {"model": "Ashok Leyland Dost+", "type": "Mini Truck", "capacity": 1500, "cost": 780000},
            {"model": "Tata Ace Gold", "type": "Mini Truck", "capacity": 750, "cost": 500000},
            {"model": "BharatBenz 1217C", "type": "Truck", "capacity": 7500, "cost": 1900000},
            {"model": "Tata Prima 5530.S", "type": "Trailer", "capacity": 40000, "cost": 5500000},
        ]
        
        statuses = ['Available', 'Available', 'Available', 'On Trip', 'On Trip', 'In Shop']
        
        for i in range(1, 26):
            v_model = random.choice(vehicle_models)
            v = Vehicle(
                registration_number=f"MH {random.randint(11, 49)} {random.choice(['AB','TR','CX','DZ'])} {random.randint(1000, 9999)}",
                vehicle_name=f"{v_model['model']} - Unit {i}",
                vehicle_type=v_model['type'],
                max_load_capacity=v_model['capacity'] * random.uniform(0.9, 1.1),
                odometer=random.uniform(10000, 250000),
                acquisition_cost=v_model['cost'] * random.uniform(0.8, 1.2),
                acquisition_date=date.today() - timedelta(days=random.randint(300, 1500)),
                status=random.choice(statuses)
            )
            db.session.add(v)
            vehicles.append(v)
        db.session.commit()

        print("Creating Drivers...")
        drivers = []
        driver_statuses = ['Available', 'Available', 'On Trip', 'Off Duty']
        driver_role = role_objs['Driver']
        
        driver_first_names = ["Karan", "Manish", "Sunil", "Rajiv", "Deepak", "Anil", "Suresh", "Manoj", "Ajay", "Vijay", "Mukesh", "Rakesh", "Ganesh", "Santosh", "Prakash", "Dinesh", "Naveen", "Ashok", "Sandeep", "Vinod", "Harish", "Pramod", "Nitin", "Yogesh", "Kamlesh"]
        driver_last_names = ["Singh", "Kumar", "Yadav", "Sharma", "Patel", "Mishra", "Chauhan", "Rajput", "Gupta", "Das"]

        for i in range(1, 26):
            full_name = f"{random.choice(driver_first_names)} {random.choice(driver_last_names)}"
            # Create a user for the driver
            driver_user = User(
                full_name=full_name,
                email=f"driver{i}@transitops.in",
                role_id=driver_role.id
            )
            driver_user.set_password('password123')
            db.session.add(driver_user)
            db.session.flush()
            users.append(driver_user)

            d = Driver(
                user_id=driver_user.id,
                full_name=full_name,
                license_number=f"DL-{random.randint(10, 99)}{random.randint(100000000, 999999999)}",
                license_category=random.choice(['HMV', 'LMV', 'TRANS']),
                license_expiry=date.today() + timedelta(days=random.randint(100, 1500)),
                contact_number=f"+91 {random.randint(70000, 99999)}{random.randint(10000, 99999)}",
                safety_score=random.uniform(70, 100),
                joining_date=date.today() - timedelta(days=random.randint(50, 1000)),
                status=random.choice(driver_statuses)
            )
            db.session.add(d)
            drivers.append(d)
        db.session.commit()

        print("Creating Trips, Maintenance, Fuel, and Expenses...")
        fm_users = [u for u in users if u.role_id == role_objs['Fleet Manager'].id]
        dispatch_users = [u for u in users if u.role_id == role_objs['Dispatcher'].id]
        
        cities = ['Mumbai, MH', 'Delhi, DL', 'Bengaluru, KA', 'Chennai, TN', 'Pune, MH', 'Hyderabad, TS', 'Ahmedabad, GJ', 'Kolkata, WB', 'Jaipur, RJ', 'Surat, GJ']
        
        for i in range(1, 61):
            # Trips
            v = random.choice(vehicles)
            d = random.choice(drivers)
            creator = random.choice(dispatch_users)
            
            source = random.choice(cities)
            dest = random.choice([c for c in cities if c != source])
            
            planned_dist = random.uniform(150, 1800) # km
            status = random.choice(['Completed', 'Completed', 'Completed', 'Dispatched', 'Draft', 'Cancelled'])
            
            # Revenue calculation (approx ₹40 to ₹80 per km depending on capacity)
            rate_per_km = random.uniform(40, 80)
            revenue = planned_dist * rate_per_km if status == 'Completed' else 0
            
            trip = Trip(
                trip_number=f"TRP-IND-{2026}{i:04d}",
                vehicle_id=v.id,
                driver_id=d.id,
                source_location=source,
                destination_location=dest,
                cargo_weight=random.uniform(500, float(v.max_load_capacity)),
                planned_distance=planned_dist,
                actual_distance=planned_dist * random.uniform(0.95, 1.05) if status == 'Completed' else None,
                revenue=revenue,
                status=status,
                created_by=creator.id
            )
            db.session.add(trip)
            db.session.flush() # get trip id
            
            # Maintenance
            if random.random() > 0.7:
                # Maintenance cost in India (₹2000 to ₹35000)
                m_cost = random.uniform(2000, 35000)
                m = MaintenanceLog(
                    vehicle_id=v.id,
                    maintenance_type=random.choice(['Oil Change & Filters', 'Tire Replacement', 'Brake Pad Replacement', 'Engine Servicing', 'Suspension Repair']),
                    description=f"Routine maintenance and repairs at local workshop for {v.registration_number}",
                    workshop=random.choice(["TATA Motors Authorized Service", "Ashok Leyland Service Center", "Highway Truck Repair", "City Auto Garage"]),
                    maintenance_cost=m_cost,
                    start_date=date.today() - timedelta(days=random.randint(1, 60)),
                    end_date=date.today() - timedelta(days=random.randint(0, 5)),
                    status='Completed',
                    created_by=random.choice(fm_users).id
                )
                db.session.add(m)
                
                # Expense for maintenance
                e = Expense(
                    vehicle_id=v.id,
                    expense_type='Maintenance',
                    amount=m_cost,
                    description="Maintenance & Repair cost",
                    expense_date=m.start_date,
                    created_by=random.choice(fm_users).id
                )
                db.session.add(e)

            # Fuel Log
            if status == 'Completed' or status == 'Dispatched':
                # Truck fuel efficiency is around 3 to 15 km/l depending on size
                efficiency = random.uniform(3.5, 12.0)
                liters = planned_dist / efficiency
                fuel_price_per_liter = random.uniform(92.0, 98.0) # INR
                fuel_cost = liters * fuel_price_per_liter
                
                f = FuelLog(
                    vehicle_id=v.id,
                    trip_id=trip.id,
                    liters=liters,
                    fuel_cost=fuel_cost,
                    fuel_date=date.today() - timedelta(days=random.randint(1, 30)),
                    odometer=float(v.odometer) + float(planned_dist) * random.random(),
                    # Fuel is typically logged by the driver
                    created_by=d.user_id
                )
                db.session.add(f)
                
                # Expense for fuel
                e_fuel = Expense(
                    vehicle_id=v.id,
                    trip_id=trip.id,
                    expense_type='Fuel',
                    amount=fuel_cost,
                    description=f"Diesel refill at {source} highway",
                    expense_date=f.fuel_date,
                    created_by=d.user_id
                )
                db.session.add(e_fuel)
                
                # Random Toll Expenses
                if random.random() > 0.4:
                    toll_cost = random.uniform(500, 3000)
                    e_toll = Expense(
                        vehicle_id=v.id,
                        trip_id=trip.id,
                        expense_type='Toll',
                        amount=toll_cost,
                        description="NHAI FASTag Toll Charges",
                        expense_date=f.fuel_date,
                        created_by=d.user_id
                    )
                    db.session.add(e_toll)
                
        db.session.commit()
        print("Database seeding completed successfully with realistic Indian data!")
        print("\n--- TEST CREDENTIALS ---")
        print("All passwords are: password123")
        print("Admin/Fleet Manager: admin@transitops.in")
        
        print("\nRole Examples:")
        print("Dispatcher:", dispatch_users[0].email)
        
        safety_users = [u for u in users if u.role_id == role_objs['Safety Officer'].id]
        print("Safety Officer:", safety_users[0].email)
        
        finance_users = [u for u in users if u.role_id == role_objs['Financial Analyst'].id]
        print("Financial Analyst:", finance_users[0].email)
        
        print("Driver:", f"driver1@transitops.in")

if __name__ == '__main__':
    generate_mock_data()
