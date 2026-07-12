import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import create_app
from backend.database.models import db, User, Role

app = create_app()

with app.app_context():
    roles = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst']
    for role_name in roles:
        if not Role.query.filter_by(role_name=role_name).first():
            db.session.add(Role(role_name=role_name))
    db.session.commit()

    fm_role = Role.query.filter_by(role_name='Fleet Manager').first()
    admin = User.query.filter_by(email='admin@transitops.com').first()
    if not admin:
        admin = User(full_name='Admin User', email='admin@transitops.com', role_id=fm_role.id)
        admin.set_password('password123')
        db.session.add(admin)
        db.session.commit()
        print("Admin user created: admin@transitops.com / password123")
    else:
        print("Admin user already exists.")
