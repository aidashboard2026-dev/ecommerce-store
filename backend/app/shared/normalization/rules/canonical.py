from ..constants import RE_WHITESPACE, RE_SEPARATORS

def generate_canonical_key(raw_str: str) -> str:
    """
    Generates a deterministic unique key independent of separators or casing.
    
    Purpose:
        Produce a formatting-insensitive index key (e.g. "cottontshirt") for checks.
        
    Parameters:
        raw_str (str): Normalized string to process.
        
    Returns:
        str: Alphanumeric lowercase key.
        
    Examples:
        >>> generate_canonical_key("Cotton-Plain T Shirt")
        "cottonplaintshirt"
        
    Guarantees:
        - Output consists of alphanumeric characters only.
        - Output is fully lowercased.
        - Stable and idempotent.
    """
    if not raw_str:
        return ""
        
    val = raw_str.lower()
    val = RE_WHITESPACE.sub("", val)
    val = RE_SEPARATORS.sub("", val)
    return "".join(c for c in val if c.isalnum())
