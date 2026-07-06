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
from app.shared.storage import supabase_storage
from app.shared.utils.image import validate_and_read_image

router = APIRouter()


def _save_category_image(file: UploadFile) -> str:
    contents = validate_and_read_image(file)
    return supabase_storage.upload_category_image(
        contents=contents,
        original_filename=file.filename or "category.jpg",
        content_type=file.content_type or "image/jpeg",
    )


def _delete_category_image(image_path: Optional[str]) -> None:
    if not image_path:
        return
    try:
        supabase_storage.delete_category_image(image_path)
    except Exception:
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
    path: Optional[str] = Form(None),
    destination_type: Optional[str] = Form(None),
    destination_id: Optional[int] = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if not image or not image.filename:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Category image is required.")

    from app.shared.routing.utils import is_valid_route, is_valid_destination

    if destination_type and destination_type.strip():
        dst_type = destination_type.strip()
        if not is_valid_destination(db, dst_type, destination_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Destination '{dst_type}' with ID {destination_id} is not valid or active."
            )
    elif path and path.strip():
        if not is_valid_route(db, path.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Route '{path}' is not a valid destination."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either path or destination_type must be provided."
        )

    image_path = _save_category_image(image)
    data = HomepageCategoryCreate(
        name=name,
        image=image_path,
        path=path or None,
        destination_type=destination_type,
        destination_id=destination_id
    )

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
    path: Optional[str] = Form(None),
    destination_type: Optional[str] = Form(None),
    destination_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    from app.modules.categories.service import get_category
    from app.shared.routing.utils import is_valid_route, is_valid_destination

    existing = get_category(db, category_id)

    update_fields = {"name": name}

    if destination_type is not None:
        val = destination_type.strip()
        if not val or val.lower() in ("none", "null", "undefined"):
            update_fields["destination_type"] = None
            update_fields["destination_id"] = None
        else:
            update_fields["destination_type"] = val
            if destination_id is not None:
                update_fields["destination_id"] = destination_id
    elif destination_id is not None:
        update_fields["destination_id"] = destination_id

    if path is not None:
        update_fields["path"] = path.strip() if path.strip() else None

    effective_type = update_fields.get("destination_type", existing.destination_type)
    effective_id = update_fields.get("destination_id", existing.destination_id)
    effective_path = update_fields.get("path", existing.path)

    if effective_type:
        if not is_valid_destination(db, effective_type, effective_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Destination '{effective_type}' with ID {effective_id} is not valid or active."
            )
    elif effective_path:
        if effective_path != existing.path:
            if not is_valid_route(db, effective_path):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Route '{effective_path}' is not a valid destination."
                )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either path or destination_type must be provided."
        )

    new_image_path: Optional[str] = None
    old_image_path: Optional[str] = None
    if image and image.filename:
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
