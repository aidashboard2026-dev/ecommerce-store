"""
Rules subpackage containing string cleaning, unicode formatting, separator normalization,
case folding, and alias resolution rules.
"""

from .whitespace import clean_whitespace
from .unicode import validate_unicode, normalize_unicode
from .separator import normalize_separators
from .casing import case_fold
from .canonical import generate_canonical_key
from .aliases import resolve_alias, default_registry

__all__ = [
    "clean_whitespace",
    "validate_unicode",
    "normalize_unicode",
    "normalize_separators",
    "case_fold",
    "generate_canonical_key",
    "resolve_alias",
    "default_registry",
]
