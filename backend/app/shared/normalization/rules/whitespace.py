from ..exceptions import ValidationError
from ..constants import RE_WHITESPACE

def clean_whitespace(raw_str: str) -> str:
    """
    Trims leading and trailing spaces and collapses all interior whitespace sequences.
    
    Purpose:
        Strip all noise caused by duplicate formatting, spacing, and carriage characters.
        
    Parameters:
        raw_str (str): The raw string to clean.
        
    Returns:
        str: The trimmed string with collapsed whitespace.
        
    Raises:
        ValidationError: If the resulting string is empty or contains only whitespace characters.
        
    Examples:
        >>> clean_whitespace("  hello \n \t world  ")
        "hello world"
        
    Guarantees:
        - Output has no leading or trailing whitespace.
        - Output contains no multiple consecutive spacing characters.
        - Handles non-breaking spaces (\xa0) and zero-width spaces.
        
    Edge Cases:
        - If raw_str resolves to an empty string, raises ValidationError.
    """
    if raw_str is None:
        raise ValidationError("Input string cannot be None.")

    val = RE_WHITESPACE.sub(" ", raw_str).strip()
    
    if not val:
        raise ValidationError("Input string cannot be empty or whitespace only.")
        
    return val
