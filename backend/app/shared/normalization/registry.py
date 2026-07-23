import threading
from abc import ABC, abstractmethod
from typing import Dict, Optional, Any
from .exceptions import AliasConflictError, ValidationError, ReservedWordError
from .constants import MAX_ALIAS_DEPTH

class BaseAliasStore(ABC):
    """
    Abstract base class defining the contract for alias mapping stores.
    
    Purpose:
        Define interface to resolve entity synonyms/aliases to canonical values.
    """
    @abstractmethod
    def get_target(self, alias: str) -> Optional[str]:
        """
        Retrieve the canonical target for an alias.
        
        Inputs:
            alias (str): The synonym string to check.
            
        Outputs:
            Optional[str]: The canonical target string, or None if mapping doesn't exist.
        """
        pass

    @abstractmethod
    def add_mapping(self, alias: str, target: str) -> None:
        """
        Add an alias-to-canonical mapping.
        
        Inputs:
            alias (str): The synonym name to register.
            target (str): The destination canonical name.
            
        Raises:
            AliasConflictError: If the alias already points to a different target.
            ValidationError: If input is self-referencing or contains invalid characters.
            ReservedWordError: If mapping uses reserved system routes.
        """
        pass

    @abstractmethod
    def initialize_aliases(self, mappings: Dict[str, str]) -> None:
        """
        Initialize/replace the in-memory cache with new mappings.
        
        Inputs:
            mappings (Dict[str, str]): Key-value pairs representing alias-to-target.
        """
        pass


class AliasRegistry(BaseAliasStore):
    """
    In-memory thread-safe implementation of BaseAliasStore.
    
    Purpose:
        Maintains local fast-lookup maps for alias/synonym mappings.
        
    Guarantees:
        - Thread-Safe: All mutations (add, remove, clear, initialize) and reads use a reentrant lock.
        - Case Insensitive: Aliases are normalized to lowercase on register and lookup.
        - Uniqueness: Prevents conflicting mapping destinations.
        - Transitive Resolution: Resolves paths down to the leaf canonical target up to MAX_ALIAS_DEPTH.
        - Loop Prevention: Blocks self-referencing or circular mappings.
        
    Edge Cases:
        - Empty string / whitespace values raise ValidationError.
        - Overwriting a mapping with the EXACT SAME target is allowed and treated as idempotent.
        - Overwriting a mapping with a DIFFERENT target raises AliasConflictError.
        - Cyclic mappings (e.g. A->B, B->C, C->A) raise AliasConflictError.
    """
    def __init__(self) -> None:
        """
        Initializes an empty thread-safe alias registry.
        """
        self._lock = threading.RLock()
        self._registry: Dict[str, str] = {}
        self._version = 0

    def get_target(self, alias: str) -> Optional[str]:
        """
        Retrieves canonical value for a given alias term, resolving transitively.
        
        Inputs:
            alias (str): The input synonym to look up.
            
        Outputs:
            Optional[str]: Transitively resolved canonical name if found, else None.
            
        Raises:
            AliasConflictError: If transitive depth limit is exceeded or circular loop is hit.
        """
        with self._lock:
            current = alias.lower()
            if current not in self._registry:
                return None
                
            visited = set()
            depth = 0
            resolved_val = None
            
            while current in self._registry:
                if depth >= MAX_ALIAS_DEPTH:
                    raise AliasConflictError(
                        f"Transitive alias resolution exceeded maximum depth of {MAX_ALIAS_DEPTH} levels."
                    )
                resolved_val = self._registry[current]
                current = resolved_val.lower()
                if current in visited:
                    raise AliasConflictError("Circular reference detected during transitive alias resolution.")
                visited.add(current)
                depth += 1
                
            return resolved_val

    def _detect_circular(self, start_alias: str, current_target: str) -> bool:
        """
        Traces down target chains to detect circular dependency loops.
        """
        visited = {start_alias.lower()}
        next_hop = current_target.lower()
        while next_hop:
            if next_hop in visited:
                return True
            visited.add(next_hop)
            next_hop = self._registry.get(next_hop)
            if next_hop:
                next_hop = next_hop.lower()
        return False

    def add_mapping(self, alias: str, target: str) -> None:
        """
        Registers an alias to a canonical name.
        
        Inputs:
            alias (str): The alias name.
            target (str): The canonical name.
            
        Raises:
            ValidationError: If input is empty, self-referencing, or contains control characters.
            ReservedWordError: If the alias is a reserved routing slug.
            AliasConflictError: If the alias conflicts with existing mappings or creates loops.
        """
        if not alias or not target:
            raise ValidationError("Alias and target must not be empty or whitespace only.")

        alias_lower = alias.strip().lower()
        target_lower = target.strip().lower()

        if alias_lower == target_lower:
            raise ValidationError(f"Self-referencing mapping is invalid: '{alias}' -> '{target}'.")

        # Dynamic runtime import to prevent sibling imports cycle issues
        from .rules.unicode import validate_unicode
        validate_unicode(alias)
        validate_unicode(target)

        from .constants import RESERVED_SLUGS
        if alias_lower in RESERVED_SLUGS:
            raise ReservedWordError(f"Cannot register reserved routing path '{alias}' as an alias.")

        with self._lock:
            if alias_lower in self._registry:
                existing_target = self._registry[alias_lower]
                if existing_target.lower() != target_lower:
                    raise AliasConflictError(
                        f"Alias '{alias}' is already mapped to target '{existing_target}'."
                    )
                return  # Idempotent write

            # Cycle checking: temporarily set and verify
            self._registry[alias_lower] = target
            if self._detect_circular(alias_lower, target_lower):
                del self._registry[alias_lower]
                raise AliasConflictError(
                    f"Registering mapping '{alias}' -> '{target}' creates a circular dependency loop."
                )

            self._version += 1

    def remove_mapping(self, alias: str) -> None:
        """
        Removes an alias registration.
        
        Inputs:
            alias (str): The alias to remove.
        """
        with self._lock:
            alias_lower = alias.lower()
            if alias_lower in self._registry:
                del self._registry[alias_lower]
                self._version += 1

    def clear(self) -> None:
        """
        Clears all mappings in the registry.
        """
        with self._lock:
            if self._registry:
                self._registry.clear()
                self._version += 1

    def initialize_aliases(self, mappings: Dict[str, str]) -> None:
        """
        Atomically replaces the existing mapping cache with new mappings.
        
        Inputs:
            mappings (Dict[str, str]): The new alias-to-canonical dictionary.
        """
        # Run validations first before committing reload
        validated_mappings = {}
        for k, v in mappings.items():
            if not k or not v:
                raise ValidationError("Alias and target mapping keys/values must not be empty.")
            k_lower = k.strip().lower()
            v_lower = v.strip().lower()
            if k_lower == v_lower:
                raise ValidationError(f"Self-referencing mapping is invalid: '{k}' -> '{v}'.")
            validated_mappings[k_lower] = v

        with self._lock:
            # We temporarily replace the registry to run cycle checks on all elements
            old_registry = self._registry
            self._registry = validated_mappings
            try:
                for k_lower, v_val in validated_mappings.items():
                    if self._detect_circular(k_lower, v_val.strip().lower()):
                        raise AliasConflictError(
                            f"Registry initialization contains cyclic dependency starting at alias: '{k_lower}'"
                        )
            except Exception:
                self._registry = old_registry
                raise

            self._version += 1

    def get_stats(self) -> Dict[str, Any]:
        """
        Exposes lightweight statistics for debugging and logging telemetry.
        
        Outputs:
            Dict[str, Any]: Key stats representing current registry status.
        """
        with self._lock:
            unique_targets = set(val.strip().lower() for val in self._registry.values())
            return {
                "alias_count": len(self._registry),
                "canonical_count": len(unique_targets),
                "registry_version": self._version,
            }
