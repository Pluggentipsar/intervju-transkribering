"""Anonymization service using KB BERT NER for Swedish text."""

import logging
from collections.abc import Callable
from functools import lru_cache

logger = logging.getLogger(__name__)

# Entity type mappings
ENTITY_LABELS = {
    "PRS": "PERSON",
    "LOC": "PLATS",
    "ORG": "ORGANISATION",
    "TME": "DATUM",
    "EVN": "HÄNDELSE",
}


@lru_cache(maxsize=1)
def get_ner_pipeline():
    """Load and cache the KB BERT NER model."""
    try:
        from transformers import pipeline

        logger.info("Loading KB BERT NER model...")
        ner = pipeline(
            "ner",
            model="KBLab/bert-base-swedish-cased-ner",
            tokenizer="KBLab/bert-base-swedish-cased-ner",
            aggregation_strategy="simple",
        )
        logger.info("KB BERT NER model loaded successfully")
        return ner
    except Exception as e:
        logger.error(f"Failed to load NER model: {e}")
        raise


def is_anonymization_available() -> bool:
    """Check if anonymization dependencies are available."""
    try:
        import transformers  # noqa: F401
        return True
    except ImportError:
        return False


def anonymize_text(text: str, ner_pipeline, person_counter: dict) -> str:
    """
    Anonymize a single text string by replacing named entities.

    Args:
        text: The text to anonymize
        ner_pipeline: The loaded NER pipeline
        person_counter: Dict to track person names for consistent replacement

    Returns:
        Anonymized text with entities replaced
    """
    if not text.strip():
        return text

    try:
        entities = ner_pipeline(text)
    except Exception as e:
        logger.warning(f"NER failed for text: {e}")
        return text

    if not entities:
        return text

    # Sort entities by start position (reverse order for replacement)
    entities = sorted(entities, key=lambda x: x["start"], reverse=True)

    anonymized = text
    for entity in entities:
        entity_type = entity.get("entity_group", "")
        original_text = entity.get("word", "")
        start = entity.get("start", 0)
        end = entity.get("end", 0)

        # Skip low confidence entities
        if entity.get("score", 0) < 0.7:
            continue

        # Get replacement label
        if entity_type == "PRS":
            # Track persons for consistent numbering
            if original_text not in person_counter:
                person_counter[original_text] = len(person_counter) + 1
            replacement = f"[PERSON {person_counter[original_text]}]"
        elif entity_type in ENTITY_LABELS:
            replacement = f"[{ENTITY_LABELS[entity_type]}]"
        else:
            continue

        # Replace in text
        anonymized = anonymized[:start] + replacement + anonymized[end:]

    return anonymized


def anonymize_segments(
    segments: list[dict],
    progress_callback: Callable[[int, str], None] | None = None,
) -> list[dict]:
    """
    Anonymize sensitive information in transcription segments.

    Args:
        segments: List of segment dicts with 'text' field
        progress_callback: Optional callback for progress updates

    Returns:
        Segments with 'anonymized_text' field added
    """
    if not is_anonymization_available():
        logger.warning("Anonymization not available - transformers not installed, skipping")
        # Update progress to skip anonymization range (90% -> 95%)
        if progress_callback:
            progress_callback(95, "anonymization_skipped")
        return segments

    if progress_callback:
        progress_callback(90, "loading_anonymization_model")

    try:
        ner_pipeline = get_ner_pipeline()
    except Exception as e:
        logger.error(f"Could not load NER model: {e}")
        return segments

    if progress_callback:
        progress_callback(92, "anonymizing")

    # Track person names across all segments for consistent numbering
    person_counter: dict[str, int] = {}

    total = len(segments)
    for i, segment in enumerate(segments):
        original_text = segment.get("text", "")
        segment["anonymized_text"] = anonymize_text(
            original_text, ner_pipeline, person_counter
        )

        # Update progress (92-95% range)
        if progress_callback and total > 0:
            sub_progress = 92 + int((i + 1) / total * 3)
            progress_callback(sub_progress, "anonymizing")

    if progress_callback:
        progress_callback(95, "anonymization_complete")

    logger.info(f"Anonymized {total} segments, found {len(person_counter)} unique persons")
    return segments
