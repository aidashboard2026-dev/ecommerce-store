import re
from typing import Any, List, Optional
from fastapi import HTTPException, status

# Central mapping for compound words or special normalization cases.
# Keys are in lowercase. Values are the desired output format (Title Case).
COMPOUND_WORD_MAPPINGS = {
    "tshirt": "T Shirt",
    "t shirt": "T Shirt",
    "tshirts": "T Shirts",
    "t shirts": "T Shirts",
    "trackpant": "Track Pant",
    "track pant": "Track Pant",
    "trackpants": "Track Pants",
    "track pants": "Track Pants",
    "coffeemug": "Coffee Mug",
    "coffee mug": "Coffee Mug",
}

def normalize_name(name: str) -> str:
    """
    Normalizes a Category, Collection, or Sub Collection name according to the following rules:
    1. Trim leading and trailing whitespace.
    2. Replace underscores (_) with spaces.
    3. Replace hyphens (-) with spaces.
    4. Collapse multiple spaces into a single space.
    5. Convert to Title Case (preserving custom capitalized compound words).
    6. Normalize common compound words (e.g. tshirt -> T Shirt, trackpant -> Track Pant).
    """
    if not name:
        return ""
    
    # 1. Trim leading/trailing whitespace
    val = name.strip()
    
    # 2 & 3. Replace underscores (_) and hyphens (-) with spaces
    val = val.replace("_", " ").replace("-", " ")
    
    # 4. Collapse multiple spaces into a single space
    val = re.sub(r"\s+", " ", val)
    
    # 5. Check if the entire string (lowercased) matches a compound mapping
    val_lower = val.lower()
    if val_lower in COMPOUND_WORD_MAPPINGS:
        return COMPOUND_WORD_MAPPINGS[val_lower]
        
    # 6. Otherwise, split into words, capitalize/normalize each word, and join
    words = val.split()
    normalized_words = []
    for w in words:
        w_lower = w.lower()
        if w_lower in COMPOUND_WORD_MAPPINGS:
            normalized_words.append(COMPOUND_WORD_MAPPINGS[w_lower])
        else:
            if len(w) > 0:
                # Title Case: capitalize first letter, lowercase the rest
                normalized_words.append(w[0].upper() + w[1:].lower())
            
    # Join with space and collapse any multiple spaces (in case a compound word mapping inserted spaces)
    final_val = " ".join(normalized_words)
    return re.sub(r"\s+", " ", final_val)


def get_search_terms(search: str) -> List[str]:
    """
    Centralized search query parser that splits the search query into logical normalized terms.
    Ensures that searches are case-insensitive, normalization-aware, and formatting-insensitive.
    """
    if not search:
        return []
        
    # Normalize the entire search query first
    normalized = normalize_name(search)
    if not normalized:
        return []
        
    # Find unique compound values sorted by length descending (to match longest first)
    compound_values = sorted(list(set(COMPOUND_WORD_MAPPINGS.values())), key=len, reverse=True)
    
    terms = []
    temp_str = normalized
    
    # Extract compound values first
    for cv in compound_values:
        pattern = r'\b' + re.escape(cv) + r'\b'
        if re.search(pattern, temp_str, re.IGNORECASE):
            terms.append(cv)
            temp_str = re.sub(pattern, ' ', temp_str, flags=re.IGNORECASE)
            
    # Split the remaining string by spaces to get other individual words
    other_words = [w.strip() for w in temp_str.split() if w.strip()]
    for w in other_words:
        terms.append(w)
        
    return terms


def check_duplicate_catalog_item(
    query: Any,
    name_to_check: str,
    name_attr: str = "name",
    id_attr: str = "id",
    exclude_id: Optional[int] = None,
    item_type: str = "Category"
) -> None:
    """
    Centralized duplicate validation engine for categories, collections, etc.
    Always performs duplicate checking after normalization.
    """
    norm_new = normalize_name(name_to_check)
    if not norm_new:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{item_type} name cannot be empty or whitespace only."
        )
        
    if exclude_id is not None:
        model_class = query.column_descriptions[0]['expr']
        query = query.filter(getattr(model_class, id_attr) != exclude_id)
        
    for item in query.all():
        item_name = getattr(item, name_attr)
        if normalize_name(item_name).lower() == norm_new.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{item_type} already exists."
            )
