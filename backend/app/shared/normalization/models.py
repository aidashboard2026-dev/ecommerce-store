from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass(frozen=True)
class CanonicalEntity:
    """
    Data Transfer Object representing a normalized canonical entity.
    This model is immutable (frozen=True) and contains no framework dependencies.
    
    Purpose:
        Holds the final formatted name, unique keys, and slug for database insertion.
        
    Parameters:
        canonical_name (str): Standardized name in canonical case formatting.
        normalized_key (str): Lowercase alphanumeric index match key.
        slug (str): URL slug format.
        display_name (str): Sanitized title name suitable for UI.
    """
    canonical_name: str
    normalized_key: str
    slug: str
    display_name: str

    @property
    def is_empty(self) -> bool:
        """Checks if the entity has empty fields."""
        return not self.canonical_name or not self.slug

    @property
    def is_reserved(self) -> bool:
        """Checks if the generated slug is reserved by the system."""
        from .constants import RESERVED_SLUGS
        return self.slug in RESERVED_SLUGS


@dataclass(frozen=True)
class NormalizationResult:
    """
    Wrapper representing the outcome of a normalization pipeline run.
    
    Purpose:
        Convey status, DTO data, validation errors, warnings, and rule tracing.
        
    Parameters:
        success (bool): Indicates if the normalization was successful.
        entity (Optional[CanonicalEntity]): The resolved DTO when success is True.
        error_message (Optional[str]): Error details if success is False.
        warnings (List[str]): Minor warnings emitted during execution.
        rule_trace (List[str]): List of pipeline stages executed for auditing/observability.
        metadata (Dict[str, Any]): Lightweight telemetry (execution time, engine version, slug_metadata).
    """
    success: bool
    entity: Optional[CanonicalEntity] = None
    error_message: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    rule_trace: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def has_warnings(self) -> bool:
        """Returns True if any warnings were generated during normalization."""
        return len(self.warnings) > 0
