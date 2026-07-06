import re

# Unicode normalization form
# NFKC (Compatibility Decomposition, Canonical Composition) normalizes 
# visually identical characters, half/full-width variants, and ligatures.
UNICODE_FORM = "NFKC"

# Regular expression matching all whitespace characters (spaces, tabs, newlines, non-breaking spaces)
# \xa0 is the non-breaking space (NBSP)
RE_WHITESPACE = re.compile(r"[\s\xa0\u200b\u200f]+", re.UNICODE)

# Regular expression matching individual or repeated separators (hyphens, underscores)
RE_SEPARATORS = re.compile(r"[_-]+", re.UNICODE)

# Regular expression matching characters that should be stripped before slug generation
# (non-alphanumeric, non-space, non-hyphen, and non-underscore)
RE_CLEAN_SLUG = re.compile(r"[^\w\s-]", re.UNICODE)

# System reserved routing paths that cannot be used as URL slugs
RESERVED_SLUGS = {
    "admin",
    "api",
    "static",
    "media",
    "assets",
    "public",
    "auth",
    "products",
    "categories",
    "collections",
    "orders",
    "customers",
    "cart",
    "wishlist",
    "offers",
    "settings",
    "search",
}

# Maximum input string limits
MAX_TITLE_LENGTH = 255
MAX_EMAIL_LENGTH = 255

# Maximum transitive alias resolution depth limit
MAX_ALIAS_DEPTH = 10
