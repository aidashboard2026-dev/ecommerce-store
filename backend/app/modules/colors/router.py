"""Color resolver API endpoints."""

from fastapi import APIRouter, Query

from app.modules.colors.resolver import resolver

router = APIRouter()


@router.get("/resolve")
def resolve_color(name: str = Query(..., description="Color name to resolve")):
    hex_val = resolver.resolve(name)
    if hex_val:
        return {"name": name.strip(), "hex": hex_val, "found": True}
    return {"name": name.strip(), "hex": None, "found": False}
