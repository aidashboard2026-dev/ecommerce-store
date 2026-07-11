import logging

logger = logging.getLogger("app.core.normalization")

# My Designers-specific alias configuration mappings.
# Keys are lowercased. Values are standardized Title Case equivalents.
AURASTORE_COMPOUND_MAPPINGS = {
    "tshirt": "T Shirt",
    "t/shirt": "T Shirt",
    "tshirts": "T Shirts",
    "t/shirts": "T Shirts",
    "trackpant": "Track Pant",
    "trackpants": "Track Pants",
    "coffeemug": "Coffee Mug",
}


def validate_mydesigners_aliases(mappings: dict) -> None:
    """
    Performs startup-time audit of the My Designers alias configuration.
    Reports redundant, self-referencing, duplicate, or circular mappings.
    """
    from app.shared.normalization.rules.whitespace import clean_whitespace
    from app.shared.normalization.rules.separator import normalize_separators
    from app.shared.normalization.rules.casing import case_fold
    
    for alias, target in list(mappings.items()):
        alias_cleaned = clean_whitespace(alias).lower()
        target_cleaned = clean_whitespace(target).lower()
        
        # 1. Self-reference check
        if alias_cleaned == target_cleaned:
            logger.warning(
                f"[Normalization Config Warning] Self-referencing alias found: '{alias}' -> '{target}'"
            )
            
        # 2. Redundancy check (generic separators + casing yield target)
        try:
            sep_normalized = normalize_separators(alias_cleaned)
            generic_normalized = case_fold(sep_normalized, mode="title")
            if generic_normalized.lower() == target_cleaned:
                logger.warning(
                    f"[Normalization Config Warning] Redundant alias found: '{alias}' -> '{target}'. "
                    f"Generic normalization pipeline already resolves this to '{generic_normalized}'."
                )
        except Exception:
            pass

        # 3. Circular/transitive validation
        visited = {alias_cleaned}
        curr = target_cleaned
        depth = 0
        while curr in mappings:
            curr_target = mappings[curr].strip().lower()
            if curr_target in visited:
                logger.error(
                    f"[Normalization Config Error] Circular dependency loop detected: "
                    f"'{alias}' transitively maps back to '{curr_target}'"
                )
                break
            visited.add(curr_target)
            curr = curr_target
            depth += 1
            if depth > 10:
                logger.error(
                    f"[Normalization Config Error] Transitive mapping path too deep for alias: '{alias}'"
                )
                break
