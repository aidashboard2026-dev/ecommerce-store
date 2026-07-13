from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.auth.dependencies import get_current_admin
from app.modules.products.models import Category, Collection, Product, ProductStatus
from app.shared.normalization import get_search_terms

router = APIRouter()

@router.get("/search")
def search_routes(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Search available internal destinations:
    - Active Categories
    - Active Collections
    - Published Products
    Uses the Central Normalization Engine to parse aliases and terms.
    """
    cat_query = db.query(Category).filter(Category.status == "active")
    col_query = db.query(Collection).filter(Collection.status == "active")
    prod_query = db.query(Product).filter(Product.status == ProductStatus.published)
    
    if q is not None:
        q_stripped = q.strip()
        if q_stripped:
            terms = get_search_terms(q_stripped)
            if terms:
                for term in terms:
                    w = f"%{term}%"
                    cat_query = cat_query.filter(or_(Category.name.ilike(w), Category.slug.ilike(w)))
                    col_query = col_query.filter(or_(Collection.name.ilike(w), Collection.slug.ilike(w)))
                    prod_query = prod_query.filter(or_(Product.title.ilike(w), Product.slug.ilike(w)))
            else:
                w = f"%{q_stripped}%"
                cat_query = cat_query.filter(or_(Category.name.ilike(w), Category.slug.ilike(w)))
                col_query = col_query.filter(or_(Collection.name.ilike(w), Collection.slug.ilike(w)))
                prod_query = prod_query.filter(or_(Product.title.ilike(w), Product.slug.ilike(w)))
                
    categories = cat_query.order_by(Category.sort_order, Category.name).limit(20).all()
    collections = col_query.order_by(Collection.name).limit(20).all()
    products = prod_query.order_by(Product.title).limit(20).all()
    
    results = []
    
    # Homepage option if search matches "home" or is empty
    if not q or "home" in q.lower():
        results.append({
            "type": "home",
            "id": None,
            "title": "Homepage",
            "name": "Homepage",
            "slug": "",
            "route": "/"
        })
        
    for cat in categories:
        results.append({
            "type": "category",
            "id": cat.id,
            "title": f"Category: {cat.name}",
            "name": f"Category: {cat.name}",
            "slug": cat.slug,
            "route": f"/products?category={cat.slug}"
        })
        
    for col in collections:
        results.append({
            "type": "collection",
            "id": col.id,
            "title": f"Collection: {col.name}",
            "name": f"Collection: {col.name}",
            "slug": col.slug,
            "route": f"/products?collection={col.slug}"
        })
        
    for prod in products:
        results.append({
            "type": "product",
            "id": prod.id,
            "title": f"Product: {prod.title}",
            "name": f"Product: {prod.title}",
            "slug": prod.slug,
            "route": f"/products/{prod.slug}"
        })
        
    return results
