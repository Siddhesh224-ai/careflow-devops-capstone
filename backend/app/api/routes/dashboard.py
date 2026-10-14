from fastapi import APIRouter

from app.api.dependencies import AdminUser, DbSession
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(session: DbSession, _admin: AdminUser):
    return DashboardService(session).summary()
