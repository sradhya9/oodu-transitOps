from backend.database import db

class MaintenanceLog(db.Model):
    __tablename__ = 'maintenance_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    # Note: Vehicle model is not yet implemented.
    # Relationship can be defined later: vehicle = db.relationship('Vehicle', backref=db.backref('maintenance_logs', lazy=True))
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    
    maintenance_type = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    workshop = db.Column(db.String(100), nullable=True)
    maintenance_cost = db.Column(db.Numeric(12, 2), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    
    # ENUM mapping exactly to: ENUM('Open', 'Completed')
    status = db.Column(db.Enum('Open', 'Completed', name='maintenance_status'), default='Open')

    # Note: User model is not yet implemented.
    # Relationship can be defined later: creator = db.relationship('User', backref=db.backref('maintenance_logs', lazy=True))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())

    def __repr__(self):
        return f"<MaintenanceLog id={self.id} vehicle_id={self.vehicle_id} type='{self.maintenance_type}' status='{self.status}'>"
