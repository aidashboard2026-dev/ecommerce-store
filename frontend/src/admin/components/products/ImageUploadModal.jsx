import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ImageIcon,
  Loader2,
  Package,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import Modal from "@/shared/components/ui/Modal";
import { productsAPI as productsApi } from "@/shared/services/api";
import { getApiErrorMessage, getImageUrl } from "@/shared/utils/productUtils";
import useBusinessLimits from "@/shared/hooks/useBusinessLimits";

// ─── Constants ────────────────────────────────────────────────────────────────

const THUMBNAIL_TYPE  = "thumbnail";
const ALLOWED_TYPES   = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_ACCEPT  = "image/jpeg,image/png,image/webp";

// ─── Thumbnail Section Sub-component ──────────────────────────────────────────

function CurrentThumbnail({
  imageUrl,
  stagedPreview,
  onFileSelect,
  onDelete,
  isDeleting,
  isUploading,
  disabled,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timerRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const displayUrl = stagedPreview || (imageUrl ? getImageUrl(imageUrl) : null);

  useEffect(() => {
    if (!confirmDelete) return undefined;
    timerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timerRef.current);
  }, [confirmDelete]);

  return (
    <div className="space-y-3 rounded-xl border border-app bg-surface/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Thumbnail (Cover Image)
        </p>
        {stagedPreview && (
          <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-500">
            Pending Upload
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Image Display */}
        <div className="group relative h-28 w-28 flex-none overflow-hidden rounded-xl border border-app bg-surface/60">
          {displayUrl ? (
            <>
              <img
                src={displayUrl}
                alt="Product thumbnail"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/40">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isDeleting || isUploading}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity hover:bg-red-700 disabled:opacity-50 group-hover:opacity-100"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(false);
                      onDelete();
                    }}
                    disabled={isDeleting || isUploading}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <AlertTriangle size={11} />
                    )}
                    {isDeleting ? "Removing…" : "Confirm"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-2 text-center text-muted">
              <ImageIcon size={22} className="mb-1 opacity-40" />
              <span className="text-[10px]">No Thumbnail</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-1 flex-col justify-center gap-2">
          <p className="text-xs text-muted">
            The thumbnail is used as the primary cover image across the store and catalog.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              disabled={disabled || isUploading || isDeleting}
              className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <Upload size={13} />
              {displayUrl ? "Replace Thumbnail" : "Upload Thumbnail"}
            </button>

            <input
              ref={thumbnailInputRef}
              type="file"
              accept={ALLOWED_ACCEPT}
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelect(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gallery Image Tile Sub-component ─────────────────────────────────────────

function GalleryImageTile({ url, index, isCover, onDelete, isDeleting }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timerRef = useRef(null);
  const resolved = url?.startsWith("blob:") ? url : getImageUrl(url);

  useEffect(() => {
    if (!confirmDelete) return undefined;
    timerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timerRef.current);
  }, [confirmDelete]);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-app bg-surface/40">
      <img
        src={resolved}
        alt={`Gallery ${index + 1}`}
        className="h-full w-full object-cover"
      />

      {isCover && (
        <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded bg-brand-500 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
          <Star size={7} /> Cover
        </span>
      )}

      {/* Delete overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/40">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity hover:bg-red-700 disabled:opacity-50 group-hover:opacity-100"
          >
            <Trash2 size={10} /> Delete
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false);
              onDelete(index);
            }}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <AlertTriangle size={10} />
            )}
            {isDeleting ? "Removing…" : "Confirm"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Shared DropZone ─────────────────────────────────────────────────────────

function UploadDropZone({
  onFileSelect,
  fileInputRef,
  disabled,
  maxFileSizeLabel,
  multiple = true,
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (multiple) {
      files.forEach((f) => onFileSelect(f));
    } else if (files[0]) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      title={
        disabled
          ? "Maximum image limit reached. Delete an existing image to continue."
          : ""
      }
      onClick={() => {
        if (!disabled) fileInputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
        disabled
          ? "cursor-not-allowed border-gray-400 bg-gray-100/10 opacity-50"
          : isDragging
          ? "border-brand-500 bg-brand-500/5"
          : "border-app hover:border-brand-400 hover:bg-surface/50"
      }`}
    >
      <Upload size={22} className="mx-auto mb-1.5 text-muted" />
      <p className="text-sm font-medium text-muted">
        Drop images here or <span className="text-brand-500">browse</span>
      </p>
      <p className="mt-1 text-xs text-muted">
        PNG · JPG · WEBP · max {maxFileSizeLabel}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_ACCEPT}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (multiple) {
            files.forEach((f) => onFileSelect(f));
          } else if (files[0]) {
            onFileSelect(files[0]);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

/**
 * ImageUploadModal
 *
 * Supports two modes:
 * • mode="product" (default) — manages dedicated Thumbnail AND Gallery images.
 * • mode="gallery"           — gallery-only mode (used for Custom Products).
 */
export default function ImageUploadModal({
  isOpen,
  onClose,
  product,
  api = productsApi,
  queryKeyPrefix = "products",
  detailQueryKey = "product",
  onUploadLocal,
  onDeleteLocal,

  // Options & Overrides
  mode = "product",
  galleryImages = [],
  limitKey = "max_product_images",
  onGalleryDelete,
  onSaveLocal,
  onSaved,
}) {
  const queryClient = useQueryClient();
  const galleryInputRef = useRef(null);

  const {
    limits,
    isLoading: limitsLoading,
    error: limitsError,
    refetch: refetchLimits,
  } = useBusinessLimits();

  // ── State ──────────────────────────────────────────────────────────────────
  // Thumbnail state
  const [stagedThumbnailFile, setStagedThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview]       = useState(null);

  // Gallery queue state
  const [queue, setQueue]                 = useState([]);
  const [deletingIndex, setDeletingIndex] = useState(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [isDeletingThumbnail, setIsDeletingThumbnail] = useState(false);

  const isGalleryOnly = mode === "gallery";
  const isLocalFlow   = product && (product.id === null || product.id === undefined);

  // ── Cleanup logic ──────────────────────────────────────────────────────────
  const clearThumbnailStaging = useCallback(() => {
    setThumbnailPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setStagedThumbnailFile(null);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      clearThumbnailStaging();
      clearQueue();
      setDeletingIndex(null);
      setIsSaving(false);
      setIsDeletingThumbnail(false);
    }
  }, [isOpen, clearThumbnailStaging, clearQueue]);

  useEffect(() => {
    clearThumbnailStaging();
    clearQueue();
  }, [product?.id, clearThumbnailStaging, clearQueue]);

  // ── Derived values & limits ────────────────────────────────────────────────
  const maxFileSizeLabel = limits
    ? `${limits.max_image_size / (1024 * 1024)} MB`
    : "10 MB";

  const backendLimit = limits?.[limitKey] ?? null;

  // The backend limit (e.g. 6) includes 1 Thumbnail slot for standard products.
  // In mode="product", galleryLimit = MAX_PRODUCT_IMAGES - 1 (e.g. 5).
  // In mode="gallery" (Custom Products with no thumbnail), galleryLimit = backendLimit.
  const galleryLimit = isGalleryOnly
    ? backendLimit
    : backendLimit !== null
    ? Math.max(0, backendLimit - 1)
    : null;

  const activeServerGallery =
    galleryImages.length > 0
      ? galleryImages
      : product?.gallery_images || [];

  const serverCount  = activeServerGallery.length;
  const totalGallery = serverCount + queue.length;
  const isLimitReached_gallery =
    galleryLimit !== null && totalGallery >= galleryLimit;

  const invalidateProductQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] }),
      queryClient.invalidateQueries({ queryKey: [detailQueryKey] }),
    ]);
  }, [queryClient, queryKeyPrefix, detailQueryKey]);

  // ── Thumbnail File Selection ───────────────────────────────────────────────
  const selectThumbnailFile = useCallback(
    (file) => {
      if (!file) return;
      if (!limits) {
        toast.error("Store limits are not loaded yet. Please wait.");
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Only JPG, PNG, and WebP images are allowed.");
        return;
      }
      if (file.size > limits.max_image_size) {
        toast.error(
          `File must be under ${limits.max_image_size / (1024 * 1024)} MB.`
        );
        return;
      }

      clearThumbnailStaging();
      setStagedThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    },
    [limits, clearThumbnailStaging]
  );

  // ── Thumbnail Removal ──────────────────────────────────────────────────────
  const handleDeleteThumbnail = useCallback(async () => {
    if (stagedThumbnailFile) {
      clearThumbnailStaging();
      toast.success("Pending thumbnail removed.");
      return;
    }

    if (isLocalFlow) {
      if (onDeleteLocal) onDeleteLocal("thumbnail");
      clearThumbnailStaging();
      toast.success("Thumbnail removed.");
      return;
    }

    if (!product?.id) return;

    setIsDeletingThumbnail(true);
    try {
      await api.deleteImage(product.id, THUMBNAIL_TYPE);
      toast.success("Thumbnail removed successfully.");
      await invalidateProductQueries();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to remove thumbnail."));
    } finally {
      setIsDeletingThumbnail(false);
    }
  }, [
    stagedThumbnailFile,
    clearThumbnailStaging,
    isLocalFlow,
    onDeleteLocal,
    product?.id,
    api,
    invalidateProductQueries,
  ]);

  // ── Gallery File Selection ────────────────────────────────────────────────
  const selectGalleryFile = useCallback(
    (file) => {
      if (!file) return;
      if (!limits) {
        toast.error("Store limits are not loaded yet. Please wait.");
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Only JPG, PNG, and WebP images are allowed.");
        return;
      }
      if (file.size > limits.max_image_size) {
        toast.error(
          `File must be under ${limits.max_image_size / (1024 * 1024)} MB.`
        );
        return;
      }

      if (isLimitReached_gallery) {
        toast.error(`Maximum ${galleryLimit} gallery images allowed.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setQueue((prev) => [...prev, { file, previewUrl }]);
    },
    [limits, isLimitReached_gallery, backendLimit]
  );

  // ── Gallery Image Removal (Server & Queued) ──────────────────────────────
  const handleDeleteServerGalleryImage = useCallback(
    (index) => {
      if (isLocalFlow && onDeleteLocal) {
        onDeleteLocal("gallery", index);
        toast.success("Image removed.");
        return;
      }

      if (onGalleryDelete) {
        setDeletingIndex(index);
        Promise.resolve(onGalleryDelete(index))
          .then(() => {
            invalidateProductQueries();
            toast.success("Gallery image deleted.");
          })
          .catch((err) => {
            toast.error(getApiErrorMessage(err, "Failed to remove image."));
          })
          .finally(() => setDeletingIndex(null));
        return;
      }

      if (!product?.id) return;

      setDeletingIndex(index);
      api
        .deleteGalleryImage(product.id, index)
        .then(() => {
          invalidateProductQueries();
          toast.success("Gallery image deleted.");
        })
        .catch((err) => {
          toast.error(getApiErrorMessage(err, "Failed to remove image."));
        })
        .finally(() => setDeletingIndex(null));
    },
    [isLocalFlow, onDeleteLocal, onGalleryDelete, product?.id, api, invalidateProductQueries]
  );

  const handleRemoveQueuedGalleryImage = useCallback((idx) => {
    setQueue((prev) => {
      if (prev[idx]?.previewUrl) URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  // ── Combined Save Handler ──────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (!stagedThumbnailFile && queue.length === 0) {
      onClose();
      return;
    }

    if (!limits) {
      toast.error("Store limits are not loaded yet.");
      return;
    }

    setIsSaving(true);

    try {
      // Local flow (new product creation)
      if (isLocalFlow || !product?.id) {
        if (stagedThumbnailFile && onUploadLocal) {
          onUploadLocal("thumbnail", stagedThumbnailFile);
        }
        if (queue.length > 0) {
          if (onUploadLocal) {
            onUploadLocal(
              "gallery",
              queue.map((q) => q.file)
            );
          } else if (onSaveLocal) {
            onSaveLocal(queue.map((q) => q.file));
          }
        }
        toast.success("Images staged successfully.");
        clearThumbnailStaging();
        clearQueue();
        onClose();
        return;
      }

      // Backend edit flow (existing product)
      let okCount = 0;
      let failCount = 0;

      // 1. Upload thumbnail if changed
      if (stagedThumbnailFile) {
        try {
          await api.uploadImage(product.id, stagedThumbnailFile, THUMBNAIL_TYPE);
          okCount++;
        } catch (err) {
          failCount++;
          toast.error(
            getApiErrorMessage(err, "Thumbnail upload failed.")
          );
        }
      }

      // 2. Upload queued gallery images
      for (const { file } of queue) {
        try {
          await api.uploadImage(product.id, file, "gallery", false);
          okCount++;
        } catch {
          failCount++;
        }
      }

      if (failCount === 0) {
        toast.success(`${okCount} image${okCount !== 1 ? "s" : ""} saved.`);
      } else {
        toast.error(
          `${failCount} image${failCount !== 1 ? "s" : ""} failed to upload.`
        );
      }

      await invalidateProductQueries();
      if (onSaved) onSaved();

      clearThumbnailStaging();
      clearQueue();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-app px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-app">Product Images</h2>
          <p className="mt-0.5 text-xs text-muted">
            Manage thumbnail cover image and gallery images for this product.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-app"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-6 overflow-y-auto p-5">
        {/* Limits Status / Loading / Error */}
        {limitsLoading && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" />
            <span>Loading store limits…</span>
          </div>
        )}
        {limitsError && (
          <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-500">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Unable to load store limits.</span>
            </div>
            <button
              type="button"
              onClick={() => refetchLimits()}
              className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 1. THUMBNAIL SECTION (Standard Products mode) ── */}
        {!isGalleryOnly && (
          <CurrentThumbnail
            imageUrl={product?.thumbnail}
            stagedPreview={thumbnailPreview}
            onFileSelect={selectThumbnailFile}
            onDelete={handleDeleteThumbnail}
            isDeleting={isDeletingThumbnail}
            isUploading={isSaving}
            disabled={limitsLoading || !!limitsError}
          />
        )}

        {/* ── 2. GALLERY IMAGES SECTION ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Gallery Images
            </p>
            {galleryLimit !== null && (
              <span
                className={`text-xs font-medium ${
                  totalGallery >= galleryLimit ? "text-red-500 font-bold" : "text-muted"
                }`}
              >
                {totalGallery} / {galleryLimit}
              </span>
            )}
          </div>

          {/* Gallery Images Grid */}
          {(activeServerGallery.length > 0 || queue.length > 0) && (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {/* Existing Server / Staged Gallery Images */}
              {activeServerGallery.map((url, i) => (
                <GalleryImageTile
                  key={`server-${i}`}
                  url={url}
                  index={i}
                  isCover={false}
                  onDelete={handleDeleteServerGalleryImage}
                  isDeleting={deletingIndex === i}
                />
              ))}

              {/* Queued (Not yet saved) Gallery Images */}
              {queue.map((item, i) => (
                <div
                  key={`queued-${i}`}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-dashed border-brand-500/60 bg-surface/40"
                >
                  <img
                    src={item.previewUrl}
                    alt="New upload"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded bg-brand-500 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
                    New
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/40">
                    <button
                      type="button"
                      onClick={() => handleRemoveQueuedGalleryImage(i)}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity hover:bg-red-700 group-hover:opacity-100"
                    >
                      <X size={10} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {activeServerGallery.length === 0 && queue.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-app py-6 text-muted">
              <Package size={28} className="mb-1.5 opacity-30" />
              <p className="text-xs">No gallery images added yet.</p>
            </div>
          )}

          {/* Gallery Drop Zone */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {isLimitReached_gallery
                ? "Maximum gallery images reached."
                : "Add Gallery Images"}
            </p>
            <UploadDropZone
              onFileSelect={selectGalleryFile}
              fileInputRef={galleryInputRef}
              disabled={isLimitReached_gallery || limitsLoading || !!limitsError}
              maxFileSizeLabel={maxFileSizeLabel}
              multiple
            />
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-app px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="btn-secondary flex-none px-5 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={
            isSaving ||
            (!stagedThumbnailFile &&
              queue.length === 0 &&
              (isLocalFlow || !product?.id))
          }
          className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {isSaving ? "Saving Images…" : "Save Images"}
        </button>
      </div>
    </Modal>
  );
}
