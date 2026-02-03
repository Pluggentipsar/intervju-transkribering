"""Anonymization service using KB BERT NER for Swedish text."""

import logging
import re
from collections.abc import Callable
from functools import lru_cache

logger = logging.getLogger(__name__)


# =============================================================================
# Pattern-based anonymization (enhanced, separate step)
# =============================================================================

# Swedish institution patterns with contextual labels
INSTITUTION_PATTERNS: list[tuple[str, str]] = [
    # Schools and education
    (r"\b\w*gymnasiet\b", "[GYMNASIESKOLA]"),
    (r"\b\w*gymnasium\b", "[GYMNASIESKOLA]"),
    (r"\b\w*skolan\b", "[SKOLA]"),
    (r"\b\w*skola\b", "[SKOLA]"),
    (r"\b\w*universitetet\b", "[UNIVERSITET]"),
    (r"\b\w*universitet\b", "[UNIVERSITET]"),
    (r"\b\w*högskolan\b", "[HÖGSKOLA]"),
    (r"\b\w*högskola\b", "[HÖGSKOLA]"),
    (r"\b\w*förskolan\b", "[FÖRSKOLA]"),
    (r"\b\w*förskola\b", "[FÖRSKOLA]"),
    (r"\b\w*folkhögskolan\b", "[FOLKHÖGSKOLA]"),
    (r"\b\w*folkhögskola\b", "[FOLKHÖGSKOLA]"),
    # Healthcare
    (r"\b\w*sjukhuset\b", "[SJUKHUS]"),
    (r"\b\w*sjukhus\b", "[SJUKHUS]"),
    (r"\b\w*vårdcentralen\b", "[VÅRDCENTRAL]"),
    (r"\b\w*vårdcentral\b", "[VÅRDCENTRAL]"),
    (r"\b\w*kliniken\b", "[KLINIK]"),
    (r"\b\w*klinik\b", "[KLINIK]"),
    (r"\b\w*mottagningen\b", "[MOTTAGNING]"),
    (r"\b\w*mottagning\b", "[MOTTAGNING]"),
    # Government and municipalities
    (r"\b\w*kommunen\b", "[KOMMUN]"),
    (r"\b\w*kommun\b", "[KOMMUN]"),
    (r"\b\w*regionen\b", "[REGION]"),
    (r"\b\w*region\b", "[REGION]"),
    (r"\b\w*myndigheten\b", "[MYNDIGHET]"),
    (r"\b\w*verket\b", "[MYNDIGHET]"),
    # Companies and organizations
    (r"\b\w*bolaget\b", "[FÖRETAG]"),
    (r"\b\w*företaget\b", "[FÖRETAG]"),
    (r"\b\w*AB\b", "[FÖRETAG]"),
    (r"\b\w*föreningen\b", "[FÖRENING]"),
    (r"\b\w*förening\b", "[FÖRENING]"),
    (r"\b\w*stiftelsen\b", "[STIFTELSE]"),
    (r"\b\w*stiftelse\b", "[STIFTELSE]"),
    # Places
    (r"\b\w*gatan\b", "[GATUADRESS]"),
    (r"\b\w*vägen\b", "[GATUADRESS]"),
    (r"\b\w*allén\b", "[GATUADRESS]"),
    (r"\b\w*torget\b", "[PLATS]"),
    (r"\b\w*parken\b", "[PLATS]"),
]

# Common dash characters: hyphen, en-dash, em-dash, Unicode hyphen
_DASH = r"[\-\u2010\u2011\u2012\u2013\u2014]"
# Separator: dash or space
_SEP = r"[\-\u2010\u2011\u2012\u2013\u2014\s]"

# Format patterns (personnummer, phone, email, etc.)
# Note: Patterns are ordered by specificity - more specific patterns first
FORMAT_PATTERNS: list[tuple[str, str]] = [
    # Swedish personnummer (YYYYMMDD-XXXX or YYMMDD-XXXX)
    # Supports various dash characters (-, –, —) and spaces
    (rf"\b\d{{8}}{_DASH}?\d{{4}}\b", "[PERSONNUMMER]"),
    (
        rf"\b\d{{6}}{_DASH}\d{{4}}\b",
        "[PERSONNUMMER]",
    ),  # Require dash for 6-digit to avoid false positives
    # Swedish phone numbers (must come before postal codes to avoid conflicts)
    # Mobile: 07X-XXX XX XX or 07X XXX XX XX (with various separators)
    (rf"\b07\d{_SEP}?\d{{3}}{_SEP}?\d{{2}}{_SEP}?\d{{2}}\b", "[TELEFONNUMMER]"),
    # Landline with area code: 0XX-XXX XX XX
    (rf"\b0\d{{1,2}}{_SEP}\d{{2,3}}{_SEP}?\d{{2}}{_SEP}?\d{{2}}\b", "[TELEFONNUMMER]"),
    # International format: +46 XX XXX XX XX
    (rf"\b\+46{_SEP}?\d{{1,3}}{_SEP}?\d{{2,3}}{_SEP}?\d{{2}}{_SEP}?\d{{2}}\b", "[TELEFONNUMMER]"),
    # Email addresses
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[E-POST]"),
    # Postal codes (Swedish: XXX XX) - only match when followed by uppercase (city name)
    # This reduces false positives with phone numbers
    (r"\b\d{3}\s\d{2}(?=\s+[A-ZÅÄÖ])", "[POSTNUMMER]"),
    # Swedish dates (YYYY-MM-DD)
    (rf"\b\d{{4}}{_DASH}\d{{2}}{_DASH}\d{{2}}\b", "[DATUM]"),
    # URLs
    (r"\bhttps?://\S+\b", "[WEBBADRESS]"),
    (r"\bwww\.\S+\b", "[WEBBADRESS]"),
    # Swedish registration numbers (ABC 123 or ABC123)
    (r"\b[A-Z]{3}\s?\d{3}\b", "[REGISTRERINGSNUMMER]"),
]


def pattern_anonymize_text(
    text: str,
    use_institution_patterns: bool = True,
    use_format_patterns: bool = True,
    custom_patterns: list[tuple[str, str]] | None = None,
    custom_words: list[tuple[str, str]] | None = None,
) -> str:
    """
    Anonymize text using regex patterns.

    This is designed as a SEPARATE step after KB-BERT NER for enhanced coverage.
    Collects all matches first, then replaces from end to start to avoid
    overlapping replacements causing double-bracket issues.

    Args:
        text: The text to anonymize
        use_institution_patterns: Whether to apply Swedish institution patterns
        use_format_patterns: Whether to apply format patterns (personnummer, phone, etc.)
        custom_patterns: Additional regex patterns as (pattern, replacement) tuples
        custom_words: Exact word replacements as (word, replacement) tuples

    Returns:
        Anonymized text
    """
    if not text.strip():
        return text

    # Collect all matches as (start, end, replacement) tuples
    matches: list[tuple[int, int, str]] = []

    # Collect custom word matches first (case-insensitive)
    if custom_words:
        for word, replacement in custom_words:
            pattern = re.compile(r"\b" + re.escape(word) + r"\b", re.IGNORECASE)
            for match in pattern.finditer(text):
                matches.append((match.start(), match.end(), replacement))

    # Collect institution pattern matches
    if use_institution_patterns:
        for pattern_str, replacement in INSTITUTION_PATTERNS:
            pattern = re.compile(pattern_str, re.IGNORECASE)
            for match in pattern.finditer(text):
                matches.append((match.start(), match.end(), replacement))

    # Collect format pattern matches
    if use_format_patterns:
        for pattern_str, replacement in FORMAT_PATTERNS:
            pattern = re.compile(pattern_str)
            for match in pattern.finditer(text):
                matches.append((match.start(), match.end(), replacement))

    # Collect custom regex pattern matches
    if custom_patterns:
        for pattern_str, replacement in custom_patterns:
            try:
                pattern = re.compile(pattern_str, re.IGNORECASE)
                for match in pattern.finditer(text):
                    matches.append((match.start(), match.end(), replacement))
            except re.error as e:
                logger.warning(f"Invalid custom pattern '{pattern_str}': {e}")

    if not matches:
        return text

    # Sort by start position (descending) to replace from end to start
    # This prevents position shifts from affecting later replacements
    matches.sort(key=lambda x: x[0], reverse=True)

    # Remove overlapping matches (keep the first/longest one found)
    filtered_matches: list[tuple[int, int, str]] = []
    for start, end, replacement in matches:
        # Check if this match overlaps with any already-kept match
        overlaps = False
        for kept_start, kept_end, _ in filtered_matches:
            if not (end <= kept_start or start >= kept_end):
                overlaps = True
                break
        if not overlaps:
            filtered_matches.append((start, end, replacement))

    # Apply replacements from end to start
    result = text
    for start, end, replacement in filtered_matches:
        result = result[:start] + replacement + result[end:]

    return result


def enhanced_anonymize_segments(
    segments: list[dict],
    use_institution_patterns: bool = True,
    use_format_patterns: bool = True,
    custom_patterns: list[tuple[str, str]] | None = None,
    custom_words: list[tuple[str, str]] | None = None,
    source_field: str = "text",
    target_field: str = "enhanced_anonymized_text",
) -> list[dict]:
    """
    Apply pattern-based anonymization to transcription segments.

    This is a SEPARATE step intended to run after initial transcription,
    either on original text or on already NER-anonymized text.

    Args:
        segments: List of segment dicts
        use_institution_patterns: Apply Swedish institution patterns
        use_format_patterns: Apply format patterns (personnummer, etc.)
        custom_patterns: Additional regex patterns
        custom_words: Exact word replacements
        source_field: Field to read text from ("text" or "anonymized_text")
        target_field: Field to write result to

    Returns:
        Segments with target_field populated
    """
    logger.info(f"Enhanced anonymization: processing {len(segments)} segments")
    logger.info(f"  Institution patterns: {use_institution_patterns}")
    logger.info(f"  Format patterns: {use_format_patterns}")
    logger.info(f"  Custom patterns: {len(custom_patterns) if custom_patterns else 0}")
    logger.info(f"  Custom words: {len(custom_words) if custom_words else 0}")

    changes_made = 0

    for segment in segments:
        source_text = segment.get(source_field, segment.get("text", ""))
        anonymized = pattern_anonymize_text(
            source_text,
            use_institution_patterns=use_institution_patterns,
            use_format_patterns=use_format_patterns,
            custom_patterns=custom_patterns,
            custom_words=custom_words,
        )
        segment[target_field] = anonymized

        if anonymized != source_text:
            changes_made += 1

    logger.info(
        f"Enhanced anonymization complete: {changes_made}/{len(segments)} segments modified"
    )
    return segments


# Entity type mappings (KB-BERT NER labels)
ENTITY_LABELS = {
    "PER": "PERSON",  # Person names
    "PRS": "PERSON",  # Alternative label
    "LOC": "PLATS",  # Locations
    "ORG": "ORGANISATION",  # Organizations
    "TME": "DATUM",  # Time expressions
    "EVN": "HÄNDELSE",  # Events
}

# Available NER entity types for filtering
NER_ENTITY_TYPES = {
    "persons": ["PER", "PRS"],  # Person names
    "locations": ["LOC"],  # Locations/places
    "organizations": ["ORG"],  # Organizations
    "dates": ["TME"],  # Time expressions/dates
    "events": ["EVN"],  # Events
}

# Default: all entity types enabled
DEFAULT_NER_ENTITY_TYPES = {"persons", "locations", "organizations", "dates", "events"}


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


def anonymize_text(
    text: str,
    ner_pipeline,
    person_counter: dict,
    entity_types: set[str] | None = None,
) -> str:
    """
    Anonymize a single text string by replacing named entities.

    Args:
        text: The text to anonymize
        ner_pipeline: The loaded NER pipeline
        person_counter: Dict to track person names for consistent replacement
        entity_types: Set of entity type categories to anonymize.
                     Options: "persons", "locations", "organizations", "dates", "events"
                     If None, all types are anonymized.

    Returns:
        Anonymized text with entities replaced
    """
    if not text.strip():
        return text

    # Determine which entity types to process
    if entity_types is None:
        entity_types = DEFAULT_NER_ENTITY_TYPES

    # Build set of allowed NER labels based on selected types
    allowed_labels: set[str] = set()
    for type_name in entity_types:
        if type_name in NER_ENTITY_TYPES:
            allowed_labels.update(NER_ENTITY_TYPES[type_name])

    if not allowed_labels:
        return text  # No entity types selected

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

        # Skip entity types not in allowed list
        if entity_type not in allowed_labels:
            continue

        # Get replacement label
        if entity_type in ("PER", "PRS"):
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
    entity_types: set[str] | None = None,
) -> list[dict]:
    """
    Anonymize sensitive information in transcription segments.

    Args:
        segments: List of segment dicts with 'text' field
        progress_callback: Optional callback for progress updates
        entity_types: Set of entity type categories to anonymize.
                     Options: "persons", "locations", "organizations", "dates", "events"
                     If None, all types are anonymized.

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
            original_text, ner_pipeline, person_counter, entity_types
        )

        # Update progress (92-95% range)
        if progress_callback and total > 0:
            sub_progress = 92 + int((i + 1) / total * 3)
            progress_callback(sub_progress, "anonymizing")

    if progress_callback:
        progress_callback(95, "anonymization_complete")

    logger.info(f"Anonymized {total} segments, found {len(person_counter)} unique persons")
    return segments
