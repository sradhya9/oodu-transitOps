# TransitOps Database Design (MySQL)

## Database

-   **Database Name:** `transit`

## Overview

The schema is normalized (3NF) and models the complete transport
operations lifecycle.

### Core Entities

  Table              Purpose
  ------------------ -------------------------------------
  roles              Stores RBAC roles
  users              Authenticated users linked to roles
  vehicles           Fleet master data
  drivers            Driver profiles and compliance
  trips              Trip lifecycle management
  maintenance_logs   Vehicle maintenance records
  fuel_logs          Fuel consumption records
  expenses           Operational expenses

------------------------------------------------------------------------

# Entity Relationships

``` text
roles
 └── users

users
 ├── trips(created_by)
 ├── maintenance_logs(created_by)
 ├── fuel_logs(created_by)
 └── expenses(created_by)

vehicles
 ├── trips
 ├── maintenance_logs
 ├── fuel_logs
 └── expenses

drivers
 └── trips

trips
 ├── fuel_logs
 └── expenses
```

------------------------------------------------------------------------

# Table Structure

## roles

-   id (PK)
-   role_name (Unique)
-   description
-   created_at

Default Roles: - Fleet Manager - Dispatcher - Safety Officer - Financial
Analyst

------------------------------------------------------------------------

## users

Primary Key: - id

Foreign Key: - role_id → roles.id

Fields: - full_name - email (Unique) - password_hash - phone -
is_active - created_at - updated_at

------------------------------------------------------------------------

## vehicles

Primary Key: - id

Fields: - registration_number (Unique) - vehicle_name - vehicle_model -
vehicle_type - max_load_capacity - odometer - acquisition_cost -
acquisition_date - status

Vehicle Status: - Available - On Trip - In Shop - Retired

------------------------------------------------------------------------

## drivers

Primary Key: - id

Fields: - full_name - license_number (Unique) - license_category -
license_expiry - contact_number - safety_score - joining_date - status

Driver Status: - Available - On Trip - Off Duty - Suspended

------------------------------------------------------------------------

## trips

Primary Key: - id

Foreign Keys: - vehicle_id → vehicles.id - driver_id → drivers.id -
created_by → users.id

Fields: - trip_number (Unique) - source_location -
destination_location - cargo_weight - planned_distance -
actual_distance - start_odometer - end_odometer - revenue - status -
dispatch_time - completion_time - timestamps

Trip Status: - Draft - Dispatched - Completed - Cancelled

------------------------------------------------------------------------

## maintenance_logs

Primary Key: - id

Foreign Keys: - vehicle_id → vehicles.id - created_by → users.id

Fields: - maintenance_type - description - workshop - maintenance_cost -
start_date - end_date - status

Maintenance Status: - Open - Completed

------------------------------------------------------------------------

## fuel_logs

Primary Key: - id

Foreign Keys: - vehicle_id → vehicles.id - trip_id → trips.id -
created_by → users.id

Fields: - liters - fuel_cost - fuel_date - odometer

------------------------------------------------------------------------

## expenses

Primary Key: - id

Foreign Keys: - vehicle_id → vehicles.id - trip_id → trips.id -
created_by → users.id

Fields: - expense_type - amount - description - expense_date

Expense Types: - Fuel - Maintenance - Toll - Repair - Insurance - Other

------------------------------------------------------------------------

# Indexes

-   vehicles.status
-   drivers.status
-   drivers.license_expiry
-   trips.status
-   trips.vehicle_id
-   trips.driver_id
-   maintenance_logs.vehicle_id
-   fuel_logs.vehicle_id
-   expenses.vehicle_id

------------------------------------------------------------------------

# Backend Business Rules

1.  Vehicle registration number must be unique.
2.  Retired vehicles cannot be dispatched.
3.  Vehicles in maintenance cannot be dispatched.
4.  Drivers with expired licenses cannot be assigned.
5.  Suspended drivers cannot be assigned.
6.  A vehicle already On Trip cannot be assigned again.
7.  A driver already On Trip cannot be assigned again.
8.  Cargo weight must not exceed vehicle capacity.
9.  Dispatching a trip:
    -   Trip → Dispatched
    -   Vehicle → On Trip
    -   Driver → On Trip
10. Completing a trip:

-   Trip → Completed
-   Vehicle → Available
-   Driver → Available

11. Cancelling a trip:

-   Vehicle → Available
-   Driver → Available

12. Opening maintenance:

-   Vehicle → In Shop

13. Closing maintenance:

-   Vehicle → Available (unless Retired)

------------------------------------------------------------------------

# Dashboard KPIs

-   Active Vehicles
-   Available Vehicles
-   Vehicles in Maintenance
-   Active Trips
-   Pending Trips
-   Drivers On Duty
-   Fleet Utilization %
-   Total Fuel Cost
-   Total Maintenance Cost
-   Operational Cost
-   Vehicle ROI
-   Fuel Efficiency

------------------------------------------------------------------------

# Analytics

## Fuel Efficiency

Distance Travelled / Fuel Consumed

## Fleet Utilization

(Vehicles On Trip / Total Vehicles) × 100

## Operational Cost

Fuel + Maintenance + Other Expenses

## Vehicle ROI

(Revenue − (Fuel + Maintenance)) / Acquisition Cost

------------------------------------------------------------------------

# Recommended Backend Stack

-   React (Frontend)
-   Flask/FastAPI (Backend)
-   SQLAlchemy ORM
-   MySQL
-   JWT Authentication
-   RBAC
-   REST APIs

This structure satisfies all mandatory requirements in the TransitOps
hackathon brief while keeping business validations in the backend rather
than database triggers.
