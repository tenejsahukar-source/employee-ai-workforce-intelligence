from fastapi import APIRouter

from app.core.security.jwt_handler import create_access_token


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login")
async def login():

    token = create_access_token({
        "sub": "admin"
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }