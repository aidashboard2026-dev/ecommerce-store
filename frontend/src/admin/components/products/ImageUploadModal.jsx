import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Loader2,
  Package,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import Modal from "@/shared/components/ui/Modal";
import { productsAPI as productsApi } from "@/shared/services/api";
import { getApiErrorMessage, getImageUrl } from "@/shared/utils/productUtils";
import useBusinessLimits from "@/shared/hooks/useBusinessLimits";

const IMAGE_TYPE = "thumbnail";
const IMAGE_LABEL = "Thumbnail";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ALLOWED_ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Displays the current product thumbnail.
 */
function CurrentImage({ imageUrl, onDelete, isDeleting }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timerRef = useRef(null);

  const resolvedImageUrl = getImageUrl(imageUrl);

  useEffect(() => {
    if (!confirmDelete) return undefined;

    timerRef.current = setTimeout(() => {
      setConfirmDelete(false);
    }, 3000);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [confirmDelete]);

  if (!resolvedImageUrl) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-app bg-surface/40">
        <div className="text-center">
          <Package size={18} className="mx-auto mb-1 text-muted opacity-50" />

          <p className="text-xs text-muted">No thumbnail image yet</p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    setConfirmDelete(false);
    onDelete();
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Current Thumbnail
      </p>

      <div
        className="group relative w-full overflow-hidden rounded-xl border border-app bg-surface/40"
        style={{ maxHeight: 220 }}
      >
        <img
          src={resolvedImageUrl}
          alt="Product thumbnail"
          className="w-full object-contain"
          style={{ maxHeight: 220 }}
        />

        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/30">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 group-hover:opacity-100"
            >
              <Trash2 size={12} />
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <AlertTriangle size={12} />
              )}

              {isDeleting ? "Removing…" : "Confirm remove"}
            </button>
          )}
        </div>

        <span className="absolute left-2 top-2 rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
          Thumbnail
        </span>
      </div>
    </div>
  );
}

/**
 * Product thumbnail drag-and-drop upload area.
 */
function UploadDropZone({
  preview,
  onFileSelect,
  fileInputRef,
  disabled,
  maxFileSizeLabel,
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file) => {
    if (disabled || !file) return;

    onFileSelect(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    handleFile(event.dataTransfer.files?.[0]);
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
        if (!disabled) {
          fileInputRef.current?.click();
        }
      }}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();

        if (!disabled) {
          setIsDragging(true);
        }
      }}
      onDragLeave={() => {
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`
        cursor-pointer rounded-xl border-2 border-dashed p-4 h-56 flex flex-col items-center justify-center
        text-center transition-all
        ${
          disabled
            ? "cursor-not-allowed border-gray-400 bg-gray-100/10 opacity-50"
            : isDragging
              ? "border-brand-500 bg-brand-500/5"
              : "border-app hover:border-brand-400 hover:bg-surface/50"
        }
      `}
    >
      {preview ? (
        <img
          src={preview}
          alt="Selected thumbnail preview"
          className="mx-auto max-h-40 rounded-lg object-contain"
        />
      ) : (
        <>
          <Upload size={24} className="mx-auto mb-2 text-muted" />

          <p className="text-sm text-muted">
            Drop thumbnail image here or{" "}
            <span className="text-brand-500">browse</span>
          </p>

          <p className="mt-1 text-xs text-muted">
            JPG, PNG, WebP · max {maxFileSizeLabel}
          </p>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_ACCEPT}
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
        }}
      />
    </div>
  );
}

/**
 * Product thumbnail upload modal.
 *
 * This component now handles only:
 * - Thumbnail preview
 * - Thumbnail upload
 * - Thumbnail replacement
 * - Thumbnail deletion
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
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const {
    limits,
    isLoading: limitsLoading,
    error: limitsError,
    refetch: refetchLimits,
  } = useBusinessLimits();

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const isLocalFlow =
    product && (product.id === null || product.id === undefined);

  const currentImageUrl = product?.thumbnail;

  const clearPreview = useCallback(() => {
    setPreview((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }

      return null;
    });
  }, []);

  const clearSelection = useCallback(() => {
    clearPreview();
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [clearPreview]);

  useEffect(() => {
    if (!isOpen) {
      clearSelection();
    }
  }, [isOpen, clearSelection]);

  useEffect(() => {
    clearSelection();
  }, [product?.id, clearSelection]);

  useEffect(() => {
    return () => {
      clearPreview();
    };
  }, [clearPreview]);

  const invalidateProductQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [queryKeyPrefix],
      }),

      queryClient.invalidateQueries({
        queryKey: [detailQueryKey],
      }),
    ]);
  }, [queryClient, queryKeyPrefix, detailQueryKey]);

  const selectFile = useCallback(
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
        const maxSizeInMb = limits.max_image_size / (1024 * 1024);

        toast.error(`File must be under ${maxSizeInMb} MB.`);
        return;
      }

      clearPreview();

      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [limits, clearPreview],
  );

  const uploadMutation = useMutation({
    mutationFn: () => {
      return api.uploadImage(product.id, selectedFile, IMAGE_TYPE);
    },

    onSuccess: async () => {
      toast.success("Thumbnail uploaded successfully.");

      await invalidateProductQueries();
      clearSelection();
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Thumbnail upload failed."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      return api.deleteImage(product.id, IMAGE_TYPE);
    },

    onSuccess: async () => {
      toast.success("Thumbnail removed successfully.");

      await invalidateProductQueries();
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to remove thumbnail."));
    },
  });

  const currentImageCount = product
    ? (product.thumbnail ? 1 : 0) +
      (product.image_front ? 1 : 0) +
      (product.image_back ? 1 : 0) +
      (product.image_size_chart ? 1 : 0) +
      (product.gallery_images?.length || 0)
    : 0;

  const willAddNewImage = !currentImageUrl;

  const isLimitReached = limits
    ? currentImageCount >= limits.max_product_images && willAddNewImage
    : true;

  const maxFileSizeLabel = limits
    ? `${limits.max_image_size / (1024 * 1024)} MB`
    : "10 MB";

  const handleUpload = () => {
    if (!selectedFile) return;

    if (!limits) {
      toast.error("Store limits are not loaded yet. Please wait.");
      return;
    }

    if (isLimitReached) {
      toast.error(
        <div>
          <strong
            style={{
              display: "block",
              marginBottom: "4px",
            }}
          >
            Maximum Limit Reached
          </strong>

          <div
            style={{
              whiteSpace: "pre-line",
              fontSize: "12px",
              lineHeight: "1.4",
            }}
          >
            You have reached the maximum allowed limit of{" "}
            {limits.max_product_images} images for this product.
            {"\n"}
            Please delete an existing image before uploading another.
          </div>
        </div>,
      );

      return;
    }

    if (isLocalFlow && onUploadLocal) {
      onUploadLocal(IMAGE_TYPE, selectedFile);

      toast.success("Thumbnail staged successfully.");

      clearSelection();
      return;
    }

    uploadMutation.mutate();
  };

  const handleDelete = () => {
    if (isLocalFlow && onDeleteLocal) {
      onDeleteLocal(IMAGE_TYPE);

      toast.success("Thumbnail removed.");

      return;
    }

    deleteMutation.mutate();
  };

  const uploadButtonLabel = currentImageUrl
    ? "Replace Thumbnail"
    : "Upload Thumbnail";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Image" size="lg">
      <div className="space-y-4 p-4 text-xs">
        {limitsLoading && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" />

            <span>Loading store limits...</span>
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

        {(!isLimitReached || !willAddNewImage) && (
          <div className="space-y-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {currentImageUrl ? "Replace Thumbnail" : "Upload Thumbnail"}
            </p>

            <UploadDropZone
              preview={preview}
              onFileSelect={selectFile}
              fileInputRef={fileInputRef}
              disabled={isLimitReached}
              maxFileSizeLabel={maxFileSizeLabel}
            />
          </div>
        )}

        {selectedFile && (
          <button
            type="button"
            onClick={clearSelection}
            className="flex items-center gap-1 text-xs text-muted hover:text-app"
          >
            <X size={11} />
            Clear selection
          </button>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary sm:px-6"
          >
            Done
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={
              !selectedFile || uploadMutation.isPending || isLimitReached
            }
            title={
              isLimitReached
                ? "Maximum image limit reached. Delete an existing image to continue."
                : ""
            }
            className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}

            {uploadMutation.isPending ? "Uploading…" : uploadButtonLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}