"""Standalone text anonymization endpoint."""

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.anonymization import (
    NER_ENTITY_TYPES,
    anonymize_text,
    get_ner_pipeline,
    is_anonymization_available,
    pattern_anonymize_text,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class NerEntityTypesConfig(BaseModel):
    """Configuration for which NER entity types to anonymize."""

    persons: bool = True  # Person names
    locations: bool = True  # Locations/places
    organizations: bool = True  # Organizations
    dates: bool = True  # Time expressions/dates
    events: bool = True  # Events


class TextAnonymizationRequest(BaseModel):
    """Request schema for text anonymization."""

    text: str
    use_ner: bool = True
    ner_entity_types: NerEntityTypesConfig = NerEntityTypesConfig()
    use_institution_patterns: bool = True
    use_format_patterns: bool = True
    custom_patterns: list[tuple[str, str]] = []
    custom_words: list[tuple[str, str]] = []


class TextAnonymizationResponse(BaseModel):
    """Response schema for text anonymization."""

    original_text: str
    anonymized_text: str
    ner_applied: bool
    patterns_applied: dict[str, bool]
    entities_found: int
    patterns_matched: int


@router.post("", response_model=TextAnonymizationResponse)
async def anonymize_text_endpoint(
    request: TextAnonymizationRequest,
) -> TextAnonymizationResponse:
    """
    Anonymize text without transcription.

    This endpoint allows users to paste text and get it anonymized using:
    1. KB-BERT NER (optional) - identifies names, locations, organizations
    2. Pattern-based anonymization - catches institutions, personnummer, etc.
    """
    if not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Texten kan inte vara tom",
        )

    result_text = request.text
    ner_applied = False
    entities_found = 0

    # Step 1: Apply KB-BERT NER if enabled and available
    if request.use_ner:
        if is_anonymization_available():
            try:
                logger.info("Applying KB-BERT NER anonymization...")
                ner_pipeline = get_ner_pipeline()
                person_counter: dict[str, int] = {}

                # Build set of enabled entity types
                entity_types: set[str] = set()
                ner_config = request.ner_entity_types
                if ner_config.persons:
                    entity_types.add("persons")
                if ner_config.locations:
                    entity_types.add("locations")
                if ner_config.organizations:
                    entity_types.add("organizations")
                if ner_config.dates:
                    entity_types.add("dates")
                if ner_config.events:
                    entity_types.add("events")

                # Count entities before anonymization (only for enabled types)
                try:
                    entities = ner_pipeline(request.text)
                    # Build allowed labels based on selected types
                    allowed_labels: set[str] = set()
                    for type_name in entity_types:
                        if type_name in NER_ENTITY_TYPES:
                            allowed_labels.update(NER_ENTITY_TYPES[type_name])
                    entities_found = len([
                        e for e in entities
                        if e.get("score", 0) >= 0.7 and e.get("entity_group", "") in allowed_labels
                    ])
                except Exception:
                    pass

                result_text = anonymize_text(
                    result_text, ner_pipeline, person_counter, entity_types if entity_types else None
                )
                ner_applied = True
                logger.info(f"NER anonymization complete, found {len(person_counter)} persons")
            except Exception as e:
                logger.error(f"NER anonymization failed: {e}")
                # Continue with pattern-based anonymization
        else:
            logger.warning("NER not available, skipping")

    # Step 2: Apply pattern-based anonymization
    text_before_patterns = result_text

    if request.use_institution_patterns or request.use_format_patterns or request.custom_patterns or request.custom_words:
        logger.info("Applying pattern-based anonymization...")
        result_text = pattern_anonymize_text(
            result_text,
            use_institution_patterns=request.use_institution_patterns,
            use_format_patterns=request.use_format_patterns,
            custom_patterns=request.custom_patterns if request.custom_patterns else None,
            custom_words=request.custom_words if request.custom_words else None,
        )

    # Count pattern matches (rough estimate based on bracket count difference)
    patterns_matched = result_text.count("[") - text_before_patterns.count("[")
    if patterns_matched < 0:
        patterns_matched = 0

    return TextAnonymizationResponse(
        original_text=request.text,
        anonymized_text=result_text,
        ner_applied=ner_applied,
        patterns_applied={
            "ner": ner_applied,
            "institution_patterns": request.use_institution_patterns,
            "format_patterns": request.use_format_patterns,
            "custom_patterns": bool(request.custom_patterns),
            "custom_words": bool(request.custom_words),
        },
        entities_found=entities_found,
        patterns_matched=patterns_matched,
    )


@router.get("/status")
async def get_anonymization_status() -> dict:
    """Check if anonymization features are available."""
    return {
        "ner_available": is_anonymization_available(),
        "pattern_anonymization_available": True,
        "ner_entity_types": {
            "persons": {"label": "Personnamn", "description": "Namn på personer"},
            "locations": {"label": "Platser", "description": "Geografiska platser och adresser"},
            "organizations": {"label": "Organisationer", "description": "Företag, myndigheter, föreningar"},
            "dates": {"label": "Datum/tid", "description": "Tidsuttryck och datum"},
            "events": {"label": "Händelser", "description": "Namngivna händelser"},
        },
    }
