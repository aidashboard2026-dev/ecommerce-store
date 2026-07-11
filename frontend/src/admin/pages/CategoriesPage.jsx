import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { homepageCategoriesAPI } from "@/shared/services/api";
import { useTheme } from "@/shared/hooks/useAuth";

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

const emptyForm = {
  name: "",
  path: "",
  imageFile: null,
};

function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("blob:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/")) return `${BACKEND_ORIGIN}${path}`;
  return `${BACKEND_ORIGIN}/uploads/categories/${path}`;
}

function CategoryModal({ category, onClose, onSaved }) {
  const isEdit = Boolean(category?.id);
  const [form, setForm] = useState({
    name: category?.name || "",
    path: category?.path || "",
    imageFile: null,
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const blobRef = useRef(null);

  const currentImageUrl = useMemo(() => getImageUrl(category?.image), [category?.image]);
  const displayImage = previewUrl || currentImageUrl;

  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, []);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (event) => {
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
  };

  const validate = () => {
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return false;
    }
    if (!isEdit && !form.imageFile) {
      toast.error("Category image is required.");
      return false;
    }
    if (!form.destinationType && !form.path.trim()) {
      toast.error("Either click path or destination is required.");
      return false;
    }
    if (form.path.trim() && !form.path.trim().startsWith("/")) {
      toast.error("Click path must start with /.");
      return false;
    }
    return true;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate() || saving) return;

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("path", form.path.trim());
    formData.append("destination_type", form.destinationType || "");
    formData.append("destination_id", form.destinationId ? String(form.destinationId) : "");
    if (form.imageFile) formData.append("image", form.imageFile);

    setSaving(true);
    try {
      if (isEdit) {
        await homepageCategoriesAPI.update(category.id, formData);
        toast.success("Category updated.");
      } else {
        await homepageCategoriesAPI.create(formData);
        toast.success("Category created.");
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-app bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-app px-5 py-4">
          <h2 className="text-base font-bold text-app">
            {isEdit ? "Edit Category" : "Add Category"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-app hover:text-app"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-app" htmlFor="category-name">
              Category Name *
            </label>
            <input
              id="category-name"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              className="input-field"
              placeholder="T-Shirts"
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-app">
              Category Image *
            </label>
            <label className="flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-app bg-app">
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />
              {displayImage ? (
                <img
                  src={displayImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted">
                  <ImagePlus size={32} />
                  <span className="text-xs font-semibold">Upload image</span>
                </div>
              )}
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-app" htmlFor="category-path">
              Click Path *
            </label>
            <input
              id="category-path"
              value={form.path}
              onChange={(event) => setField("path", event.target.value)}
              className="input-field"
              placeholder="/products/t-shirts"
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-app px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-app px-4 py-2 text-xs font-semibold text-app hover:bg-app"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            disabled={saving}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Add Category"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CategoriesPage() {
  const { isDark } = useTheme();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalCategory, setModalCategory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await homepageCategoriesAPI.list();
      setCategories(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load categories.");
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

  const deleteCategory = async (category) => {
    const confirmed = window.confirm(`Delete ${category.name}?`);
    if (!confirmed) return;

    setDeletingId(category.id);
    try {
      await homepageCategoriesAPI.delete(category.id);
      toast.success("Category deleted.");
      loadCategories();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to delete category.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-app px-0 py-2">
      <ToastContainer
        position="top-right"
        autoClose={2500}
        theme={isDark ? "dark" : "light"}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-app">Categories</h1>
          <p className="mt-1 text-xs text-muted">Homepage category cards</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} />
          + Add Category
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-app bg-surface">
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
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted">
                    Loading categories...
                  </td>
                </tr>
              )}

              {!loading && categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted">
                    No categories yet.
                  </td>
                </tr>
              )}

              {!loading &&
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-app/70">
                    <td className="px-4 py-3">
                      <img
                        src={getImageUrl(category.image)}
                        alt={category.name}
                        className="h-14 w-20 rounded-md object-cover"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-app">
                      {category.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {category.path}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-app px-3 text-xs font-semibold text-app hover:bg-app"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(category)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 px-3 text-xs font-semibold text-red-600 hover:bg-red-500/10"
                          disabled={deletingId === category.id}
                        >
                          {deletingId === category.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          Delete
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
    </div>
  );
}
