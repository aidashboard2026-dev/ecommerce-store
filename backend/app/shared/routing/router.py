from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.auth.dependencies import get_current_admin
from app.modules.products.models import Category
from app.shared.normalization import get_search_terms

router = APIRouter()

@router.get("/search")
def search_routes(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Search available internal destinations (standard active categories).
    Uses the Central Normalization Engine to parse aliases and terms.
    """
    query = db.query(Category).filter(Category.status == "active")
    
    if q is not None:
        q_stripped = q.strip()
        if q_stripped:
            terms = get_search_terms(q_stripped)
            if terms:
                for term in terms:
                    w = f"%{term}%"
                    query = query.filter(
                        or_(
                            Category.name.ilike(w),
                            Category.slug.ilike(w)
                        )
                    )
            else:
                # Fallback to direct match if normalization returns empty terms
                w = f"%{q_stripped}%"
                query = query.filter(
                    or_(
                        Category.name.ilike(w),
                        Category.slug.ilike(w)
                    )
                )
    
    # Sort categories to provide a consistent order
    categories = query.order_by(Category.sort_order, Category.name).all()
    
    results = []
    for cat in categories:
        results.append({
            "type": "category",
            "id": cat.id,
            "title": cat.name,
            "slug": cat.slug,
            "route": f"/{cat.slug}"
        })
        
    return results
