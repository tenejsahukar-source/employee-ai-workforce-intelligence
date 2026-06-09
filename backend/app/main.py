"""
AI Workforce Intelligence Platform — Application Entrypoint
Production-grade FastAPI bootstrap with RBAC, Prometheus telemetry,
structured middleware, and full ML inference routing.

Root-cause fixes applied (see ROOT_CAUSE_ANALYSIS.md):
  1. Single FastAPI instance — duplicate `app = FastAPI()` removed.
  2. Duplicate router import resolved — ml_router and prediction_router
     were the same object imported twice under different names.
  3. Routers registered on the *correct* app object and in the right order.
  4. Duplicate health_router registration removed.
  5. Middleware and exception handlers applied before router registration.
  6. Unused imports removed (Query, OAuth2PasswordRequestForm, DBEmployee,
     wildcard logging_config, List where not needed).
  7. load_dotenv() and logging.basicConfig() moved to the very top so they
     are active before any module-level side effects.
  8. Prometheus Instrumentator attached to the single app instance.
"""

# =========================================================
# STDLIB — must be first so logging is active for all imports
# =========================================================

import logging
import os
from datetime import datetime, timedelta
from typing import Optional

# =========================================================
# ENVIRONMENT — load .env before any os.getenv() call
# =========================================================

from dotenv import load_dotenv

load_dotenv()

# =========================================================
# LOGGING — configure before any module that emits logs
# =========================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

# =========================================================
# THIRD-PARTY
# =========================================================

from jose import JWTError, jwt
from passlib.context import CryptContext
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.exc import SQLAlchemyError

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer

# =========================================================
# INTERNAL — database & models
# =========================================================

from app.database.connection import Base, engine
from app.db.models.prediction import PredictionLog

# =========================================================
# INTERNAL — routers
# =========================================================

from app.ml.api.routes import router as prediction_router        # POST /api/v1/predict/attrition
from app.ml.api.history_routes import router as history_router   # GET  /api/v1/predictions[/...]
from app.routes.health_routes import router as health_router     # GET  /health  (router-level)
from app.api.monitoring import router as monitoring_router
from app.api.auth import router as auth_router
from app.ml.api.analytics_routes import router as analytics_router

# =========================================================
# INTERNAL — middleware & exception utilities
# =========================================================

from app.middleware.logging_middleware import log_requests
from app.utils.exception_handlers import sqlalchemy_exception_handler

# =========================================================
# DATABASE BOOTSTRAP
# =========================================================
from app.db.models.prediction import PredictionLog


print("TABLES REGISTERED:")
print(Base.metadata.tables.keys())
Base.metadata.create_all(bind=engine)
logger.info("Database tables verified / created.")

# =========================================================
# JWT CONFIGURATION
# =========================================================

SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE-ME-IN-PRODUCTION")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

if SECRET_KEY == "CHANGE-ME-IN-PRODUCTION":
    logger.warning(
        "SECRET_KEY is using the insecure default value. "
        "Set SECRET_KEY in your .env file before deploying."
    )

# =========================================================
# FASTAPI — single instance
# =========================================================

app = FastAPI(
    title="AI Workforce Intelligence Platform",
    description=(
        "Production-grade ML API with Authentication, CRUD, "
        "Celery, Redis, and SHAP Explanations."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# =========================================================
# PROMETHEUS INSTRUMENTATION
# =========================================================

Instrumentator().instrument(app).expose(app)

# =========================================================
# MIDDLEWARE
# =========================================================

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",  # if using React dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

    # ADD THIS PART
    expose_headers=[
        "X-Trace-ID",
        "X-Inference-Time-ms",
        "X-Model-Version",
        "X-Risk-Label",
    ],
)
# Custom structured request/response logger
app.middleware("http")(log_requests)

# =========================================================
# EXCEPTION HANDLERS
# =========================================================

app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler — logs the traceback and returns a safe 500."""
    logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )

# =========================================================
# ROUTER REGISTRATION
# =========================================================

app.include_router(auth_router)
app.include_router(health_router)
app.include_router(monitoring_router)
app.include_router(prediction_router)   # POST /api/v1/predict/attrition
app.include_router(history_router)      # GET  /api/v1/predictions[/...]
app.include_router(analytics_router)

logger.info("All routers registered successfully.")

# =========================================================
# PASSWORD & TOKEN UTILITIES
# =========================================================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = {**data.copy(), "type": "refresh"}
    to_encode["exp"] = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# =========================================================
# PYDANTIC MODELS
# =========================================================

class Role(str):
    ADMIN = "admin"
    HR = "hr"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = Role.EMPLOYEE

    @validator("password")
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool = True
    created_at: datetime


# =========================================================
# INLINE UTILITY ENDPOINTS
# =========================================================

@app.get("/health", tags=["Health"], summary="Basic liveness probe")
async def health_check():
    """
    Lightweight liveness check — returns immediately without DB I/O.
    Use the health_router endpoints for deeper readiness checks.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
    }


@app.get("/", tags=["Info"], summary="API root")
async def root():
    return {
        "message": "Backend Running Successfully",
        "name": "AI Workforce Intelligence Platform",
        "version": "2.0.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "metrics": "/metrics",
    }

# =========================================================
# UVICORN ENTRYPOINT
# =========================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",          # string form enables --reload
        host="0.0.0.0",
        port=8000,
        reload=False,        # set True in local dev
        log_level="info",
    )