# AI Banker Report Web v2

A full-stack web application for AI-powered banker reports, built with React + TypeScript + Vite frontend and FastAPI backend.

## Project Structure

```
ai_banker_report_web_v2/
├── frontend/          # React + TypeScript + Vite application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/           # FastAPI Python backend
│   └── .gitignore
└── README.md
```

## Tech Stack

### Frontend

- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **ESLint** - Code linting

### Backend

- **FastAPI** - Modern Python web framework
- **Python 3.x** - Backend runtime

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.8+
- npm or yarn

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create a virtual environment:

```bash
python -m venv venv
```

3. Activate the virtual environment:

- Windows: `venv\Scripts\activate`
- macOS/Linux: `source venv/bin/activate`

4. Install dependencies (once you create requirements.txt):

```bash
pip install -r requirements.txt
```

5. Run the FastAPI server:

```bash
uvicorn main:app --reload
```

The backend API will be available at `http://localhost:8000`

## Development

### Frontend Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend Scripts

- `uvicorn main:app --reload` - Start development server with auto-reload
- `pytest` - Run tests (once configured)

## License

This project is private and proprietary.
