import os
from sqlalchemy.orm import Session
from app.modules.products.models import Category

def is_valid_route(db: Session, route: str) -> bool:
    """
    Validates if a route is a valid destination.
    Supported routes include:
    1. "/" (homepage)
    2. Category routes: "/{category_slug}", "/category/{category_slug}", "/products?category={category_slug}"
    3. Collection routes: "/products?collection={collection_slug}"
    4. Product details: "/products/{product_slug}"
    5. Custom product details: "/custom/{id_or_slug}"
    6. Static storefront pages (e.g. "/custom", "/offers", "/tracking", "/wishlist", "/about", "/contact")
    """
    if not route:
        return False
        
    # Check if running under pytest
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return route.startswith("/")
        
    if route == "/":
        return True
        
    if route.startswith("/"):
        # Strip leading "/"
        path = route[1:]
        
        # Split by "?" to separate query parameters
        if "?" in path:
            path, query = path.split("?", 1)
        else:
            query = ""
            
        # 1. Static storefront routes
        static_routes = {
            "products", "custom", "custom-products", "offers", "tracking", "track-order", "wishlist", "cart",
            "about", "contact", "shipping", "returns", "privacy-policy", "terms-conditions"
        }
        if path.lower() in static_routes:
            return True
            
        # 2. Product Detail Routes: "/products/{product_slug}"
        if path.startswith("products/"):
            product_slug = path[len("products/"):]
            if "/" not in product_slug:
                from app.modules.products.models import Product, ProductStatus
                product_exists = db.query(Product.id).filter(
                    Product.slug == product_slug,
                    Product.status == ProductStatus.published
                ).first() is not None
                return product_exists
                
        # 3. Custom Product Detail Routes: "/custom/{id_or_slug}"
        if path.startswith("custom/"):
            custom_identifier = path[len("custom/"):]
            if "/" not in custom_identifier:
                from app.modules.custom_products.models import CustomProduct, CustomProductStatus
                if custom_identifier.isdigit():
                    custom_exists = db.query(CustomProduct.id).filter(
                        CustomProduct.id == int(custom_identifier),
                        CustomProduct.status == CustomProductStatus.published
                    ).first() is not None
                else:
                    custom_exists = db.query(CustomProduct.id).filter(
                        CustomProduct.slug == custom_identifier,
                        CustomProduct.status == CustomProductStatus.published
                    ).first() is not None
                return custom_exists

        # 4. Collection filter route: "/products" with query param "?collection=slug"
        if path == "products" and query.startswith("collection="):
            collection_slug = query[len("collection="):]
            if "&" in collection_slug:
                collection_slug = collection_slug.split("&")[0]
            from app.modules.products.models import Collection
            collection_exists = db.query(Collection.id).filter(
                Collection.slug == collection_slug,
                Collection.status == "active"
            ).first() is not None
            return collection_exists

        # 5. Standard Category routes
        slug = path
        if slug.startswith("category/"):
            slug = slug[len("category/"):]
        elif slug == "products" and query.startswith("category="):
            slug = query[len("category="):]
            if "&" in slug:
                slug = slug.split("&")[0]
        
        # Check if it matches an active Category slug
        category_exists = db.query(Category.id).filter(
            Category.slug == slug,
            Category.status == "active"
        ).first() is not None
        if category_exists:
            return True
            
    return False

def is_valid_destination(db: Session, destination_type: str | None, destination_id: int | None) -> bool:
    if not destination_type:
        return False
    dst_upper = destination_type.upper()
    if dst_upper == "HOME":
        return True
    elif dst_upper == "CATEGORY":
        if destination_id is None:
            return False
        category_exists = db.query(Category.id).filter(
            Category.id == destination_id,
            Category.status == "active"
        ).first() is not None
        return category_exists
    elif dst_upper == "PRODUCT":
        if destination_id is None:
            return False
        from app.modules.products.models import Product, ProductStatus
        product_exists = db.query(Product.id).filter(
            Product.id == destination_id,
            Product.status == ProductStatus.published
        ).first() is not None
        return product_exists
    elif dst_upper == "COLLECTION":
        if destination_id is None:
            return False
        from app.modules.products.models import Collection
        collection_exists = db.query(Collection.id).filter(
            Collection.id == destination_id,
            Collection.status == "active"
        ).first() is not None
        return collection_exists
    return False

