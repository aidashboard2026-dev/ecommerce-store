"""
app/shared/repositories/base.py

Generic base repository implementing common CRUD operations.

ARCHITECTURE
------------
Router → Service → Repository → Database

The repository is the only layer allowed to communicate with SQLAlchemy.
Services call repository methods. Repositories never raise HTTPException —
they raise domain exceptions from app.shared.exceptions.

USAGE
-----
Each module's repository inherits BaseRepository and adds module-specific
query methods:

    class ProductRepository(BaseRepository[Product]):
        def __init__(self, db: Session) -> None:
            super().__init__(Product, db)

        def get_by_slug(self, slug: str) -> Optional[Product]:
            return (
                self.db.query(self.model)
                .filter(self.model.slug == slug, self.model.deleted_at.is_(None))
                .first()
            )

Dependency injection via FastAPI's Depends:

    def get_product_repo(db: Session = Depends(get_db)) -> ProductRepository:
        return ProductRepository(db)

    @router.get("/{product_id}")
    def get_product(repo: ProductRepository = Depends(get_product_repo)):
        ...

TRANSACTION STRATEGY
--------------------
BaseRepository methods call db.flush() rather than db.commit() by default.
The service layer controls transaction boundaries and calls db.commit() /
db.rollback(). This enables multi-step operations to participate in a single
atomic transaction without the repository needing to know about business flow.

The save() method commits immediately for simple single-step operations where
the service wants to delegate commit responsibility to the repository.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from sqlalchemy import func as sqla_func
from sqlalchemy.exc import IntegrityError as SAIntegrityError
from sqlalchemy.orm import Session

from app.core.database import Base
from app.shared.exceptions import NotFoundError, ConflictError, IntegrityError

logger = logging.getLogger(__name__)

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic repository providing common database operations.

    Type-parameterize with the SQLAlchemy model:
        class OrderRepository(BaseRepository[Order]): ...
    """

    def __init__(self, model: Type[ModelType], db: Session) -> None:
        self.model = model
        self.db = db

    # ─────────────────────────────────────────────────────────
    # READ
    # ─────────────────────────────────────────────────────────

    def get_by_id(self, record_id: int) -> Optional[ModelType]:
        """
        Fetch a record by primary key. Returns None if not found.
        Use get_by_id_or_raise() when a missing record is an error.
        """
        return self.db.get(self.model, record_id)

    def get_by_id_or_raise(self, record_id: int) -> ModelType:
        """
        Fetch a record by primary key.
        Raises NotFoundError if the record does not exist.
        """
        record = self.db.get(self.model, record_id)
        if record is None:
            raise NotFoundError(
                f"{self.model.__name__} with id={record_id} not found.",
                code="NOT_FOUND",
                context={"id": record_id, "model": self.model.__name__},
            )
        return record

    def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by=None,
    ) -> List[ModelType]:
        """
        Fetch all records with optional offset pagination.
        For filtered/sorted queries, add methods in the subclass.
        """
        q = self.db.query(self.model)
        if order_by is not None:
            q = q.order_by(order_by)
        return q.offset(skip).limit(limit).all()

    def count(self, *filters) -> int:
        """
        Count records, optionally applying extra SQLAlchemy filter expressions.

        Example:
            repo.count(Product.status == ProductStatus.published)
        """
        q = self.db.query(sqla_func.count(self.model.id))
        if filters:
            q = q.filter(*filters)
        return q.scalar() or 0

    def exists(self, record_id: int) -> bool:
        """Return True if a record with the given primary key exists."""
        return (
            self.db.query(self.model.id)
            .filter(self.model.id == record_id)
            .first()
        ) is not None

    def exists_where(self, *filters) -> bool:
        """
        Return True if at least one record matches the given filters.

        Example:
            repo.exists_where(Product.slug == "my-slug", Product.deleted_at.is_(None))
        """
        return (
            self.db.query(self.model.id).filter(*filters).first()
        ) is not None

    # ─────────────────────────────────────────────────────────
    # WRITE — flush-only by default (service controls commits)
    # ─────────────────────────────────────────────────────────

    def add(self, instance: ModelType) -> ModelType:
        """
        Add a new ORM instance to the session and flush.
        Does NOT commit — the caller's service layer commits.
        """
        self.db.add(instance)
        try:
            self.db.flush()
        except SAIntegrityError as exc:
            self.db.rollback()
            self._raise_integrity_error(exc)
        return instance

    def save(self, instance: ModelType) -> ModelType:
        """
        Persist changes to an existing ORM instance (flush + commit + refresh).
        Use this for simple single-step operations. For multi-step operations,
        use flush() and let the service layer call commit().
        """
        try:
            self.db.flush()
            self.db.commit()
            self.db.refresh(instance)
        except SAIntegrityError as exc:
            self.db.rollback()
            self._raise_integrity_error(exc)
        return instance

    def flush(self) -> None:
        """
        Flush the session without committing.
        Use when the service orchestrates multiple repository calls in one
        transaction and will call commit() itself.
        """
        try:
            self.db.flush()
        except SAIntegrityError as exc:
            self.db.rollback()
            self._raise_integrity_error(exc)

    def commit(self) -> None:
        """Commit the current transaction."""
        self.db.commit()

    def rollback(self) -> None:
        """Roll back the current transaction."""
        self.db.rollback()

    def refresh(self, instance: ModelType) -> ModelType:
        """Refresh an ORM instance from the database."""
        self.db.refresh(instance)
        return instance

    def update_fields(
        self,
        instance: ModelType,
        updates: Dict[str, Any],
        *,
        auto_save: bool = False,
    ) -> ModelType:
        """
        Apply a dict of field updates to an ORM instance.

        Args:
            instance:   The ORM object to update.
            updates:    Dict mapping field names to new values.
            auto_save:  If True, flush + commit + refresh immediately.
                        If False (default), only sets attributes — caller flushes/commits.

        Example:
            product = repo.update_fields(product, {"status": "published"}, auto_save=True)
        """
        for field, value in updates.items():
            if hasattr(instance, field):
                setattr(instance, field, value)
            else:
                logger.warning(
                    "update_fields: model %s has no attribute '%s' — skipped.",
                    self.model.__name__,
                    field,
                )
        if auto_save:
            return self.save(instance)
        return instance

    def delete_instance(self, instance: ModelType) -> None:
        """
        Hard-delete an ORM instance and commit.
        For soft-deletes, use update_fields() to set deleted_at.
        """
        self.db.delete(instance)
        try:
            self.db.commit()
        except SAIntegrityError as exc:
            self.db.rollback()
            self._raise_integrity_error(exc)

    def delete_by_id(self, record_id: int) -> None:
        """
        Hard-delete a record by primary key.
        Raises NotFoundError if the record does not exist.
        """
        instance = self.get_by_id_or_raise(record_id)
        self.delete_instance(instance)

    # ─────────────────────────────────────────────────────────
    # BULK
    # ─────────────────────────────────────────────────────────

    def bulk_update(
        self,
        *,
        filters: list,
        values: Dict[str, Any],
    ) -> int:
        """
        Execute a bulk UPDATE query.
        Returns the number of rows updated.
        Does NOT commit — caller is responsible.

        Example:
            repo.bulk_update(
                filters=[Product.status == ProductStatus.draft],
                values={"status": ProductStatus.published},
            )
        """
        result = (
            self.db.query(self.model)
            .filter(*filters)
            .update(values, synchronize_session="fetch")
        )
        return result

    # ─────────────────────────────────────────────────────────
    # INTERNAL
    # ─────────────────────────────────────────────────────────

    def _raise_integrity_error(self, exc: SAIntegrityError) -> None:
        """
        Inspect a SQLAlchemy IntegrityError and raise the most specific
        domain exception possible.

        Subclasses can override to provide model-specific messages.
        """
        err_str = str(exc).lower()
        logger.error(
            "IntegrityError in %s: %s",
            self.model.__name__,
            exc,
        )
        if "unique" in err_str or "duplicate" in err_str:
            raise ConflictError(
                f"A {self.model.__name__} with these values already exists.",
                code="DUPLICATE_ENTRY",
            ) from exc
        raise IntegrityError(
            "This action conflicts with the current state of the data.",
            code="INTEGRITY_VIOLATION",
        ) from exc
