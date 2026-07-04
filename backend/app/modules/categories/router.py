import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.audit.service import audit
from app.modules.auth.dependencies import get_current_admin
from app.modules.categories.schemas import (
    HomepageCategoryCreate,
    HomepageCategoryResponse,
    HomepageCategoryUpdate,
)
from app.modules.categories.service import (
    create_category,
    delete_category,
    list_categories,
    update_category,
)
from app.shared.utils.image import validate_and_read_image

router = APIRouter()


def _category_upload_dir() -> str:
    target_dir = os.path.join(settings.UPLOAD_DIR, "categories")
    os.makedirs(target_dir, exist_ok=True)
    return target_dir


def _save_category_image(file: UploadFile) -> str:
    contents = validate_and_read_image(file)
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(_category_upload_dir(), filename)
    with open(file_path, "wb") as image_file:
        image_file.write(contents)
    return f"/uploads/categories/{filename}"


def _delete_category_image(image_path: Optional[str]) -> None:
    if not image_path or not image_path.startswith("/uploads/categories/"):
        return

    filename = os.path.basename(image_path)
    target_dir = os.path.normpath(_category_upload_dir())
    file_path = os.path.normpath(os.path.join(target_dir, filename))
    safe_prefix = target_dir + os.sep

    if file_path.startswith(safe_prefix) and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass


@router.get("/categories", response_model=list[HomepageCategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return list_categories(db)


@router.get("/admin/categories", response_model=list[HomepageCategoryResponse])
def list_admin_categories(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return list_categories(db)


@router.post(
    "/admin/categories",
    response_model=HomepageCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admin_category(
    request: Request,
    name: str = Form(...),
    path: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if not image or not image.filename:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Category image is required.")

    image_path = _save_category_image(image)
    data = HomepageCategoryCreate(name=name, image=image_path, path=path)

    try:
        result = create_category(db, data)
        audit.created(
            db=db,
            admin=current_admin,
            resource_type="homepage_category",
            resource_id=result.id,
            resource_label=result.name,
            payload={"path": result.path, "image": result.image},
            request=request,
        )
        db.commit()
        db.refresh(result)
        return result
    except HTTPException:
        db.rollback()
        _delete_category_image(image_path)
        raise
    except Exception as exc:
        db.rollback()
        _delete_category_image(image_path)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Unable to create homepage category. Please try again.",
        ) from exc


@router.put("/admin/categories/{category_id}", response_model=HomepageCategoryResponse)
def update_admin_category(
    category_id: int,
    request: Request,
    name: str = Form(...),
    path: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    update_fields = {"name": name, "path": path}
    new_image_path: Optional[str] = None

    old_image_path: Optional[str] = None
    if image and image.filename:
        from app.modules.categories.service import get_category

        existing = get_category(db, category_id)
        old_image_path = existing.image
        new_image_path = _save_category_image(image)
        update_fields["image"] = new_image_path

    data = HomepageCategoryUpdate(**update_fields)

    try:
        result = update_category(db, category_id, data)
        if old_image_path and new_image_path:
            _delete_category_image(old_image_path)
        audit.updated(
            db=db,
            admin=current_admin,
            resource_type="homepage_category",
            resource_id=result.id,
            resource_label=result.name,
            after=data.model_dump(exclude_unset=True),
            request=request,
        )
        db.commit()
        db.refresh(result)
        return result
    except HTTPException:
        db.rollback()
        if new_image_path:
            _delete_category_image(new_image_path)
        raise
    except Exception as exc:
        db.rollback()
        if new_image_path:
            _delete_category_image(new_image_path)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Unable to update homepage category. Please try again.",
        ) from exc


@router.delete("/admin/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_category(
    category_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    category = delete_category(db, category_id)
    audit.deleted(
        db=db,
        admin=current_admin,
        resource_type="homepage_category",
        resource_id=category.id,
        resource_label=category.name,
        request=request,
    )
    db.commit()
    _delete_category_image(category.image)
