import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X, AlertTriangle, WifiOff } from "lucide-react";
import toast from "react-hot-toast";


import { homepageCategoriesAPI } from "@/shared/services/api";
import { compressImage } from "@/shared/utils/imageCompression";
import { useTheme } from "@/shared/hooks/useAuth";
import { getApiErrorMessage, getImageUrl } from "@/shared/utils/productUtils";
import RoutePicker from "@/shared/components/ui/RoutePicker";

const CATEGORY_OPTIONS = [
  { type: "category", id: null, title: "T-Shirts", name: "T-Shirts", slug: "t-shirts", route: "/products?category=t-shirts" },
  { type: "category", id: null, title: "Trousers", name: "Trousers", slug: "trousers", route: "/products?category=trousers" },
  { type: "category", id: null, title: "Shirts", name: "Shirts", slug: "shirts", route: "/products?category=shirts" },
  { type: "category", id: null, title: "Jerseys", name: "Jerseys", slug: "jerseys", route: "/products?category=jerseys" },
  { type: "category", id: null, title: "Track Pants", name: "Track Pants", slug: "track-pants", route: "/products?category=track-pants" },
  { type: "custom-product", id: null, title: "Custom Products", name: "Custom Products", slug: "custom-products", route: "/custom-products" }
];

const emptyForm = {
  name: "",
  path: "",
  imageFile: null,
};



/* ---------------------------------------------------------------------- */
/* Small shared building blocks (no visual/design changes, only polish)    */
/* ---------------------------------------------------------------------- */

// Base transition/interaction classes reused across every button so hover,
// active-press, and disabled behavior stay perfectly consistent.
const BUTTON_INTERACTION_CLASSES =
  "transition-all duration-150 ease-out active:scale-[0.98] hover:brightness-110 " +
  "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:brightness-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1";

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-600 animate-[fadeIn_150ms_ease-out]"
    >
      <WifiOff size={15} className="shrink-0" />
      <span>You're offline. Changes cannot be saved until the connection is restored.</span>
    </div>
  );
}

function TableSkeletonRows({ rows = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} aria-hidden="true">
          <td className="px-4 py-3">
            <div className="h-14 w-20 animate-pulse rounded-md bg-app/70" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-28 animate-pulse rounded bg-app/70" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-40 animate-pulse rounded bg-app/70" />
          </td>
          <td className="px-4 py-3">
            <div className="flex justify-end gap-2">
              <div className="h-8 w-16 animate-pulse rounded-lg bg-app/70" />
              <div className="h-8 w-16 animate-pulse rounded-lg bg-app/70" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function EmptyState({ onAdd }) {
  return (
    <tr>
      <td colSpan={4} className="px-4 py-14 text-center">
        <div className="flex flex-col items-center gap-3 animate-[fadeIn_200ms_ease-out]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app text-muted">
            <ImagePlus size={22} />
          </div>
          <div>
            <p className="text-sm font-bold text-app">No Categories Found</p>
            <p className="mt-0.5 text-xs text-muted">Create your first category.</p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className={`inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-500 px-4 py-2 text-xs font-semibold text-white ${BUTTON_INTERACTION_CLASSES}`}
          >
            <Plus size={15} />
            Add Category
          </button>
        </div>
      </td>
    </tr>
  );
}

function DeleteConfirmModal({ category, onCancel, onConfirm, deleting }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !deleting) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-category-title"
        aria-describedby="delete-category-desc"
        className="w-full max-w-sm rounded-lg border border-app bg-surface p-5 shadow-2xl outline-none animate-[scaleIn_150ms_ease-out]"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 id="delete-category-title" className="text-sm font-bold text-app">
              Delete Category?
            </h2>
            <p id="delete-category-desc" className="mt-1 text-xs text-muted">
              This action cannot be undone.
              {category?.name ? ` "${category.name}" will be permanently removed.` : ""}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className={`rounded-lg border border-app px-4 py-2 text-xs font-semibold text-app hover:bg-app ${BUTTON_INTERACTION_CLASSES}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            aria-busy={deleting}
            className={`inline-flex items-center gap-2 rounded-lg border border-red-600 bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 ${BUTTON_INTERACTION_CLASSES}`}
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Modal                                                                   */
/* ---------------------------------------------------------------------- */

function CategoryModal({ category, onClose, onSaved }) {
  const { isDark } = useTheme();
  const isEdit = Boolean(category?.id);
  const [form, setForm] = useState({
    name: category?.name || "",
    path: category?.path || "",
    imageFile: null,
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [errors, setErrors] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const blobRef = useRef(null);
  const dialogRef = useRef(null);
  const isOnline = useOnlineStatus();

  const currentImageUrl = useMemo(() => getImageUrl(category?.image), [category?.image]);
  const displayImage = previewUrl || currentImageUrl;

  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, []);

  // Smooth close: play the fade-out animation before actually unmounting.
  const requestClose = useCallback(() => {
    if (saving) return; // Disable close while a save is in flight
    setIsClosing(true);
    window.setTimeout(onClose, 150);
  }, [saving, onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
      return;
    }

    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const nextPreview = URL.createObjectURL(file);
    blobRef.current = nextPreview;
    setPreviewUrl(nextPreview);
    setField("imageFile", file);
    setErrors((prev) => ({ ...prev, imageFile: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) {
      nextErrors.name = "Category name is required.";
    }
    if (!isEdit && !form.imageFile) {
      nextErrors.imageFile = "Category image is required.";
    }
    if (!form.destinationType && !form.path.trim()) {
      nextErrors.path = "Either click path or destination is required.";
    }
    if (form.path.trim() && !form.path.trim().startsWith("/")) {
      nextErrors.path = "Click path must start with /.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error(Object.values(nextErrors)[0]);
      return false;
    }
    return true;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate() || saving) return;

    if (!isOnline) {
      toast.error("You're offline. Changes cannot be saved until the connection is restored.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("path", form.path.trim());
      formData.append("destination_type", form.destinationType || "");
      formData.append("destination_id", form.destinationId ? String(form.destinationId) : "");

      if (form.imageFile) {
        setCompressing(true);
        const compressed = await compressImage(form.imageFile);
        setCompressing(false);
        formData.append("image", compressed);
      }

      if (isEdit) {
        await homepageCategoriesAPI.update(category.id, formData);
        toast.success("Category updated successfully.");
      } else {
        await homepageCategoriesAPI.create(formData);
        toast.success("Category created successfully.");
      }
      onSaved();
      requestClose();
    } catch (error) {
      // Keep entered values, uploaded image, and selection so the user can retry.
      setCompressing(false);
      toast.error(getApiErrorMessage(error, "Failed to save category."));
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || compressing;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-150 ${
        isClosing ? "opacity-0" : "opacity-100 animate-[fadeIn_150ms_ease-out]"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <form
        ref={dialogRef}
        tabIndex={-1}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        aria-busy={isBusy}
        className={`flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-app bg-surface shadow-2xl outline-none transition-all duration-150 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100 animate-[scaleIn_150ms_ease-out]"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-app px-5 py-4">
          <h2 id="category-modal-title" className="text-base font-bold text-app">
            {isEdit ? "Edit Category" : "Add Category"}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            aria-label="Close"
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-app hover:text-app ${BUTTON_INTERACTION_CLASSES}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {!isOnline && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-600"
            >
              <WifiOff size={14} className="shrink-0" />
              <span>You're offline. Changes cannot be saved until the connection is restored.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-app" htmlFor="category-name">
              Category Name *
            </label>
            <input
              id="category-name"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              className={`input-field transition-colors duration-150 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                errors.name ? "border-red-500" : ""
              }`}
              placeholder="T-Shirts"
              maxLength={100}
              disabled={saving}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "category-name-error" : undefined}
            />
            <p
              id="category-name-error"
              className="min-h-[16px] text-[11px] font-medium text-red-500"
              aria-live="polite"
            >
              {errors.name || ""}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-app">
              Category Image *
            </label>
            <label
              className={`relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-app transition-colors duration-150 hover:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500 ${
                errors.imageFile ? "border-red-500" : "border-app"
              } ${saving ? "pointer-events-none opacity-70" : ""}`}
            >
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={saving}
                aria-invalid={Boolean(errors.imageFile)}
              />
              {displayImage ? (
                <img
                  src={displayImage}
                  alt=""
                  className="h-full w-full object-cover transition-opacity duration-200"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted">
                  <ImagePlus size={32} />
                  <span className="text-xs font-semibold">Upload image</span>
                </div>
              )}
              {displayImage && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/50 py-1.5 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-150 hover:opacity-100">
                  {isEdit ? "Replace image" : "Change image"}
                </div>
              )}
              {compressing && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-xs font-semibold text-white">
                  <Loader2 size={14} className="animate-spin" />
                  Uploading...
                </div>
              )}
            </label>
            <p className="min-h-[16px] text-[11px] font-medium text-red-500" aria-live="polite">
              {errors.imageFile || ""}
            </p>
          </div>

          <div className="space-y-1.5">
            <RoutePicker
              label="Click Path"
              value={form.path}
              onChange={(route) => setField("path", route)}
              placeholder="Search category or custom products..."
              isDark={isDark}
              fixedOptions={CATEGORY_OPTIONS}
              disabled={saving}
            />
            <p className="min-h-[16px] text-[11px] font-medium text-red-500" aria-live="polite">
              {errors.path || ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-app px-5 py-4">
          <button
            type="button"
            onClick={requestClose}
            className={`rounded-lg border border-app px-4 py-2 text-xs font-semibold text-app hover:bg-app ${BUTTON_INTERACTION_CLASSES}`}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 ${BUTTON_INTERACTION_CLASSES}`}
            disabled={saving}
            aria-busy={saving}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? (isEdit ? "Saving..." : "Adding...") : isEdit ? "Save Changes" : "Add Category"}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatClickPath(path) {
  if (!path) return "";
  if (path.startsWith("/products?category=")) {
    return `category/${path.replace("/products?category=", "")}`;
  }
  if (path.startsWith("/")) {
    return path.substring(1);
  }
  return path;
}

export default function CategoriesPage() {
  const { isDark } = useTheme();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalCategory, setModalCategory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const isOnline = useOnlineStatus();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await homepageCategoriesAPI.list();
      setCategories(response.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load categories."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    setModalCategory(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setModalCategory(category);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalCategory(null);
  };

  const requestDelete = (category) => {
    if (deletingId) return; // A delete is already in progress
    setPendingDelete(category);
  };

  const confirmDelete = async () => {
    const category = pendingDelete;
    if (!category) return;

    if (!isOnline) {
      toast.error("You're offline. Changes cannot be saved until the connection is restored.");
      return;
    }

    setDeletingId(category.id);
    try {
      await homepageCategoriesAPI.delete(category.id);
      toast.success("Category deleted successfully.");
      setPendingDelete(null);
      loadCategories();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete category."));
    } finally {
      setDeletingId(null);
    }
  };

  const showEmptyState = !loading && categories.length === 0;

  return (
    <div className="min-h-screen bg-app px-0 py-2">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="px-3 sm:px-0">
        <OfflineBanner />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-3 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-app">Categories</h1>
          <p className="mt-1 text-xs text-muted">Homepage category cards</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 sm:w-auto ${BUTTON_INTERACTION_CLASSES}`}
        >
          <Plus size={15} />
          Add Category
        </button>
      </div>

      <div className="mx-3 overflow-hidden rounded-lg border border-app bg-surface sm:mx-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-app">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted">Image</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted">Click Path</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border" aria-live="polite" aria-busy={loading}>
              {loading && <TableSkeletonRows rows={4} />}

              {showEmptyState && <EmptyState onAdd={openCreate} />}

              {!loading &&
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="transition-colors duration-150 hover:bg-app/70"
                  >
                    <td className="px-4 py-3">
                      <img
                        src={getImageUrl(category.image)}
                        alt={category.name}
                        className="h-14 w-20 rounded-md object-cover transition-opacity duration-150"
                        loading="lazy"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-app">
                      {category.name}
                    </td>
                    <td className="px-4 py-3">
                      {category.path ? (
                        <span
                          className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
                        >
                          {formatClickPath(category.path)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted/50 italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          disabled={deletingId === category.id}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-app px-3 text-xs font-semibold text-app hover:bg-app ${BUTTON_INTERACTION_CLASSES}`}
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(category)}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 px-3 text-xs font-semibold text-red-600 hover:bg-red-500/10 ${BUTTON_INTERACTION_CLASSES}`}
                          disabled={deletingId === category.id}
                          aria-busy={deletingId === category.id}
                        >
                          {deletingId === category.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          {deletingId === category.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <CategoryModal
          category={modalCategory}
          onClose={closeModal}
          onSaved={loadCategories}
        />
      )}

      {pendingDelete && (
        <DeleteConfirmModal
          category={pendingDelete}
          deleting={deletingId === pendingDelete.id}
          onCancel={() => {
            if (!deletingId) setPendingDelete(null);
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
