"""Upload-related Pydantic schemas."""

from pydantic import BaseModel


class UploadResponse(BaseModel):
    """Schema for file upload response."""

    file_id: str
    file_name: str
    file_size: int
    content_type: str | None = None
