from backend.app.modules.products.models import Product, ProductVariant, ProductStatus

def test_product_variant_properties():
    # Setup variants
    v1 = ProductVariant(
        sku="SKU-S",
        size="S",
        color="Red",
        original_price=100.0,
        selling_price=80.0,
        stock_quantity=10,
        reserved_stock=2,
        low_stock_threshold=5
    )
    v2 = ProductVariant(
        sku="SKU-M",
        size="M",
        color="Red",
        original_price=120.0,
        selling_price=120.0,
        stock_quantity=3,
        reserved_stock=1,
        low_stock_threshold=5
    )
    v3 = ProductVariant(
        sku="SKU-L",
        size="L",
        color="Red",
        original_price=150.0,
        selling_price=130.0,
        stock_quantity=0,
        reserved_stock=0,
        low_stock_threshold=5
    )

    # Test inventory status properties
    assert v1.available_stock == 8
    assert v1.inventory_status == "in_stock"

    assert v2.available_stock == 2
    assert v2.inventory_status == "low_stock"

    assert v3.available_stock == 0
    assert v3.inventory_status == "out_of_stock"

    # Test Product relationship calculations
    product = Product(
        title="Premium Crewneck",
        slug="premium-crewneck",
        status=ProductStatus.published
    )
    product.variants = [v1, v2, v3]

    assert product.total_stock == 13
    assert product.min_price == 80.0
