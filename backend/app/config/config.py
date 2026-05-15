"""
Configuration module for Enterprise API
Handles all settings and configuration management
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings"""
    
    # ==================== API CONFIGURATION ====================
    API_TITLE: str = "Enterprise Employee API"
    API_DESCRIPTION: str = "Phase 2 - Complete CRUD + Authentication"
    API_VERSION: str = "2.0.0"
    API_PREFIX: str = "/api/v1"
    
    # ==================== SECURITY ====================
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ==================== DATABASE ====================
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./employees.db")
    DB_POOL_SIZE: int = 20
    DB_ECHO: bool = False
    
    # ==================== CORS ====================
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # ==================== EMAIL ====================
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@company.com")
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    
    # ==================== LOGGING ====================
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # ==================== FEATURES ====================
    ENABLE_EMAIL_VERIFICATION: bool = False
    ENABLE_RATE_LIMITING: bool = False
    ENABLE_AUDIT_LOGGING: bool = False
    
    # ==================== PAGINATION ====================
    DEFAULT_PAGE_SIZE: int = 10
    MAX_PAGE_SIZE: int = 100
    
    # ==================== PASSWORD POLICY ====================
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    Dependency for FastAPI
    """
    return Settings()

# ==================== ROLE DEFINITIONS ====================
class Roles:
    """Role constants"""
    ADMIN = "admin"
    HR = "hr"
    MANAGER = "manager"
    EMPLOYEE = "employee"
    
    ALL = [ADMIN, HR, MANAGER, EMPLOYEE]

# ==================== DEPARTMENT DEFINITIONS ====================
class Departments:
    """Department constants"""
    SALES = "sales"
    ENGINEERING = "engineering"
    HR = "hr"
    FINANCE = "finance"
    OPERATIONS = "operations"
    MARKETING = "marketing"
    LEGAL = "legal"
    
    ALL = [SALES, ENGINEERING, HR, FINANCE, OPERATIONS, MARKETING, LEGAL]

# ==================== PERMISSIONS ====================
class Permissions:
    """Permission definitions for RBAC"""
    
    # Employee operations
    CREATE_EMPLOYEE = "create:employee"
    READ_EMPLOYEE = "read:employee"
    UPDATE_EMPLOYEE = "update:employee"
    DELETE_EMPLOYEE = "delete:employee"
    
    # User operations
    CREATE_USER = "create:user"
    READ_USER = "read:user"
    UPDATE_USER = "update:user"
    DELETE_USER = "delete:user"
    
    # Department operations
    MANAGE_DEPARTMENT = "manage:department"
    
    # System operations
    MANAGE_ROLES = "manage:roles"
    VIEW_LOGS = "view:logs"
    MANAGE_SETTINGS = "manage:settings"

# ==================== ROLE PERMISSIONS MAPPING ====================
ROLE_PERMISSIONS = {
    Roles.ADMIN: [
        Permissions.CREATE_EMPLOYEE,
        Permissions.READ_EMPLOYEE,
        Permissions.UPDATE_EMPLOYEE,
        Permissions.DELETE_EMPLOYEE,
        Permissions.CREATE_USER,
        Permissions.READ_USER,
        Permissions.UPDATE_USER,
        Permissions.DELETE_USER,
        Permissions.MANAGE_DEPARTMENT,
        Permissions.MANAGE_ROLES,
        Permissions.VIEW_LOGS,
        Permissions.MANAGE_SETTINGS,
    ],
    Roles.HR: [
        Permissions.CREATE_EMPLOYEE,
        Permissions.READ_EMPLOYEE,
        Permissions.UPDATE_EMPLOYEE,
        Permissions.DELETE_EMPLOYEE,
        Permissions.READ_USER,
        Permissions.VIEW_LOGS,
    ],
    Roles.MANAGER: [
        Permissions.READ_EMPLOYEE,
        Permissions.UPDATE_EMPLOYEE,
    ],
    Roles.EMPLOYEE: [
        Permissions.READ_EMPLOYEE,
    ],
}

# ==================== ERROR MESSAGES ====================
class ErrorMessages:
    """Standard error messages"""
    
    INVALID_CREDENTIALS = "Invalid email or password"
    USER_NOT_FOUND = "User not found"
    USER_ALREADY_EXISTS = "Email already registered"
    USER_INACTIVE = "User account is inactive"
    
    EMPLOYEE_NOT_FOUND = "Employee not found"
    EMPLOYEE_ALREADY_EXISTS = "Employee with this email already exists"
    INVALID_SALARY = "Salary must be a positive number"
    
    UNAUTHORIZED = "Could not validate credentials"
    FORBIDDEN = "Access denied. Insufficient permissions"
    INVALID_TOKEN = "Invalid or expired token"
    
    VALIDATION_ERROR = "Validation error"
    INTERNAL_ERROR = "Internal server error"
    
    WEAK_PASSWORD = "Password must be at least {} characters"

# ==================== SUCCESS MESSAGES ====================
class SuccessMessages:
    """Standard success messages"""
    
    USER_CREATED = "User created successfully"
    USER_DELETED = "User deleted successfully"
    
    EMPLOYEE_CREATED = "Employee created successfully"
    EMPLOYEE_UPDATED = "Employee updated successfully"
    EMPLOYEE_DELETED = "Employee deleted successfully"
    
    LOGIN_SUCCESSFUL = "Login successful"
    LOGOUT_SUCCESSFUL = "Logout successful"

# ==================== HTTP STATUS CODES ====================
class StatusCodes:
    """HTTP status codes reference"""
    
    OK = 200
    CREATED = 201
    ACCEPTED = 202
    NO_CONTENT = 204
    
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    
    INTERNAL_ERROR = 500
    SERVICE_UNAVAILABLE = 503

# ==================== CONFIGURATION VALIDATION ====================
def validate_config():
    """Validate configuration on startup"""
    settings = get_settings()
    
    if not settings.SECRET_KEY or settings.SECRET_KEY == "your-secret-key-change-in-production":
        raise ValueError("SECRET_KEY must be set and changed from default")
    
    if settings.ACCESS_TOKEN_EXPIRE_MINUTES < 5:
        raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES should be at least 5")
    
    if settings.REFRESH_TOKEN_EXPIRE_DAYS < 1:
        raise ValueError("REFRESH_TOKEN_EXPIRE_DAYS should be at least 1")
    
    print("✓ Configuration validation passed")

# Export commonly used items
__all__ = [
    "Settings",
    "get_settings",
    "Roles",
    "Departments",
    "Permissions",
    "ROLE_PERMISSIONS",
    "ErrorMessages",
    "SuccessMessages",
    "StatusCodes",
    "validate_config",
]
