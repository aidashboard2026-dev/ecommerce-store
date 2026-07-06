from typing import Optional
from ..registry import AliasRegistry

# Default global/thread-safe registry instance
default_registry = AliasRegistry()

def resolve_alias(term: str, registry: Optional[AliasRegistry] = None) -> str:
    """
    Resolves an input term alias mapping to its canonical target.
    
    Purpose:
        Evaluate synonyms or alternative forms of names and map them to a 
        standardized, singular database canonical value (e.g. "tshirt" -> "T Shirt").
        
    Inputs:
        term (str): The string term to resolve.
        registry (Optional[AliasRegistry]): The in-memory registry to query. 
                                             If None, uses the global default registry.
                                             
    Outputs:
        str: Resolved canonical value if an alias is matched, otherwise the original term.
        
    Guarantees:
        - Thread safety (delegated to the registry's lock).
        - Case insensitivity (delegated to the registry's lowercase index lookup).
        
    Edge Cases:
        - If the registry contains no mappings, returns the input term unchanged.
        - If input is empty or has spacing, the lookup checks exactly the stripped, 
          lowercased form.
    """
    reg = registry or default_registry
    resolved = reg.get_target(term)
    return resolved if resolved is not None else term
