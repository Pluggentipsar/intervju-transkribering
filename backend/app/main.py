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

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.config import settings
from app.db.database import init_db


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

# CORS only needed when running frontend dev server separately
if settings.debug:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": settings.app_name}


# Serve frontend static files (built Next.js export)
_frontend_dir = Path(settings.static_dir)

if _frontend_dir.is_dir():
    # Serve Next.js static assets (_next/static/*)
    _next_dir = _frontend_dir / "_next"
    if _next_dir.is_dir():
        app.mount("/_next", StaticFiles(directory=_next_dir), name="next-static")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str) -> FileResponse:
        """Serve frontend pages with SPA fallback for client-side routing."""
        # Try exact file (e.g. favicon.ico, robots.txt)
        file_path = _frontend_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # Try directory index (e.g. /jobs/ -> /jobs/index.html)
        index_path = _frontend_dir / full_path / "index.html"
        if index_path.is_file():
            return FileResponse(index_path)

        # SPA fallback: serve root index.html for client-side routing
        # (handles dynamic routes like /jobs/[id] that aren't pre-rendered)
        return FileResponse(_frontend_dir / "index.html")
