# AI Banker Report Web API

A Flask-based web API for the AI Banker Report system, handling authentication and report management.

## Prerequisites

- Python 3.8 or higher
- MySQL Server
- pip (Python package manager)

## Getting Started

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai_banker_report_web/api
```

### 2. Create and Activate Virtual Environment

#### Windows:
```bash
python -m venv venv
.\venv\Scripts\activate
```

#### Linux/MacOS:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Setup

Create a `.env` file in the `api` directory with the following variables:
```env
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key
DB_HOST=localhost
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
JWT_SECRET_KEY=your-jwt-secret-key
```

### 5. Database Setup
1. Create a MySQL database
2. Import the database schema (if available)

### 6. Running the Application

#### Development Mode:
```bash
flask run
```

The API will be available at `http://127.0.0.1:5000/`

#### Production Mode (using Waitress):
```bash
pip install waitress
waitress-serve --port=5000 app:app
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token

### Reports
- `GET /api/reports` - Get all reports (protected route)
- `POST /api/reports` - Create a new report (protected route)
- `GET /api/reports/<id>` - Get a specific report (protected route)

## Project Structure

```
api/
├── app.py              # Main application file
├── config.py           # Configuration settings
├── requirements.txt    # Project dependencies
├── .env                # Environment variables
├── models/             # Database models
├── routes/             # API routes
│   ├── auth.py        # Authentication routes
│   └── reports.py     # Report routes
└── utils/              # Utility functions
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
