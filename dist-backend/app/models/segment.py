"""Transcription segment model."""

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.job import Job
    from app.models.word import Word


class Segment(Base):
    """Transcription segment database model."""

    __tablename__ = "segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )

    # Segment data
    segment_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    anonymized_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    speaker: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="segments")
    words: Mapped[list["Word"]] = relationship(
        "Word", back_populates="segment", cascade="all, delete-orphan"
    )
