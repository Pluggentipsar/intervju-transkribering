"""Settings API – manage HuggingFace token and other runtime config."""

import os
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter()


def _env_file_path() -> Path:
    """Return the .env file used by the running app."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent / "data" / ".env"
    # Dev mode: backend/.env (uvicorn is run from backend/)
    return Path(__file__).resolve().parent.parent.parent / ".env"


def _read_env_lines(path: Path) -> list[str]:
    if path.exists():
        return path.read_text(encoding="utf-8").splitlines()
    return []


def _write_env_key(key: str, value: str | None) -> None:
    """Set or remove a key in the .env file and update the runtime config."""
    env_path = _env_file_path()
    env_path.parent.mkdir(parents=True, exist_ok=True)

    lines = _read_env_lines(env_path)
    new_lines: list[str] = []
    found = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith(f"{key}=") or stripped.startswith(f"{key} ="):
            found = True
            if value is not None:
                new_lines.append(f"{key}={value}")
        else:
            new_lines.append(line)

    if not found and value is not None:
        new_lines.append(f"{key}={value}")

    env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")

    # Update runtime
    if value is not None:
        os.environ[key] = value
    else:
        os.environ.pop(key, None)


# ── Schemas ──────────────────────────────────────────────────

class HFTokenStatus(BaseModel):
    configured: bool
    token_preview: str | None = None


class HFTokenSave(BaseModel):
    token: str


# ── Endpoints ────────────────────────────────────────────────

@router.get("/hf-token", response_model=HFTokenStatus)
async def get_hf_token_status() -> HFTokenStatus:
    """Check whether an HF token is configured."""
    token = os.environ.get("HF_TOKEN") or settings.hf_token
    if token:
        preview = token[:5] + "..." + token[-4:] if len(token) > 12 else "***"
        return HFTokenStatus(configured=True, token_preview=preview)
    return HFTokenStatus(configured=False)


@router.post("/hf-token", response_model=HFTokenStatus)
async def save_hf_token(body: HFTokenSave) -> HFTokenStatus:
    """Save an HF token to .env and apply it at runtime."""
    token = body.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token kan inte vara tomt")

    _write_env_key("HF_TOKEN", token)
    settings.hf_token = token

    preview = token[:5] + "..." + token[-4:] if len(token) > 12 else "***"
    return HFTokenStatus(configured=True, token_preview=preview)


@router.delete("/hf-token")
async def remove_hf_token() -> HFTokenStatus:
    """Remove the HF token from .env and runtime."""
    _write_env_key("HF_TOKEN", None)
    settings.hf_token = None
    return HFTokenStatus(configured=False)
