import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/shared/services/api";
import useBusinessLimits from "@/shared/hooks/useBusinessLimits";

import { ImagePlus, Plus, Search, X, Pencil, Eye, EyeOff, AlertTriangle, Loader2, WifiOff } from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "@/shared/hooks/useAuth";
import { getImageUrl, getApiErrorMessage } from "@/shared/utils/productUtils";
import { compressImage } from "@/shared/utils/imageCompression";
import RoutePicker from "@/shared/components/ui/RoutePicker";
import BannerRenderer from "@/shared/components/BannerRenderer";

// ─── Placement options ───────────────────────────────────────────────────────
const PLACEMENTS = [
  { value: "hero", label: "Hero Slider" },
  { value: "homepage_mid", label: "Homepage Mid" },
  { value: "category", label: "Category Banner" },
  { value: "sidebar", label: "Sidebar" },
  { value: "popup", label: "Popup Banner" },
];

const MAX_IMAGE_MB = 10;

// ─── Theme-aware style factory ───────────────────────────────────────────────
function getStyles(isDark) {
  return {
    bg: isDark ? "#111827" : "#f9fafb",
    surface: isDark ? "#1e293b" : "#ffffff",
    surfaceAlt: isDark ? "#1f2937" : "#ffffff",
    border: isDark ? "#334155" : "#e2e8f0",
    borderInput: isDark ? "#374151" : "#d1d5db",
    inputBg: isDark ? "#111827" : "#f9fafb",
    textPrimary: isDark ? "#fff" : "#111827",
    textSecondary: isDark ? "#f1f5f9" : "#1e293b",
    textMuted: isDark ? "#64748b" : "#6b7280",
    textLabel: isDark ? "#94a3b8" : "#6b7280",
    cardBg: isDark ? "#0f172a" : "#f1f5f9",
    modalOverlay: isDark ? "rgba(0,0,0,.8)" : "rgba(0,0,0,.5)",
    inputStyle: {
      width: "100%", height: 38, border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
      borderRadius: 6, background: isDark ? "#111827" : "#f9fafb", color: isDark ? "#fff" : "#111827",
      padding: "0 12px", outline: "none", fontSize: 14, boxSizing: "border-box",
    },
  };
}
const btn = {
  base: { height: 38, border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13, transition: "all .2s ease" },
};

// ─── Global + Responsive styles (scoped, no structural change) ─────────────
// Injected once; keeps inline-style approach intact while adding hover/focus/
// animation states and breakpoints that plain style={} objects can't express.
function GlobalStyles() {
  return (
    <style>{`
      @keyframes bp-spin { to { transform: rotate(360deg); } }
      @keyframes bp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
      @keyframes bp-modal-in { from { opacity: 0; transform: scale(.96) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      @keyframes bp-modal-out { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(.97); } }
      @keyframes bp-overlay-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes bp-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

      .bp-spin { animation: bp-spin .6s linear infinite; }
      .bp-skeleton { animation: bp-pulse 1.5s ease-in-out infinite; }
      .bp-overlay-anim { animation: bp-overlay-in .15s ease; }
      .bp-modal-anim { animation: bp-modal-in .18s cubic-bezier(.16,1,.3,1); }
      .bp-fade-in { animation: bp-fade-in .15s ease; }

      .bp-btn { transition: filter .2s ease, transform .1s ease, opacity .2s ease, box-shadow .2s ease; }
      .bp-btn:hover:not(:disabled) { filter: brightness(1.08); }
      .bp-btn:active:not(:disabled) { transform: scale(.98); }
      .bp-btn:disabled { opacity: .6; cursor: not-allowed !important; }
      .bp-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

      .bp-icon-btn { transition: filter .2s ease, transform .1s ease, opacity .2s ease; }
      .bp-icon-btn:hover:not(:disabled) { filter: brightness(1.15); }
      .bp-icon-btn:active:not(:disabled) { transform: scale(.94); }
      .bp-icon-btn:disabled { opacity: .6; cursor: not-allowed !important; }
      .bp-icon-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

      .bp-input { transition: border-color .15s ease, box-shadow .15s ease; }
      .bp-input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }
      .bp-input.bp-input-error { border-color: #ef4444 !important; }
      .bp-input.bp-input-error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,.15); }
      .bp-input::placeholder { color: ${"#9ca3af"}; opacity: 1; }

      .bp-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
      .bp-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,.12); }

      .bp-upload-zone { transition: border-color .2s ease, background .2s ease; }
      .bp-upload-zone:hover { border-color: #3b82f6; }
      .bp-upload-zone:focus-within { outline: 2px solid #3b82f6; outline-offset: 2px; }
      .bp-upload-hover-layer { opacity: 0; transition: opacity .18s ease; }
      .bp-upload-zone:hover .bp-upload-hover-layer { opacity: 1; }

      .bp-toggle { transition: background .2s ease; }
      .bp-toggle-dot { transition: left .2s cubic-bezier(.16,1,.3,1); }
      .bp-toggle-wrap:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

      .bp-drag-active { border-color: #3b82f6 !important; background: rgba(59,130,246,.08) !important; }

      @media (max-width: 480px) {
        .banner-page-root { padding: 16px 14px !important; }
        .banner-page-header h1 { font-size: 26px !important; }
        .banner-page-header { flex-direction: column !important; align-items: stretch !important; }
        .banner-page-header button { width: 100% !important; justify-content: center !important; }
        .banner-form-modal { max-width: 100% !important; border-radius: 0 !important; max-height: 100vh !important; }
        .banner-delete-modal { width: 92% !important; padding: 20px !important; }
        .banner-stat-chip { flex: 1 1 30%; justify-content: center; }
        .banner-form-footer { flex-direction: column !important; }
        .banner-card-actions { flex-wrap: wrap !important; }
      }
      @media (max-width: 360px) {
        .banner-filter-search { width: 100% !important; }
        .banner-filter-select { width: 100% !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        .bp-spin, .bp-skeleton, .bp-overlay-anim, .bp-modal-anim, .bp-fade-in { animation: none !important; }
        .bp-btn, .bp-icon-btn, .bp-card, .bp-input, .bp-toggle, .bp-toggle-dot { transition: none !important; }
      }
    `}</style>
  );
}

// ─── Small inline spinner ────────────────────────────────────────────────────
function Spinner({ size = 14 }) {
  return <Loader2 className="bp-spin" size={size} aria-hidden="true" />;
}

// ─── Banner Form Modal ───────────────────────────────────────────────────────
function BannerFormModal({ initial, nextSortOrder, onClose, onSaved, isDark }) {
  const s = getStyles(isDark);
  const isEdit = Boolean(initial?.id);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [ctaText, setCtaText] = useState(initial?.cta_text ?? "");
  const [ctaLink, setCtaLink] = useState(initial?.cta_link ?? "");
  const [destinationType, setDestinationType] = useState(initial?.destination_type ?? "");
  const [destinationId, setDestinationId] = useState(initial?.destination_id ?? "");
  const [placement, setPlacement] = useState(initial?.placement ?? "hero");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? nextSortOrder);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({}); // { title?: string, placement?: string, image?: string }
  const blobRef = useRef(null);
  const dialogRef = useRef(null);

  const serverImage = initial?.banner_image ? getImageUrl(initial.banner_image) : null;
  const displayImage = previewUrl || serverImage;

  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);

  // Smoothly animate the modal closing before actually unmounting it.
  const requestClose = useCallback(() => {
    if (submitting) return; // never allow closing mid-save
    setClosing(true);
    setTimeout(() => onClose(), 160);
  }, [submitting, onClose]);

  // Escape-to-close (disabled while saving) + basic focus handling.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    // Focus the dialog on mount for keyboard/screen-reader users.
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  const applyFile = (file) => {
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) { toast.error("⚠️ Only JPG, PNG, WebP, GIF allowed"); return; }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { toast.error(`⚠️ Max image size is ${MAX_IMAGE_MB} MB`); return; }
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const url = URL.createObjectURL(file);
    blobRef.current = url;
    setPreviewUrl(url);
    setBannerFile(file);
    setFieldErrors((prev) => ({ ...prev, image: undefined }));
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    applyFile(file);
    // allow re-selecting the same file later
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) applyFile(file);
  };

  const validate = () => {
    const errors = {};
    if (!isEdit && !bannerFile) errors.image = "Please upload a banner image.";
    if (!title.trim()) errors.title = "Banner title is required.";
    if (!placement) errors.placement = "Please select a placement.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      // Keep a toast too, since it's the most visible feedback for the first error.
      toast.error(`⚠️ ${Object.values(errors)[0]}`);
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("subtitle", subtitle.trim());
      fd.append("cta_text", ctaText.trim());
      fd.append("cta_link", ctaLink.trim());
      fd.append("destination_type", destinationType || "");
      fd.append("destination_id", destinationId ? String(destinationId) : "");
      fd.append("placement", placement);
      fd.append("sort_order", String(Number(sortOrder) || 0));
      fd.append("is_active", String(isActive));

      if (bannerFile) {
        const compressed = await compressImage(bannerFile);
        fd.append("banner_image", compressed);
      }

      if (isEdit) {
        await api.patch(`/banners/admin/${initial.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Banner updated successfully.");
      } else {
        await api.post("/banners/admin", fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Banner created successfully.");
      }
      onSaved();
      // Form values are only discarded on success — a failed request leaves
      // everything intact below so the user can simply retry.
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Save failed. Please try again."));
      // Intentionally NOT clearing form state here — see Error Recovery.
    } finally {
      setSubmitting(false);
    }
  };

  const errTextStyle = { color: "#ef4444", fontSize: 11, marginTop: 4, minHeight: 14 };

  return (
    <div
      className="bp-overlay-anim"
      style={{ position: "fixed", inset: 0, background: s.modalOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit Banner" : "New Banner"}
        className="banner-form-modal bp-modal-anim"
        style={{
          width: "100%", maxWidth: 600, background: s.surfaceAlt, borderRadius: 14, border: `1px solid ${s.border}`,
          display: "flex", flexDirection: "column", maxHeight: "94vh", overflow: "hidden",
          animation: closing ? "bp-modal-out .16s ease forwards" : undefined,
          outline: "none",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 0" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.textPrimary }}>{isEdit ? "Edit Banner" : "New Banner"}</h2>
          <button
            onClick={requestClose}
            disabled={submitting}
            aria-label="Close"
            className="bp-icon-btn"
            style={{ background: "none", border: "none", color: s.textLabel, cursor: submitting ? "not-allowed" : "pointer", padding: 4, borderRadius: 6 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Large image upload */}
          <div>
            <label
              className={`bp-upload-zone${isDragging ? " bp-drag-active" : ""}`}
              style={{ display: "block", width: "100%", height: 200, border: `2px dashed ${fieldErrors.image ? "#ef4444" : displayImage ? s.border : "#3b82f6"}`, borderRadius: 12, cursor: "pointer", overflow: "hidden", background: s.inputBg, position: "relative" }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} aria-label="Upload banner image" />
              {displayImage ? (
                <>
                  <img src={displayImage} alt="Banner preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="bp-upload-hover-layer" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "rgba(0,0,0,.55)", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 13, fontWeight: 600 }}>
                      {isDragging ? "Drop to replace" : "Click or drag to replace"}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                  <ImagePlus size={48} color={isDark ? "#374151" : "#9ca3af"} />
                  <span style={{ color: s.textMuted, fontSize: 13, fontWeight: 600 }}>{isDragging ? "Drop image to upload" : "Click or drag to upload banner image"}</span>
                  <span style={{ color: s.textMuted, fontSize: 11 }}>JPG, PNG, WebP, GIF · Max {MAX_IMAGE_MB} MB</span>
                </div>
              )}
            </label>
            <div style={errTextStyle}>{fieldErrors.image}</div>
          </div>

          {/* Fields */}
          <div>
            <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>Banner Title *</label>
            <input
              className={`bp-input${fieldErrors.title ? " bp-input-error" : ""}`}
              placeholder="e.g. Summer Sale — 50% Off Everything"
              value={title}
              onChange={e => { setTitle(e.target.value); if (fieldErrors.title) setFieldErrors(p => ({ ...p, title: undefined })); }}
              style={s.inputStyle}
              maxLength={120}
              aria-invalid={!!fieldErrors.title}
              aria-describedby="banner-title-error"
            />
            <div id="banner-title-error" style={errTextStyle}>{fieldErrors.title}</div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>Subtitle</label>
            <input className="bp-input" placeholder="Short supporting text (optional)" value={subtitle} onChange={e => setSubtitle(e.target.value)} style={s.inputStyle} maxLength={200} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>CTA Button Text</label>
              <input className="bp-input" placeholder="Shop Now" value={ctaText} onChange={e => setCtaText(e.target.value)} style={s.inputStyle} maxLength={40} />
            </div>
            <div>
              <RoutePicker
                label="CTA Link"
                value={ctaLink}
                onChange={(route, opt) => {
                  setCtaLink(route);
                  if (opt) {
                    if (opt.type === "custom-product" || opt.type === "custom") {
                      setDestinationType("");
                      setDestinationId("");
                    } else {
                      setDestinationType(opt.type);
                      setDestinationId(opt.id);
                    }
                  } else {
                    setDestinationType("");
                    setDestinationId("");
                  }
                }}
                isDark={isDark}
                placeholder="Search category or homepage..."
              />
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px", background: s.inputBg, borderRadius: 8, border: `1px solid ${s.borderInput}` }}>
            <div
              role="switch"
              aria-checked={isActive}
              aria-label="Toggle banner active status"
              tabIndex={0}
              className="bp-toggle bp-toggle-wrap"
              onClick={() => setIsActive(v => !v)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsActive(v => !v); } }}
              style={{ width: 40, height: 22, borderRadius: 11, background: isActive ? "#16a34a" : (isDark ? "#374151" : "#d1d5db"), position: "relative", cursor: "pointer", flexShrink: 0 }}
            >
              <div className="bp-toggle-dot" style={{ position: "absolute", top: 3, left: isActive ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff" }} />
            </div>
            <div>
              <div style={{ color: s.textSecondary, fontSize: 14, fontWeight: 600 }}>Active</div>
              <div style={{ color: s.textMuted, fontSize: 12 }}>Banner will {isActive ? "show" : "not show"} on the storefront</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="banner-form-footer" style={{ display: "flex", gap: 10, padding: "0 20px 16px", marginTop: 10 }}>
          <button
            onClick={submit}
            disabled={submitting}
            className="bp-btn"
            style={{ ...btn.base, flex: 1, background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {submitting && <Spinner size={14} />}
            {submitting ? "Saving…" : isEdit ? "✅ Save Changes" : "🎉 Create Banner"}
          </button>
          <button onClick={requestClose} disabled={submitting} className="bp-btn" style={{ ...btn.base, flex: 1, background: isDark ? "#374151" : "#e5e7eb", color: s.textPrimary }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ───────────────────────────────────────────────────────────
export function BannerPreviewModal({ banner, onClose, isDark, type = "banner", resolvedImageUrl }) {
  const s = getStyles(isDark);
  const imgUrl = resolvedImageUrl || getImageUrl(banner.banner_image);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="bp-overlay-anim"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001, padding: 20 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Banner preview"
    >
      <div className="bp-modal-anim" style={{ maxWidth: 900, width: "100%", background: isDark ? "#0f172a" : "#ffffff", borderRadius: 12, overflow: "hidden", border: `1px solid ${s.border}`, maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ overflowY: "auto" }}>
          {imgUrl ? (
            type === "offer" ? (
              <div style={{ position: "relative" }}>
                <img src={imgUrl} alt={banner.title || "Preview"} style={{ width: "100%", display: "block", maxHeight: 500, objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 32px 32px", background: "linear-gradient(transparent, rgba(0,0,0,.8))" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                    {banner.percentage && (
                      <span style={{ background: "#ef4444", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 13, fontWeight: 800 }}>
                        {banner.percentage}% OFF
                      </span>
                    )}
                    {banner.status && (
                      <span style={{ background: banner.status === "published" ? "#16a34a" : "#d97706", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                        {banner.status}
                      </span>
                    )}
                  </div>
                  <h2 style={{ margin: 0, color: "#fff", fontSize: 28, fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,.5)" }}>{banner.title}</h2>
                  {banner.description && <p style={{ margin: "8px 0 0", color: "#e2e8f0", fontSize: 15, textShadow: "0 1px 4px rgba(0,0,0,.5)" }}>{banner.description}</p>}
                </div>
              </div>
            ) : (
              <BannerRenderer banner={banner} imageUrl={imgUrl} />
            )
          ) : (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: s.textMuted }}>No image uploaded</div>
          )}
        </div>
        <div style={{ padding: "16px 24px", display: "flex", gap: 16, color: s.textLabel, fontSize: 13, flexWrap: "wrap" }}>
          {type === "offer" ? (
            <>
              {banner.start_date && (
                <span>Starts: <strong style={{ color: s.textPrimary }}>{banner.start_date} {banner.start_time || ""}</strong></span>
              )}
              {banner.end_date && (
                <span>Ends: <strong style={{ color: s.textPrimary }}>{banner.end_date} {banner.end_time || ""}</strong></span>
              )}
            </>
          ) : (
            <>
              <span>Placement: <strong style={{ color: s.textPrimary }}>{PLACEMENTS.find(p => p.value === banner.placement)?.label ?? banner.placement}</strong></span>
              <span>Sort order: <strong style={{ color: s.textPrimary }}>#{banner.sort_order}</strong></span>
            </>
          )}
          <span style={{ marginLeft: "auto" }}>
            <button onClick={onClose} className="bp-btn" style={{ ...btn.base, padding: "0 16px", background: isDark ? "#374151" : "#e5e7eb", color: s.textPrimary }}>Close Preview</button>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Banner Card ─────────────────────────────────────────────────────────────
function BannerCard({ banner, onEdit, onDelete, onToggle, onPreview, isDark }) {
  const s = getStyles(isDark);
  const imgUrl = getImageUrl(banner.banner_image);
  const [imgErr, setImgErr] = useState(false);
  const [toggling, setToggling] = useState(false);
  const placementLabel = PLACEMENTS.find(p => p.value === banner.placement)?.label ?? banner.placement;

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await onToggle(banner.id);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bp-card bp-fade-in" style={{ background: s.surface, border: `1px solid ${banner.is_active ? (isDark ? "#1e3a5f" : "#bfdbfe") : s.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Status indicator line */}
      <div style={{ height: 3, background: banner.is_active ? "#16a34a" : "#475569" }} />

      {/* Image */}
      <div style={{ height: 170, background: s.cardBg, overflow: "hidden", position: "relative" }}>
        {imgUrl && !imgErr ? (
          <img src={imgUrl} alt={banner.title} onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <ImagePlus size={32} color={isDark ? "#334155" : "#cbd5e1"} />
            <span style={{ color: s.textMuted, fontSize: 12 }}>No image</span>
          </div>
        )}
        {/* Preview button overlay */}
        {imgUrl && !imgErr && (
          <button onClick={() => onPreview(banner)} aria-label={`Preview ${banner.title}`} className="bp-icon-btn" style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.6)", border: "none", borderRadius: 6, padding: "5px 10px", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <Eye size={12} /> Preview
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <h3 style={{ margin: 0, color: s.textSecondary, fontSize: 15, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>{banner.title}</h3>
          <span style={{ flexShrink: 0, background: banner.is_active ? "rgba(22,163,74,.15)" : "rgba(71,85,105,.2)", color: banner.is_active ? "#22c55e" : s.textMuted, border: `1px solid ${banner.is_active ? "#22c55e" : (isDark ? "#475569" : "#cbd5e1")}`, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
            {banner.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        {banner.subtitle && <p style={{ margin: 0, color: s.textMuted, fontSize: 12, lineHeight: 1.4, WebkitLineClamp: 1, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>{banner.subtitle}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ background: "#1d4ed833", color: "#60a5fa", border: "1px solid #1d4ed8", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>{placementLabel}</span>
          <span style={{ background: isDark ? "#374151" : "#e5e7eb", color: s.textLabel, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>#{banner.sort_order}</span>
          {banner.cta_text && <span style={{ background: "#7c3aed33", color: "#a78bfa", border: "1px solid #7c3aed", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>{banner.cta_text}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="banner-card-actions" style={{ display: "flex", gap: 6, padding: "0 14px 14px", justifyContent: "flex-end" }}>
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-label={banner.is_active ? "Deactivate banner" : "Activate banner"}
          title={banner.is_active ? "Deactivate" : "Activate"}
          className="bp-btn"
          style={{ ...btn.base, minWidth: 36, padding: "0 10px", background: banner.is_active ? "#78350f" : "#14532d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {toggling ? <Spinner size={13} /> : banner.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={() => onEdit(banner)} aria-label="Edit banner" title="Edit" className="bp-btn" style={{ ...btn.base, minWidth: 36, padding: "0 10px", background: "#1d4ed8", color: "#fff" }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(banner.id)} aria-label="Delete banner" title="Delete" className="bp-btn" style={{ ...btn.base, padding: "0 12px", background: "#dc2626", color: "#fff", fontSize: 12 }}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function BannerPage() {
  const { isDark } = useTheme();
  const { limits, isLoading: limitsLoading, error: limitsError, refetch: refetchLimits } = useBusinessLimits();
  const s = getStyles(isDark);

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlacement, setFilterPlacement] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modal, setModal] = useState(null);     // null | { banner?: Banner }
  const [preview, setPreview] = useState(null); // banner to preview
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);

  // ── Network state feedback (offline / back online) ──────────────────────
  useEffect(() => {
    const handleOffline = () => { setIsOffline(true); toast.error("You're offline. Changes won't save until you're back online."); };
    const handleOnline = () => { setIsOffline(false); toast.success("Back online."); };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/banners/admin/all");
      setBanners(res.data);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Failed to load banners"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const filtered = banners
    .filter(b => b.title?.toLowerCase().includes(search.toLowerCase()))
    .filter(b => filterPlacement === "all" || b.placement === filterPlacement)
    .filter(b => filterStatus === "all" || (filterStatus === "active" ? b.is_active : !b.is_active))
    .sort((a, b) => a.sort_order - b.sort_order || b.id - a.id);

  const toggleBanner = async (id) => {
    try {
      await api.put(`/banners/admin/${id}/toggle`);
      toast.success("Banner status updated successfully.");
      refresh();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Failed to update banner status"));
    }
  };

  const deleteBanner = async (id) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/banners/admin/${id}`);
      toast.success("Banner deleted successfully.");
      setDeleteConfirm(null);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Failed to delete banner"));
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: banners.length,
    active: banners.filter(b => b.is_active).length,
    inactive: banners.filter(b => !b.is_active).length,
  };

  // FIXED: previously missing closing brace on the max-limit `if` block meant
  // this ran through to `setModal({})` unconditionally, opening the create
  // modal even after the limit toast fired. Now correctly short-circuits.
  const handleNewBannerClick = () => {
    if (!limits) {
      toast.error("⚠️ Store limits are not loaded yet. Please wait.");
      return;
    }
    if (banners.length >= limits.max_banners) {
      toast.error(
        <div>
          <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
          <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
            You have reached the maximum allowed limit of {limits.max_banners} banners.{"\n"}Please delete an existing banner before creating a new one.
          </div>
        </div>
      );
      return;
    }
    setModal({});
  };

  const nextSortOrder = banners.length > 0
    ? Math.max(...banners.map(b => Number(b.sort_order) || 0)) + 1
    : 1;

  const newBannerDisabled = limitsLoading || !!limitsError || (limits && banners.length >= limits.max_banners);

  return (
    <div className="banner-page-root" style={{ padding: "24px 28px", background: s.bg, minHeight: "100vh", transition: "background .3s ease" }}>
      <GlobalStyles />

      {isOffline && (
        <div className="bp-fade-in" style={{
          display: "flex", alignItems: "center", gap: 8,
          background: isDark ? "rgba(234,179,8,.12)" : "#fef3c7",
          border: `1px solid ${isDark ? "rgba(234,179,8,.3)" : "#fde68a"}`,
          borderRadius: 8, padding: "10px 16px", marginBottom: 16,
          color: isDark ? "#facc15" : "#92400e", fontSize: 13,
        }}>
          <WifiOff size={16} />
          <span>You're currently offline. Changes will fail to save until your connection is restored.</span>
        </div>
      )}

      {limitsError && (
        <div className="bp-fade-in" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: isDark ? "rgba(239, 68, 68, 0.1)" : "#fee2e2",
          border: `1px solid ${isDark ? "rgba(239, 68, 68, 0.2)" : "#fca5a5"}`,
          borderRadius: 8, padding: "12px 16px", marginBottom: 20,
          color: isDark ? "#ef4444" : "#b91c1c", fontSize: 13, flexWrap: "wrap", gap: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} />
            <span>Unable to load store configuration. Please refresh the page or try again.</span>
          </div>
          <button
            onClick={() => refetchLimits()}
            className="bp-btn"
            style={{
              background: "#ef4444",
              color: "#fff", border: "none", borderRadius: 4,
              padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Page header */}
      <div className="banner-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: s.textPrimary, letterSpacing: "-0.5px" }}>Banner Management</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: s.textMuted }}>
            Hero sliders, promotional banners & marketing campaigns
          </p>
        </div>
        <button
          onClick={handleNewBannerClick}
          disabled={newBannerDisabled}
          title={limitsLoading ? "Loading store configuration..." : limitsError ? "Unable to load configuration" : (limits && banners.length >= limits.max_banners) ? "Maximum limit reached.\nDelete an existing item to continue." : ""}
          className="bp-btn"
          style={{ ...btn.base, height: 40, padding: "0 18px", background: (limits && banners.length >= limits.max_banners) ? "#4b5563" : "#2563eb", color: "#fff", display: "flex", alignItems: "center", gap: 6 }}
        >
          {limitsLoading ? <Spinner size={16} /> : <Plus size={16} />}
          New Banner
        </button>
      </div>

      {/* ── Stat chips */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total", value: stats.total, color: "#3b82f6" },
          { label: "Active", value: stats.active, color: "#22c55e" },
          { label: "Inactive", value: stats.inactive, color: s.textMuted },
        ].map(st => (
          <div key={st.label} className="banner-stat-chip" style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 10, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: st.color }}>{st.value}</span>
            <span style={{ fontSize: 13, color: s.textLabel, fontWeight: 600 }}>{st.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        <div className="banner-filter-search" style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: s.textMuted, pointerEvents: "none" }} />
          <input
            type="text" placeholder="Search banners…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="bp-input"
            style={{ ...s.inputStyle, width: 220, paddingLeft: 32, paddingRight: search ? 32 : 12, height: 38 }}
            aria-label="Search banners"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="bp-icon-btn"
              style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: s.textMuted, borderRadius: 6 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select className="banner-filter-select bp-input" value={filterPlacement} onChange={e => setFilterPlacement(e.target.value)} style={{ ...s.inputStyle, width: 180, cursor: "pointer", height: 38 }} aria-label="Filter by placement">
          <option value="all">All Placements</option>
          {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select className="banner-filter-select bp-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...s.inputStyle, width: 150, cursor: "pointer", height: 38 }} aria-label="Filter by status">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Loading skeleton */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="bp-skeleton" style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, height: 320 }} />
          ))}
        </div>
      )}

      {/* ── Grid */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
          {filtered.map(banner => (
            <BannerCard
              key={banner.id} banner={banner} isDark={isDark}
              onEdit={b => setModal({ banner: b })}
              onDelete={id => setDeleteConfirm(id)}
              onToggle={toggleBanner}
              onPreview={setPreview}
            />
          ))}
        </div>
      )}

      {/* ── Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bp-fade-in" style={{ minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, border: `1px dashed ${s.border}`, borderRadius: 14, background: s.surface, padding: "32px 16px" }}>
          <div style={{ width: 64, height: 64, background: "#7c3aed", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImagePlus size={28} color="#fff" />
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ margin: "0 0 6px", color: s.textPrimary, fontWeight: 700 }}>
              {search || filterPlacement !== "all" || filterStatus !== "all" ? "No banners match your filters" : "No banners yet"}
            </h2>
            <p style={{ margin: 0, color: s.textMuted, fontSize: 14 }}>
              {search ? "Try a different keyword." : "Create your first homepage banner."}
            </p>
          </div>
          {!search && filterPlacement === "all" && filterStatus === "all" && (
            <button
              onClick={handleNewBannerClick}
              disabled={!limits || banners.length >= limits.max_banners}
              title={!limits ? "Loading store configuration..." : banners.length >= limits.max_banners ? "Maximum limit reached.\nDelete an existing item to continue." : ""}
              className="bp-btn"
              style={{
                ...btn.base,
                height: 40,
                padding: "0 20px",
                background: (!limits || banners.length >= limits.max_banners) ? "#4b5563" : "#2563eb",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={16} /> New Banner
            </button>
          )}
        </div>
      )}

      {/* ── Form modal */}
      {modal !== null && (
        <BannerFormModal
          initial={modal?.banner ?? null}
          nextSortOrder={nextSortOrder}
          onClose={() => setModal(null)}
          onSaved={refresh}
          isDark={isDark}
        />
      )}

      {/* ── Preview modal */}
      {preview && <BannerPreviewModal banner={preview} onClose={() => setPreview(null)} isDark={isDark} />}

      {/* ── Delete confirm */}
      {deleteConfirm !== null && (
        <div
          className="bp-overlay-anim"
          style={{ position: "fixed", inset: 0, background: s.modalOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 16 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteConfirm(null); }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Delete banner confirmation"
            className="banner-delete-modal bp-modal-anim"
            style={{ background: s.surfaceAlt, border: `1px solid ${s.border}`, borderRadius: 12, padding: 28, width: 360, maxWidth: "100%", textAlign: "center" }}
          >
            <div style={{ width: 52, height: 52, background: "rgba(239,68,68,.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <X size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: "0 0 8px", color: s.textPrimary, fontWeight: 700 }}>Delete Banner?</h3>
            <p style={{ margin: "0 0 20px", color: s.textLabel, fontSize: 14 }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="bp-btn" style={{ ...btn.base, flex: 1, background: isDark ? "#374151" : "#e5e7eb", color: s.textPrimary }}>Cancel</button>
              <button
                onClick={() => deleteBanner(deleteConfirm)}
                disabled={deleting}
                className="bp-btn"
                style={{ ...btn.base, flex: 1, background: "#dc2626", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {deleting && <Spinner size={13} />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}