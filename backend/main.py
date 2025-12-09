from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.config import settings
from config.database import create_db_and_tables
from routes.auth_routes import router as auth_router
from routes.user_nav_routes import router as user_nav_router
from routes.language_routes import router as language_router
from routes.translation_routes import router as translation_router
from routes.sql_executor_routes import router as sql_executor_router
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await create_db_and_tables()
        print("✅ Database connection successful and tables created/verified")
    except Exception as e:
        print(f"⚠️  Database connection failed: {e}")
        print("📝 Application will start but database operations may fail")
        print("🔧 Please check your database configuration in .env file")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AIB Reports Backend API with Authentication",
    lifespan=lifespan
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(user_nav_router, prefix="/api/v1", tags=["user-navigation"])
app.include_router(language_router, prefix="/api/v1", tags=["languages"])
app.include_router(translation_router, prefix="/api/v1", tags=["translations"])
app.include_router(sql_executor_router, prefix="/api/v1", tags=["sql-executor"])

@app.get("/")
def read_root():
    return {"message": "AIB Reports API", "version": settings.VERSION}

@app.get("/health")
def health_check():
    return {"status": "healthy"}