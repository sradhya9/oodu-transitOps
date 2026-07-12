from backend.database import db

class FuelLog(db.Model):
    __tablename__ = 'fuel_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    # Note: Vehicle model is not yet implemented.
    # Relationship can be defined later: vehicle = db.relationship('Vehicle', backref=db.backref('fuel_logs', lazy=True))
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    
    # Note: Trip model is not yet implemented.
    # Relationship can be defined later: trip = db.relationship('Trip', backref=db.backref('fuel_logs', lazy=True))
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=True)
    
    liters = db.Column(db.Numeric(10, 2), nullable=False)
    fuel_cost = db.Column(db.Numeric(12, 2), nullable=False)
    fuel_date = db.Column(db.Date, nullable=False)
    odometer = db.Column(db.Numeric(12, 2), nullable=True)

    # Note: User model is not yet implemented.
    # Relationship can be defined later: creator = db.relationship('User', backref=db.backref('fuel_logs', lazy=True))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())

    def __repr__(self):
        return f"<FuelLog id={self.id} vehicle_id={self.vehicle_id} liters={self.liters} cost={self.fuel_cost}>"
