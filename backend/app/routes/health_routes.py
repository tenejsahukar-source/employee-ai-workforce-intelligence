from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def health():

    return {
        "status": "healthy"
    }


@router.get("/ml-health")
def ml_health():

    return {
        "ml_models": "loaded"
    }