"""
One-time migration: move existing local product/banner images to Supabase
Storage and rewrite the corresponding database URLs.

Run from inside the backend container (so it has access to both the
Postgres connection and the `uploads/` volume), AFTER the new Supabase
env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PRODUCT_BUCKET,
SUPABASE_BANNER_BUCKET) have been set:

    docker compose exec backend python migrate_images_to_supabase.py
    docker compose exec backend python migrate_images_to_supabase.py --dry-run

What it does, for both products.thumbnail and banners.banner_image:
  1. Finds rows whose image is still a local root-relative path
     (e.g. /uploads/products/foo.jpg) instead of a Supabase public URL.
  2. Reads the file from the local uploads volume.
  3. Uploads it to the appropriate Supabase bucket.
  4. Updates the row with the new public URL.
  5. Logs success/failure per row and prints a final summary.

Rows that are already Supabase URLs, or whose image field is empty, are
left untouched. Rows whose local file is missing are logged as failures
(image field is left as-is so nothing is silently lost) and reported in
the summary so they can be reviewed manually.
"""

import argparse
import mimetypes
import os
import sys

# Allow running this script directly with `python migrate_images_to_supabase.py`
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.models.banner import Banner  # noqa: E402
from app.models.product import Product  # noqa: E402
from app.services import supabase_storage  # noqa: E402


def _is_local_path(value: str) -> bool:
    """True for legacy root-relative paths like /uploads/products/x.jpg."""
    if not value:
        return False
    return not (value.startswith("http://") or value.startswith("https://"))


def _local_file_path(url_path: str) -> str:
    """
    Resolves a stored value like '/uploads/products/foo.jpg' to its
    actual location on disk under settings.UPLOAD_DIR.
    """
    rel = url_path.lstrip("/")
    if rel.startswith("uploads/"):
        rel = rel[len("uploads/"):]
    return os.path.join(os.path.abspath(settings.UPLOAD_DIR), rel)


def _guess_content_type(filename: str) -> str:
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "image/jpeg"


def migrate_products(db, dry_run: bool) -> dict:
    results = {"migrated": [], "skipped": [], "failed": []}

    products = (
        db.query(Product)
        .filter(Product.thumbnail.isnot(None))
        .filter(Product.thumbnail != "")
        .all()
    )

    for product in products:
        if not _is_local_path(product.thumbnail):
            results["skipped"].append((product.id, "already a Supabase/remote URL"))
            continue

        local_path = _local_file_path(product.thumbnail)
        if not os.path.isfile(local_path):
            results["failed"].append((product.id, f"local file not found: {local_path}"))
            continue

        if dry_run:
            results["migrated"].append((product.id, f"[dry-run] would upload {local_path}"))
            continue

        try:
            with open(local_path, "rb") as f:
                contents = f.read()

            filename = os.path.basename(local_path)
            new_url = supabase_storage.upload_product_image(
                contents=contents,
                original_filename=filename,
                content_type=_guess_content_type(filename),
                product_id=product.id,
            )

            old_url = product.thumbnail
            product.thumbnail = new_url
            db.commit()

            results["migrated"].append((product.id, f"{old_url} -> {new_url}"))
        except Exception as exc:  # noqa: BLE001 — log and keep going
            db.rollback()
            results["failed"].append((product.id, str(exc)))

    return results


def migrate_banners(db, dry_run: bool) -> dict:
    results = {"migrated": [], "skipped": [], "failed": []}

    banners = (
        db.query(Banner)
        .filter(Banner.banner_image.isnot(None))
        .filter(Banner.banner_image != "")
        .all()
    )

    for banner in banners:
        if not _is_local_path(banner.banner_image):
            results["skipped"].append((banner.id, "already a Supabase/remote URL"))
            continue

        local_path = _local_file_path(banner.banner_image)
        if not os.path.isfile(local_path):
            results["failed"].append((banner.id, f"local file not found: {local_path}"))
            continue

        if dry_run:
            results["migrated"].append((banner.id, f"[dry-run] would upload {local_path}"))
            continue

        try:
            with open(local_path, "rb") as f:
                contents = f.read()

            filename = os.path.basename(local_path)
            new_url = supabase_storage.upload_banner_image(
                contents=contents,
                original_filename=filename,
                content_type=_guess_content_type(filename),
            )

            old_url = banner.banner_image
            banner.banner_image = new_url
            db.commit()

            results["migrated"].append((banner.id, f"{old_url} -> {new_url}"))
        except Exception as exc:  # noqa: BLE001 — log and keep going
            db.rollback()
            results["failed"].append((banner.id, str(exc)))

    return results


def _print_section(label: str, results: dict) -> None:
    print(f"\n{label}")
    print("-" * len(label))
    print(f"  Migrated: {len(results['migrated'])}")
    for row_id, detail in results["migrated"]:
        print(f"    [{row_id}] {detail}")
    print(f"  Skipped:  {len(results['skipped'])}")
    for row_id, detail in results["skipped"]:
        print(f"    [{row_id}] {detail}")
    print(f"  Failed:   {len(results['failed'])}")
    for row_id, detail in results["failed"]:
        print(f"    [{row_id}] {detail}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Migrate local product/banner images to Supabase Storage."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List what would be migrated without uploading or writing to the DB.",
    )
    args = parser.parse_args()

    if args.dry_run:
        print("Running in --dry-run mode: no uploads or DB writes will happen.\n")

    db = SessionLocal()
    try:
        product_results = migrate_products(db, args.dry_run)
        banner_results = migrate_banners(db, args.dry_run)
    finally:
        db.close()

    _print_section("Products", product_results)
    _print_section("Banners", banner_results)

    total_failed = len(product_results["failed"]) + len(banner_results["failed"])
    print(
        f"\nDone. {len(product_results['migrated']) + len(banner_results['migrated'])} "
        f"migrated, {total_failed} failed."
    )

    if total_failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
