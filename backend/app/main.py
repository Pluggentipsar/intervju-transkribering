"""FastAPI application entry point."""

# Patch torch.load BEFORE any other imports that might use torch
# This fixes PyTorch 2.6+ compatibility with pyannote models
def _patch_torch_load():
    try:
        import torch
        if hasattr(torch, '_original_load'):
            return
        torch._original_load = torch.load
        def patched_load(*args, **kwargs):
            if 'weights_only' not in kwargs:
                kwargs['weights_only'] = False
            return torch._original_load(*args, **kwargs)
        torch.load = patched_load
    except ImportError:
        pass

_patch_torch_load()

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.config import settings
from app.db.database import init_db


def get_frontend_path() -> Path | None:
    """Get the path to frontend static files."""
    # When running as PyInstaller exe, check relative to exe
    if getattr(sys, 'frozen', False):
        exe_dir = Path(sys.executable).parent
        frontend_path = exe_dir / "frontend"
        if frontend_path.exists():
            return frontend_path

    # Development: check relative to backend folder
    backend_dir = Path(__file__).parent.parent
    dev_frontend = backend_dir.parent / "frontend" / "out"
    if dev_frontend.exists():
        return dev_frontend

    return None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.app_name,
    description="API for transkribering av intervjuer med KB Whisper",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for local development and Tauri desktop app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "tauri://localhost",  # Tauri desktop app
        "https://tauri.localhost",  # Tauri on some platforms
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": settings.app_name}


# Serve frontend static files if available (for desktop app distribution)
frontend_path = get_frontend_path()
if frontend_path:
    # Mount _next folder for Next.js assets
    next_path = frontend_path / "_next"
    if next_path.exists():
        app.mount("/_next", StaticFiles(directory=str(next_path)), name="next_static")

    @app.get("/", response_class=HTMLResponse)
    async def serve_index():
        """Serve the main index.html."""
        index_file = frontend_path / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return HTMLResponse("<h1>Frontend not found</h1>", status_code=404)

    @app.get("/{path:path}")
    async def serve_frontend(path: str, request: Request):
        """Serve frontend static files with SPA fallback."""
        # Skip API routes
        if path.startswith("api/"):
            return HTMLResponse("Not Found", status_code=404)

        file_path = frontend_path / path

        # If it's a file, serve it directly
        if file_path.is_file():
            return FileResponse(file_path)

        # Check for .html extension (Next.js static export)
        html_path = frontend_path / f"{path}.html"
        if html_path.is_file():
            return FileResponse(html_path)

        # Check for index.html in directory (e.g., /upload/ -> /upload/index.html)
        index_in_dir = frontend_path / path / "index.html"
        if index_in_dir.is_file():
            return FileResponse(index_in_dir)

        # For dynamic routes like /jobs/[id], serve the placeholder page
        # Next.js static export creates /jobs/placeholder/index.html for dynamic routes
        if path.startswith("jobs/") and "/" not in path.replace("jobs/", ""):
            # This is /jobs/{id} - check for placeholder
            placeholder = frontend_path / "jobs" / "placeholder" / "index.html"
            if placeholder.is_file():
                return FileResponse(placeholder)

        # For /jobs/{id}/edit routes
        if "/edit" in path and path.startswith("jobs/"):
            placeholder = frontend_path / "jobs" / "placeholder" / "edit" / "index.html"
            if placeholder.is_file():
                return FileResponse(placeholder)

        # Fallback to index.html for SPA routing
        index_file = frontend_path / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

        return HTMLResponse("Not Found", status_code=404)
