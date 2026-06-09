import fastapi

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError

from app.core.security.jwt_handler import (
    SECRET_KEY,
    ALGORITHM
)
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)

async def get_current_user(
    token: str = fastapi.Depends(oauth2_scheme)
):
    try:
        print("TOKEN RECEIVED:", token)

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        print("PAYLOAD:", payload)

        username = payload.get("sub")

        if username is None:
            raise fastapi.HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        return username

    except ExpiredSignatureError:
        print("TOKEN EXPIRED")
        raise fastapi.HTTPException(
            status_code=401,
            detail="Token expired"
        )

    except JWTError as e:
        print("JWT ERROR:", str(e))
        raise fastapi.HTTPException(
            status_code=401,
            detail=f"JWT Error: {str(e)}"
        )