"""Model management endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    torch = None  # type: ignore
    TORCH_AVAILABLE = False

router = APIRouter()


class ModelInfo(BaseModel):
    """Information about a KB-Whisper model."""

    id: str
    name: str
    description: str
    size_mb: int
    recommended: bool = False


# Available KB-Whisper models
KB_WHISPER_MODELS: list[ModelInfo] = [
    ModelInfo(
        id="KBLab/kb-whisper-tiny",
        name="Supersnabb",
        description="Snabbast, men lagre noggrannhet. Bra for snabb genomgang.",
        size_mb=150,
    ),
    ModelInfo(
        id="KBLab/kb-whisper-base",
        name="Snabb",
        description="Snabb bearbetning med acceptabel noggrannhet.",
        size_mb=290,
    ),
    ModelInfo(
        id="KBLab/kb-whisper-small",
        name="Balanserad",
        description="God balans mellan hastighet och noggrannhet. Rekommenderas for de flesta.",
        size_mb=970,
        recommended=True,
    ),
    ModelInfo(
        id="KBLab/kb-whisper-medium",
        name="Noggrann",
        description="Hog noggrannhet, langre bearbetningstid.",
        size_mb=3000,
    ),
    ModelInfo(
        id="KBLab/kb-whisper-large",
        name="Precision",
        description="Hogsta noggrannhet, langst bearbetningstid. For viktiga intervjuer.",
        size_mb=6000,
    ),
]


class SystemStatus(BaseModel):
    """System status information."""

    gpu_available: bool
    gpu_name: str | None = None
    cuda_version: str | None = None
    recommended_compute_type: str


@router.get("", response_model=list[ModelInfo])
async def list_models() -> list[ModelInfo]:
    """List available KB-Whisper models."""
    return KB_WHISPER_MODELS


@router.get("/system", response_model=SystemStatus)
async def get_system_status() -> SystemStatus:
    """Get system information including GPU availability."""
    if not TORCH_AVAILABLE:
        return SystemStatus(
            gpu_available=False,
            recommended_compute_type="int8",
        )

    gpu_available = torch.cuda.is_available()

    if gpu_available:
        return SystemStatus(
            gpu_available=True,
            gpu_name=torch.cuda.get_device_name(0),
            cuda_version=torch.version.cuda,
            recommended_compute_type="float16",
        )

    return SystemStatus(
        gpu_available=False,
        recommended_compute_type="int8",
    )
