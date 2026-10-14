from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DbSession
from app.schemas.auth import AuthUser, LoginRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: DbSession):
    result = AuthService(session).login(payload.username, payload.password)
    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")
    return result


@router.get("/me", response_model=AuthUser)
def me(user: CurrentUser):
    return AuthUser(id=user.id, username=user.username, role=user.role, doctor_id=user.doctor_id)
