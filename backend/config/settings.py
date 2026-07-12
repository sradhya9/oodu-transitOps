import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key')
    
    # Database configurations
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '3306')
    DB_NAME = os.environ.get('DB_NAME', 'transitops')
    
    # URL-encode the password to handle special characters like '@'
    from urllib.parse import quote_plus
    _escaped_password = quote_plus(DB_PASSWORD) if DB_PASSWORD else ""
    
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{_escaped_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
