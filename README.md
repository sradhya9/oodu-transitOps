# TransitOps – Smart Transport Operations Platform

TransitOps is a production-ready full-stack web application for transport operations management. This project serves as the foundation for the application, featuring a React frontend powered by Vite and a Python Flask backend connected to a MySQL database.

## Technology Stack

- **Frontend**: React JS with Vite, React Router DOM, Axios, React Context API, Plain CSS.
- **Backend**: Python 3.x, Flask, Flask-CORS, Flask-SQLAlchemy, Flask-Migrate, PyMySQL, python-dotenv.
- **Database**: MySQL 8.x.

## Folder Structure

```
transitops/
├── frontend/          # React/Vite application
│   ├── src/
│   │   ├── assets/    # Static assets (images, icons)
│   │   ├── components/# Reusable UI components
│   │   ├── context/   # React Context API
│   │   ├── hooks/     # Custom React hooks
│   │   ├── layouts/   # Page layouts (e.g., MainLayout)
│   │   ├── pages/     # Application pages
│   │   ├── routes/    # React Router configuration
│   │   ├── services/  # API services (Axios config)
│   │   ├── styles/    # Plain CSS styles
│   │   └── utilities/ # Helper functions
│   └── ...
├── backend/           # Flask application
│   ├── config/        # Environment and app configuration
│   ├── controllers/   # Route handlers / business logic
│   ├── database/      # Database initialization
│   ├── middleware/    # Custom Flask middleware
│   ├── models/        # SQLAlchemy models
│   ├── routes/        # Flask blueprints and routing
│   ├── services/      # Backend services
│   └── utils/         # Helper functions
└── ...
```

## Prerequisites

- **Node.js**: v18+
- **Python**: v3.10+
- **MySQL**: v8.x

## Setup Instructions

### 1. Database Setup

Ensure MySQL is running on your machine.
Log into your MySQL console and create the database manually:
```sql
CREATE DATABASE transitops;
```
*(Do not create any tables, migrations will handle that later.)*

### 2. Backend Setup (Flask)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure the environment variables:
   - Copy `.env.example` to `.env`
   - Update `.env` with your local MySQL credentials:
     ```env
     DB_HOST=localhost
     DB_PORT=3306
     DB_NAME=transitops
     DB_USER=your_username
     DB_PASSWORD=your_password
     SECRET_KEY=your_secret_key
     ```
5. Initialize Flask-Migrate (Optional for now as models are not created yet):
   ```bash
   flask db init
   ```
6. Run the Flask development server:
   ```bash
   flask run
   ```
   *You should see "Connected to MySQL Successfully" in the terminal output.*

### 3. Frontend Setup (React/Vite)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

## Verification

To verify the setup:
1. Ensure both backend and frontend servers are running.
2. Visit the frontend URL (typically `http://localhost:5173`).
3. On the Dashboard page, you should see indicators confirming that the Backend Status is "OK" and the Database is "Connected".
