"""Settings API endpoints for managing configuration."""

import os
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter()


def get_config_path() -> Path:
    """Get the path to the config file."""
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller exe
        exe_dir = Path(sys.executable).parent
    else:
        # Development mode - use backend directory
        exe_dir = Path(__file__).parent.parent.parent.parent

    return exe_dir / "config.txt"


class HFTokenRequest(BaseModel):
    token: str


class HFTokenStatus(BaseModel):
    configured: bool
    token_preview: str | None = None  # Show first/last few chars


@router.get("/hf-token", response_model=HFTokenStatus)
async def get_hf_token_status():
    """Check if HF token is configured."""
    # Check environment variable first
    env_token = os.environ.get("HF_TOKEN", "")

    if env_token:
        # Show preview like "hf_xxxx...xxxx"
        if len(env_token) > 10:
            preview = f"{env_token[:7]}...{env_token[-4:]}"
        else:
            preview = "***"
        return HFTokenStatus(configured=True, token_preview=preview)

    # Check config file
    config_path = get_config_path()
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("HF_TOKEN="):
                    token = line.strip().split("=", 1)[1]
                    if token and not token.startswith("#"):
                        if len(token) > 10:
                            preview = f"{token[:7]}...{token[-4:]}"
                        else:
                            preview = "***"
                        return HFTokenStatus(configured=True, token_preview=preview)

    return HFTokenStatus(configured=False)


@router.post("/hf-token")
async def save_hf_token(request: HFTokenRequest):
    """Save HF token to config file."""
    token = request.token.strip()

    if not token:
        raise HTTPException(status_code=400, detail="Token cannot be empty")

    if not token.startswith("hf_"):
        raise HTTPException(
            status_code=400,
            detail="Invalid token format. HuggingFace tokens start with 'hf_'"
        )

    config_path = get_config_path()

    # Read existing config if it exists
    existing_lines = []
    token_found = False

    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("HF_TOKEN=") or line.strip().startswith("#HF_TOKEN="):
                    existing_lines.append(f"HF_TOKEN={token}\n")
                    token_found = True
                else:
                    existing_lines.append(line)

    if not token_found:
        existing_lines.append(f"HF_TOKEN={token}\n")

    # Write config file
    with open(config_path, "w", encoding="utf-8") as f:
        f.writelines(existing_lines)

    # Also set in environment for immediate use
    os.environ["HF_TOKEN"] = token

    return {"status": "ok", "message": "Token saved successfully"}


@router.delete("/hf-token")
async def remove_hf_token():
    """Remove HF token from config."""
    config_path = get_config_path()

    if config_path.exists():
        lines = []
        with open(config_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip().startswith("HF_TOKEN="):
                    lines.append(line)

        with open(config_path, "w", encoding="utf-8") as f:
            f.writelines(lines)

    # Remove from environment
    if "HF_TOKEN" in os.environ:
        del os.environ["HF_TOKEN"]

    return {"status": "ok", "message": "Token removed"}
