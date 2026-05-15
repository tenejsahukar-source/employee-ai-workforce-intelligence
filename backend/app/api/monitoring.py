import psutil
import platform
from datetime import datetime

from fastapi import APIRouter


router = APIRouter(
    prefix="/monitoring",
    tags=["Monitoring"]
)


@router.get("/health")
async def health_check():

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "service": "employee-ai-platform"
    }


@router.get("/system")
async def system_metrics():

    return {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage("/").percent,
        "system": platform.system()
    }