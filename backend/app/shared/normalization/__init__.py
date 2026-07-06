"""
Backend Normalization Package

Purpose:
    A pure Python domain package that orchestrates string normalization,
    unicode folding, separator pruning, and slug generation.
    Contains zero external framework (SQLAlchemy, FastAPI, Pydantic) dependencies.
"""

from .exceptions import (
    NormalizationError,
    ValidationError,
    ReservedWordError,
    AliasConflictError,
)
from .models import CanonicalEntity, NormalizationResult
from .registry import AliasRegistry
from .slug import generate_slug
from .engine import NormalizationEngine

# Global singleton/default normalization engine instance
_default_engine = NormalizationEngine()

def normalize(raw_name: str, case_mode: str = "title") -> NormalizationResult:
    """
    Public API facade to normalize a string and return a NormalizationResult DTO.
    
    Purpose:
        Safe wrapper for pipeline execution returning success/error properties.
    """
    return _default_engine.normalize(raw_name, case_mode=case_mode)


def normalize_name(raw_name: str, case_mode: str = "title") -> CanonicalEntity:
    """
    Public API facade to normalize a string name, raising exceptions on validation/reserved errors.
    
    Purpose:
        Main entry point for product names, category names, or collections.
    """
    return _default_engine.normalize_name(raw_name, case_mode=case_mode)


def normalize_email(raw_email: str) -> str:
    """
    Public API facade to normalize email strings.
    
    Purpose:
        Standardize signup and registration email queries.
    """
    return _default_engine.normalize_email(raw_email)


def get_search_terms(search: str) -> list[str]:
    """
    Centralized search query parser that splits the search query into logical normalized terms.
    Uses the default alias registry dynamically to remain domain-agnostic.
    """
    if not search:
        return []
        
    try:
        normalized = normalize_name(search).canonical_name
    except Exception:
        normalized = search
        
    if not normalized:
        return []
        
    from .rules.aliases import default_registry
    with default_registry._lock:
        targets = list(default_registry._registry.values())
    compound_values = sorted(list(set(targets)), key=len, reverse=True)
    
    import re
    terms = []
    temp_str = normalized
    
    for cv in compound_values:
        pattern = r'\b' + re.escape(cv) + r'\b'
        if re.search(pattern, temp_str, re.IGNORECASE):
            terms.append(cv)
            temp_str = re.sub(pattern, ' ', temp_str, flags=re.IGNORECASE)
            
    other_words = [w.strip() for w in temp_str.split() if w.strip()]
    for w in other_words:
        terms.append(w)
        
    return terms


__all__ = [
    "normalize",
    "normalize_name",
    "normalize_email",
    "generate_slug",
    "get_search_terms",
    "CanonicalEntity",
    "NormalizationResult",
    "AliasRegistry",
    "NormalizationEngine",
    "NormalizationError",
    "ValidationError",
    "ReservedWordError",
    "AliasConflictError",
]
