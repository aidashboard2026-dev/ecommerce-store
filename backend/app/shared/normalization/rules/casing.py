def case_fold(raw_str: str, mode: str = "title") -> str:
    """
    Standardizes casing based on the requested target configuration.
    
    Purpose:
        Apply consistent case formatting (title case, lowercase, uppercase).
        
    Parameters:
        raw_str (str): The input string to fold.
        mode (str): Case mode - "title", "lower", "upper", or "none". Default is "title".
        
    Returns:
        str: Case folded string.
        
    Examples:
        >>> case_fold("cotton plain", mode="title")
        "Cotton Plain"
        
    Guarantees:
        - "title" mode capitalizes first character of every word and lowercases the remainder.
        - "upper" mode converts all characters to uppercase.
        - "lower" mode converts all characters to lowercase.
        - "none" mode returns input unchanged.
    """
    if not raw_str:
        return ""

    mode_lower = mode.lower()
    if mode_lower == "title":
        # Capitalize first char and lowercase the rest for each word
        words = raw_str.split()
        cased_words = []
        for w in words:
            if w:
                cased_words.append(w[0].upper() + w[1:].lower())
        return " ".join(cased_words)
    elif mode_lower == "upper":
        return raw_str.upper()
    elif mode_lower == "lower":
        return raw_str.lower()
    return raw_str
