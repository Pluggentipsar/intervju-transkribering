"""File upload endpoints."""

import shutil
from pathlib import Path
from uuid import uuid4

import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, status

from app.config import settings
from app.schemas.upload import UploadResponse

router = APIRouter()

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"}
MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024  # Convert to bytes


@router.post("", response_model=UploadResponse)
async def upload_file(file: UploadFile) -> UploadResponse:
    """
    Upload an audio file for transcription.

    Supported formats: MP3, WAV, M4A, OGG, FLAC, WebM
    Max file size: 2GB
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filnamn saknas",
        )

    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Filformatet stods inte. Anvand: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Generate unique file ID
    file_id = str(uuid4())
    file_path = settings.upload_dir / f"{file_id}{file_ext}"

    # Save file with size check
    total_size = 0
    try:
        async with aiofiles.open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    await f.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Filen ar for stor. Max storlek: {settings.max_file_size_mb} MB",
                    )
                await f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kunde inte spara filen: {str(e)}",
        )

    return UploadResponse(
        file_id=file_id,
        file_name=file.filename,
        file_size=total_size,
        content_type=file.content_type,
    )


@router.delete("/{file_id}")
async def delete_uploaded_file(file_id: str) -> dict[str, str]:
    """Delete an uploaded file that hasn't been processed yet."""
    # Find file with any extension
    for ext in ALLOWED_EXTENSIONS:
        file_path = settings.upload_dir / f"{file_id}{ext}"
        if file_path.exists():
            file_path.unlink()
            return {"status": "deleted", "file_id": file_id}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Filen hittades inte",
    )
