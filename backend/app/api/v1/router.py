from app.api.v1.endpoints import analytics
from app.api.v1.endpoints import employee_upload
from fastapi import APIRouter

api_router = APIRouter()

api_router.include_router(
    analytics.router
)

api_router.include_router(
    employee_upload.router
)