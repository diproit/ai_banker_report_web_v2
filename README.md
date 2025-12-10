# AI Banker Report Web v2

A full-stack web application for AI-powered banking reports with dynamic report generation and multi-language support.

## Tech Stack

### Frontend

- **React 19** - UI library
- **React Router v7** - Navigation
- **Axios** - HTTP client
- **i18next** - Internationalization (English, Sinhala, Tamil, Tagalog, Thai)
- **React Toastify** - Notifications

### Backend

- **Flask** - Python web framework
- **SQLModel + SQLAlchemy** - ORM and database management
- **MySQL** - Database
- **Flask-JWT-Extended** - Authentication
- **Flask-CORS** - Cross-origin support

## Project Structure

```
ai_banker_report_web_v2/
├── frontend/          # React application
│   ├── src/
│   │   ├── clients/       # API clients
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── config/        # Configuration
│   │   └── utils/         # Utilities
│   └── public/
├── backend/           # Flask backend
│   ├── routes/        # API routes
│   ├── service/       # Business logic
│   ├── models/        # Database models
│   ├── config/        # Configuration
│   └── utils/         # Utilities
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.8+
- MySQL 8.0+

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
flask run
```

The backend API will be available at `http://localhost:5003`

### Database Setup

1. Create MySQL database
2. Configure database credentials in `backend/config/config.py`
3. Run database initialization:

```bash
cd backend
python setup_db.py
```

## Features

- **Dynamic Navigation** - Database-driven menu system with role-based access control
- **Report Generation** - SQL-based dynamic report creation
- **Multi-language Support** - Support for 5 languages
- **User Management** - Role-based authentication and authorization
- **AI Integration** - OpenAI and Gemini provider support for chat features

## License

This project is private and proprietary.
