from fastapi import APIRouter

from app.api.routes import appointments, auth, dashboard, doctor_portal, doctors, patients

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(doctors.router)
api_router.include_router(appointments.router)
api_router.include_router(dashboard.router)
api_router.include_router(doctor_portal.router)
