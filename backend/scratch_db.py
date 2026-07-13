import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Add backend app directory to path
sys.path.append(os.path.abspath("."))

from app.core.config import settings
from app.modules.products.models import ProductVariant, Product

print("Database URL:", settings.DATABASE_URL)
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

try:
    print("\n--- Listing products ---")
    products = session.query(Product).limit(10).all()
    for p in products:
        print(f"Product ID: {p.id}, Title: {p.title}, Slug: {p.slug}")

    print("\n--- Listing product variants ---")
    variants = session.query(ProductVariant).limit(10).all()
    for v in variants:
        print(f"Variant ID: {v.id}, Product ID: {v.product_id}, SKU: {v.sku}, Size: {v.size}, Color: {v.color}")
except Exception as e:
    print("Error:", e)
finally:
    session.close()
