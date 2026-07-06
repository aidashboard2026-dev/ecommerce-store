from ..constants import RE_SEPARATORS, RE_WHITESPACE

def normalize_separators(raw_str: str) -> str:
    """
    Normalizes separator characters (hyphens, underscores) to space separators.
    
    Purpose:
        Unify punctuation separators into single spaces for display title casing.
        
    Parameters:
        raw_str (str): The input string to process.
        
    Returns:
        str: Separator-normalized string.
        
    Examples:
        >>> normalize_separators("cotton_plain-tshirt")
        "cotton plain tshirt"
        
    Guarantees:
        - Collapses repeated separator runs (e.g. "--__--" -> " ").
        - Replaces all occurrences of hyphens and underscores with spaces.
    """
    if not raw_str:
        return ""
        
    # Replace sequence of separators with space
    val = RE_SEPARATORS.sub(" ", raw_str)
    # Collapse any resulting spaces and trim boundaries
    return RE_WHITESPACE.sub(" ", val).strip()
