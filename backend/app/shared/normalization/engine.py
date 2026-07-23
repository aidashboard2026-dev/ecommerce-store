import time
from typing import Optional, List, Dict, Any
from .models import CanonicalEntity, NormalizationResult
from .rules.whitespace import clean_whitespace
from .rules.unicode import validate_unicode, normalize_unicode
from .rules.separator import normalize_separators
from .rules.casing import case_fold
from .rules.canonical import generate_canonical_key
from .rules.aliases import resolve_alias
from .slug import generate_slug
from .registry import AliasRegistry
from .exceptions import ValidationError, ReservedWordError, NormalizationError
from .constants import MAX_TITLE_LENGTH, MAX_EMAIL_LENGTH

class NormalizationEngine:
    """
    Core normalization execution pipeline.
    
    Purpose:
        Single orchestration point for all name and email normalization requests.
        
    Pipeline Order:
        Input -> Validation -> Whitespace -> Unicode -> Separator -> Alias Resolution -> Case -> Canonical Key -> Slug -> CanonicalEntity -> NormalizationResult
        
    Guarantees:
        - Stateless: Holds no request state. Thread-safe execution.
        - Idempotent: Repeated executions yield identical outputs.
        - Clean Architecture: Free of SQLAlchemy, FastAPI, or Pydantic.
        - Observability: Records execution stages, warning flags, and microsecond latencies.
    """
    def __init__(self, registry: Optional[AliasRegistry] = None) -> None:
        """
        Initializes the engine with an optional alias registry.
        
        Parameters:
            registry (Optional[AliasRegistry]): In-memory alias mappings registry.
        """
        self.registry = registry
        self.version = "1.0.0"

    def normalize_name(self, raw_name: str, case_mode: str = "title") -> CanonicalEntity:
        """
        Runs the full name normalization pipeline, raising exceptions on validation failures.
        
        Parameters:
            raw_name (str): The raw string name.
            case_mode (str): Casing style ('title', 'upper', 'lower', 'none').
            
        Returns:
            CanonicalEntity: The immutable, frozen canonical DTO.
            
        Raises:
            ValidationError: If input fails length or character validation rules.
            ReservedWordError: If the resulting slug matches a system reserved word.
        """
        result = self._run_pipeline(raw_name, case_mode=case_mode)
        if not result.success:
            if "reserved routing prefix" in (result.error_message or ""):
                raise ReservedWordError(result.error_message)
            raise ValidationError(result.error_message)
        return result.entity

    def normalize(self, raw_name: str, case_mode: str = "title") -> NormalizationResult:
        """
        Executes normalization and returns a success/failure result wrapper containing trace metadata.
        
        Parameters:
            raw_name (str): The raw name to normalize.
            case_mode (str): Casing style (default: "title").
            
        Returns:
            NormalizationResult: Outcome representation containing entity or error details.
        """
        return self._run_pipeline(raw_name, case_mode=case_mode)

    def _run_pipeline(self, raw_name: str, case_mode: str = "title") -> NormalizationResult:
        """
        Internal orchestrator for executing the normalization rules sequence.
        """
        start_time = time.perf_counter()
        trace = []
        warnings = []

        try:
            if raw_name is None:
                raise ValidationError("Input name cannot be None.")

            trace.append("Stage: Input Checked")

            # 1. Validation (Unicode character check)
            validate_unicode(raw_name)
            trace.append("Stage: Unicode Characters Validated")

            # Validation (Length limit check)
            if len(raw_name) > MAX_TITLE_LENGTH:
                raise ValidationError(f"Input exceeds maximum allowed length of {MAX_TITLE_LENGTH} characters.")

            # 2. Whitespace normalization
            cleaned_whitespace = clean_whitespace(raw_name)
            if cleaned_whitespace != raw_name:
                warnings.append("Leading/trailing whitespace trimmed or multiple spaces collapsed.")
            trace.append("Stage: Whitespace Normalized")

            # 3. Unicode normalization (NFKC compatibility folding)
            normalized_unicode = normalize_unicode(cleaned_whitespace)
            if normalized_unicode != cleaned_whitespace:
                warnings.append("Unicode compatibility equivalent symbols resolved.")
            trace.append("Stage: Unicode NFKC Normalized")

            # 4. Separator normalization (collapsing hyphens/underscores to space)
            normalized_separators = normalize_separators(normalized_unicode)
            if normalized_separators != normalized_unicode:
                warnings.append("Underscores and hyphens normalized to single spaces.")
            trace.append("Stage: Separators Normalized")

            # Alias resolution (synonym checking against registry)
            resolved_alias_term = resolve_alias(normalized_separators, self.registry)
            if resolved_alias_term != normalized_separators:
                trace.append(f"Stage: Alias Resolved ('{normalized_separators}' -> '{resolved_alias_term}')")
            else:
                trace.append("Stage: Alias Checked (No mappings matched)")

            # 5. Case normalization
            display_name = case_fold(resolved_alias_term, mode=case_mode)
            trace.append(f"Stage: Case Cased ({case_mode})")

            # 6. Canonical Key generation (alphanumeric lowercase match index)
            normalized_key = generate_canonical_key(display_name)
            trace.append("Stage: Canonical Key Generated")

            # 7. Slug generation
            slug_val = generate_slug(display_name)
            trace.append("Stage: Slug Generated")

            # Construct final DTO (business fields only)
            entity = CanonicalEntity(
                canonical_name=display_name,
                normalized_key=normalized_key,
                slug=slug_val,
                display_name=display_name
            )

            end_time = time.perf_counter()
            execution_time_ms = (end_time - start_time) * 1000.0

            metadata = {
                "version": self.version,
                "execution_time_ms": round(execution_time_ms, 4),
                "slug_metadata": {
                    "slug_version": "1.0.0",
                    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "source_string": display_name
                }
            }

            return NormalizationResult(
                success=True,
                entity=entity,
                warnings=warnings,
                rule_trace=trace,
                metadata=metadata
            )

        except NormalizationError as e:
            end_time = time.perf_counter()
            execution_time_ms = (end_time - start_time) * 1000.0
            return NormalizationResult(
                success=False,
                error_message=str(e),
                warnings=warnings,
                rule_trace=trace,
                metadata={
                    "version": self.version,
                    "execution_time_ms": round(execution_time_ms, 4)
                }
            )
        except Exception as e:
            end_time = time.perf_counter()
            execution_time_ms = (end_time - start_time) * 1000.0
            return NormalizationResult(
                success=False,
                error_message=f"Unexpected engine error: {str(e)}",
                warnings=warnings,
                rule_trace=trace,
                metadata={
                    "version": self.version,
                    "execution_time_ms": round(execution_time_ms, 4)
                }
            )

    def normalize_email(self, raw_email: str) -> str:
        """
        Runs the email normalization pipeline.
        
        Parameters:
            raw_email (str): The raw email string.
            
        Returns:
            str: Trimmed, lowercase email.
            
        Raises:
            ValidationError: If input fails validation rules.
        """
        if not raw_email:
            return ""

        validate_unicode(raw_email)

        if len(raw_email) > MAX_EMAIL_LENGTH:
            raise ValidationError(f"Email exceeds maximum allowed length of {MAX_EMAIL_LENGTH} characters.")

        return raw_email.strip().lower()
