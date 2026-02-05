"""Word-level transcription model for audio editing."""

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.segment import Segment


class Word(Base):
    """Word-level transcription with precise timestamps."""

    __tablename__ = "words"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    segment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("segments.id", ondelete="CASCADE"), nullable=False
    )

    # Word data
    word_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    text: Mapped[str] = mapped_column(String(200), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Editing state - whether this word is included in edited output
    included: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    segment: Mapped["Segment"] = relationship("Segment", back_populates="words")
