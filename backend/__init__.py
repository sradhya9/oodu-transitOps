import sys
from flask import Flask
from flask_cors import CORS
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from backend.config.settings import Config
from backend.database import db, migrate
from backend.routes.main_routes import main_bp
from backend.routes.dashboard_routes import dashboard_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(dashboard_bp)

    from backend.routes.vehicle_routes import vehicle_bp
    app.register_blueprint(vehicle_bp)

    # Test database connection on startup
    with app.app_context():
        try:
            # We use text() to execute raw SQL
            db.session.execute(text("SELECT 1"))
            print("Connected to MySQL Successfully")
        except OperationalError as e:
            print(f"Error: Failed to connect to the MySQL database '{app.config['DB_NAME']}'.")
            print(f"Details: {e}")
            print("Stopping the application...")
            sys.exit(1)
        except Exception as e:
            print(f"An unexpected error occurred during database connection test: {e}")
            sys.exit(1)

    return app
