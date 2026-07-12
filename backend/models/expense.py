from backend.database import db

class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    # Note: Vehicle model is not yet implemented.
    # Relationship can be defined later: vehicle = db.relationship('Vehicle', backref=db.backref('expenses', lazy=True))
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=True)
    
    # Note: Trip model is not yet implemented.
    # Relationship can be defined later: trip = db.relationship('Trip', backref=db.backref('expenses', lazy=True))
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=True)
    
    # ENUM mapping exactly to: ENUM('Fuel', 'Maintenance', 'Toll', 'Repair', 'Insurance', 'Other')
    expense_type = db.Column(
        db.Enum('Fuel', 'Maintenance', 'Toll', 'Repair', 'Insurance', 'Other', name='expense_type'),
        nullable=False
    )
    
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    description = db.Column(db.Text, nullable=True)
    expense_date = db.Column(db.Date, nullable=False)

    # Note: User model is not yet implemented.
    # Relationship can be defined later: creator = db.relationship('User', backref=db.backref('expenses', lazy=True))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())

    def __repr__(self):
        return f"<Expense id={self.id} type='{self.expense_type}' amount={self.amount}>"
