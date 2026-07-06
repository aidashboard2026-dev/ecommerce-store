"""
Domain-specific exceptions for the normalization package.
All exceptions derive from the base NormalizationError.
"""

class NormalizationError(ValueError):
    """
    Base exception for all normalization errors.
    
    Inherits from ValueError for broad compatibility with standard Python types.
    """
    pass


class ValidationError(NormalizationError):
    """
    Raised when input validation fails (e.g., empty strings, control characters, overflow length).
    """
    pass


class ReservedWordError(NormalizationError):
    """
    Raised when a generated slug matches a system reserved routing path.
    """
    pass


class AliasConflictError(NormalizationError):
    """
    Raised when a mapping conflict occurs in the alias registry.
    """
    pass
