"""API v1 router."""

from fastapi import APIRouter

from app.api.v1 import upload, jobs, export, models

api_router = APIRouter()

api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(export.router, prefix="/jobs", tags=["export"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
