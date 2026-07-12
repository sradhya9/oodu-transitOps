-- ==========================================================
-- TransitOps Database Schema
-- Database Name: transit
-- ==========================================================

CREATE DATABASE IF NOT EXISTS transit
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE transit;

-- ==========================================================
-- ROLES
-- ==========================================================

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (role_name, description) VALUES
('Fleet Manager','Manages fleet operations'),
('Dispatcher','Handles trip scheduling and dispatch'),
('Safety Officer','Monitors compliance and driver safety'),
('Financial Analyst','Reviews expenses and reports');

-- ==========================================================
-- USERS
-- ==========================================================

CREATE TABLE users (

    id INT AUTO_INCREMENT PRIMARY KEY,

    role_id INT NOT NULL,

    full_name VARCHAR(100) NOT NULL,

    email VARCHAR(120) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    phone VARCHAR(20),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT
);

-- ==========================================================
-- VEHICLES
-- ==========================================================

CREATE TABLE vehicles (

    id INT AUTO_INCREMENT PRIMARY KEY,

    registration_number VARCHAR(30) NOT NULL UNIQUE,

    vehicle_name VARCHAR(100) NOT NULL,

    vehicle_model VARCHAR(100),

    vehicle_type ENUM(
        'Truck',
        'Mini Truck',
        'Van',
        'Pickup',
        'Bike',
        'Trailer',
        'Container'
    ) NOT NULL,

    max_load_capacity DECIMAL(10,2) NOT NULL,

    odometer DECIMAL(12,2) DEFAULT 0,

    acquisition_cost DECIMAL(12,2) NOT NULL,

    acquisition_date DATE,

    status ENUM(
        'Available',
        'On Trip',
        'In Shop',
        'Retired'
    ) DEFAULT 'Available',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- ==========================================================
-- DRIVERS
-- ==========================================================

CREATE TABLE drivers (

    id INT AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(120) NOT NULL,

    license_number VARCHAR(100) NOT NULL UNIQUE,

    license_category VARCHAR(20),

    license_expiry DATE NOT NULL,

    contact_number VARCHAR(20),

    safety_score DECIMAL(5,2) DEFAULT 100,

    joining_date DATE,

    status ENUM(
        'Available',
        'On Trip',
        'Off Duty',
        'Suspended'
    ) DEFAULT 'Available',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- ==========================================================
-- TRIPS
-- ==========================================================

CREATE TABLE trips (

    id INT AUTO_INCREMENT PRIMARY KEY,

    trip_number VARCHAR(30) NOT NULL UNIQUE,

    vehicle_id INT NOT NULL,

    driver_id INT NOT NULL,

    source_location VARCHAR(150) NOT NULL,

    destination_location VARCHAR(150) NOT NULL,

    cargo_weight DECIMAL(10,2) NOT NULL,

    planned_distance DECIMAL(10,2),

    actual_distance DECIMAL(10,2),

    start_odometer DECIMAL(12,2),

    end_odometer DECIMAL(12,2),

    revenue DECIMAL(12,2) DEFAULT 0,

    status ENUM(
        'Draft',
        'Dispatched',
        'Completed',
        'Cancelled'
    ) DEFAULT 'Draft',

    dispatch_time DATETIME,

    completion_time DATETIME,

    created_by INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_trip_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id),

    CONSTRAINT fk_trip_driver
        FOREIGN KEY (driver_id)
        REFERENCES drivers(id),

    CONSTRAINT fk_trip_creator
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);

-- ==========================================================
-- MAINTENANCE LOGS
-- ==========================================================

CREATE TABLE maintenance_logs (

    id INT AUTO_INCREMENT PRIMARY KEY,

    vehicle_id INT NOT NULL,

    maintenance_type VARCHAR(100),

    description TEXT,

    workshop VARCHAR(100),

    maintenance_cost DECIMAL(12,2),

    start_date DATE,

    end_date DATE,

    status ENUM(
        'Open',
        'Completed'
    ) DEFAULT 'Open',

    created_by INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id),

    CONSTRAINT fk_maintenance_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);

-- ==========================================================
-- FUEL LOGS
-- ==========================================================

CREATE TABLE fuel_logs (

    id INT AUTO_INCREMENT PRIMARY KEY,

    vehicle_id INT NOT NULL,

    trip_id INT,

    liters DECIMAL(10,2) NOT NULL,

    fuel_cost DECIMAL(12,2) NOT NULL,

    fuel_date DATE NOT NULL,

    odometer DECIMAL(12,2),

    created_by INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fuel_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id),

    CONSTRAINT fk_fuel_trip
        FOREIGN KEY (trip_id)
        REFERENCES trips(id),

    CONSTRAINT fk_fuel_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);

-- ==========================================================
-- EXPENSES
-- ==========================================================

CREATE TABLE expenses (

    id INT AUTO_INCREMENT PRIMARY KEY,

    vehicle_id INT,

    trip_id INT,

    expense_type ENUM(
        'Fuel',
        'Maintenance',
        'Toll',
        'Repair',
        'Insurance',
        'Other'
    ) NOT NULL,

    amount DECIMAL(12,2) NOT NULL,

    description TEXT,

    expense_date DATE NOT NULL,

    created_by INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id),

    CONSTRAINT fk_expense_trip
        FOREIGN KEY (trip_id)
        REFERENCES trips(id),

    CONSTRAINT fk_expense_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);

-- ==========================================================
-- INDEXES
-- ==========================================================

CREATE INDEX idx_vehicle_status
ON vehicles(status);

CREATE INDEX idx_driver_status
ON drivers(status);

CREATE INDEX idx_driver_license_expiry
ON drivers(license_expiry);

CREATE INDEX idx_trip_status
ON trips(status);

CREATE INDEX idx_trip_vehicle
ON trips(vehicle_id);

CREATE INDEX idx_trip_driver
ON trips(driver_id);

CREATE INDEX idx_maintenance_vehicle
ON maintenance_logs(vehicle_id);

CREATE INDEX idx_fuel_vehicle
ON fuel_logs(vehicle_id);

CREATE INDEX idx_expense_vehicle
ON expenses(vehicle_id);

-- ==========================================================
-- BUSINESS RULES (IMPLEMENT IN BACKEND)
-- ==========================================================

-- 1. Vehicle Registration Number must be unique.
-- 2. Retired or In Shop vehicles cannot be dispatched.
-- 3. Drivers with expired licenses cannot be dispatched.
-- 4. Suspended drivers cannot be dispatched.
-- 5. Vehicles already On Trip cannot be reused.
-- 6. Drivers already On Trip cannot be reused.
-- 7. Cargo Weight <= Vehicle Max Load Capacity.
-- 8. Dispatch Trip:
--      Trip -> Dispatched
--      Vehicle -> On Trip
--      Driver -> On Trip
-- 9. Complete Trip:
--      Trip -> Completed
--      Vehicle -> Available
--      Driver -> Available
-- 10. Cancel Trip:
--      Vehicle -> Available
--      Driver -> Available
-- 11. Open Maintenance:
--      Vehicle -> In Shop
-- 12. Complete Maintenance:
--      Vehicle -> Available (unless Retired)

-- ==========================================================
-- ANALYTICS FORMULAS
-- ==========================================================

-- Fuel Efficiency
-- = Actual Distance / Fuel Consumed

-- Operational Cost
-- = SUM(Fuel Cost + Maintenance Cost + Expenses)

-- Fleet Utilization
-- = (Vehicles On Trip / Total Vehicles) * 100

-- Vehicle ROI
-- = (Revenue - (Maintenance + Fuel)) / Acquisition Cost

-- --------------------------------------------------------
-- Table structure for table `system_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed Initial Data for `system_settings`
INSERT IGNORE INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('rate_per_km_truck', '80', 'Rate per KM for Trucks'),
('rate_per_km_mini_truck', '50', 'Rate per KM for Mini Trucks'),
('rate_per_km_van', '40', 'Rate per KM for Vans'),
('rate_per_km_pickup', '45', 'Rate per KM for Pickups'),
('rate_per_km_bike', '15', 'Rate per KM for Bikes'),
('rate_per_km_trailer', '120', 'Rate per KM for Trailers'),
('rate_per_km_container', '150', 'Rate per KM for Containers');