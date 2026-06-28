import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/shared/services/api";
import { ImagePlus, Plus, Search, X, Pencil, Eye, EyeOff } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "@/shared/hooks/useAuth";

// ─── Image helper (no localhost dependency) ─────────────────────────────────
const _BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("blob:") || path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${_BACKEND_ORIGIN}${path}`;
  return `${_BACKEND_ORIGIN}/uploads/banners/${path}`;
}

// ─── Placement options ───────────────────────────────────────────────────────
const PLACEMENTS = [
  { value: "hero", label: "Hero Slider" },
  { value: "homepage_mid", label: "Homepage Mid" },
  { value: "category", label: "Category Banner" },
  { value: "sidebar", label: "Sidebar" },
  { value: "popup", label: "Popup Banner" },
];

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
  base: { height: 38, border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13, transition: "opacity .15s" },
};

// ─── Banner Form Modal ───────────────────────────────────────────────────────
function BannerFormModal({ initial, onClose, onSaved, isDark }) {
  const s = getStyles(isDark);
  const isEdit = Boolean(initial?.id);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [ctaText, setCtaText] = useState(initial?.cta_text ?? "");
  const [ctaLink, setCtaLink] = useState(initial?.cta_link ?? "");
  const [placement, setPlacement] = useState(initial?.placement ?? "hero");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const blobRef = useRef(null);

  const serverImage = initial?.banner_image ? getImageUrl(initial.banner_image) : null;
  const displayImage = previewUrl || serverImage;

  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { toast.error("⚠️ Only JPG, PNG, WebP, GIF allowed"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("⚠️ Max image size is 10 MB"); return; }
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const url = URL.createObjectURL(file);
    blobRef.current = url;
    setPreviewUrl(url);
    setBannerFile(file);
  };

  const validate = () => {
    if (!isEdit && !bannerFile) { toast.error("⚠️ Please upload a banner image!"); return false; }
    if (!title.trim()) { toast.error("⚠️ Banner title is required!"); return false; }
    if (!placement) { toast.error("⚠️ Please select a placement!"); return false; }
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
      fd.append("placement", placement);
      fd.append("sort_order", String(Number(sortOrder) || 0));
      fd.append("is_active", String(isActive));
      if (bannerFile) fd.append("banner_image", bannerFile);

      if (isEdit) {
        await api.patch(`/banners/admin/${initial.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Banner updated successfully.");
      } else {
        await api.post("/banners/admin", fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Banner created successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("❌ " + (err?.response?.data?.detail ?? "Operation failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: s.modalOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 600, background: s.surfaceAlt, borderRadius: 14, border: `1px solid ${s.border}`, display: "flex", flexDirection: "column", maxHeight: "94vh", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 22px 0" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.textPrimary }}>{isEdit ? "Edit Banner" : "New Banner"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: s.textLabel, cursor: "pointer" }}><X size={20} /></button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Large image upload */}
          <label style={{ display: "block", width: "100%", height: 200, border: `2px dashed ${displayImage ? s.border : "#3b82f6"}`, borderRadius: 12, cursor: "pointer", overflow: "hidden", background: s.inputBg, position: "relative" }}>
            <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} />
            {displayImage ? (
              <>
                <img src={displayImage} alt="Banner preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", transition: "background .2s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ background: "rgba(0,0,0,.55)", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 13, fontWeight: 600 }}>Click to replace</div>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                <ImagePlus size={48} color={isDark ? "#374151" : "#9ca3af"} />
                <span style={{ color: s.textMuted, fontSize: 13, fontWeight: 600 }}>Click to upload banner image</span>
                <span style={{ color: s.textMuted, fontSize: 11 }}>JPG, PNG, WebP, GIF · Max 10 MB</span>
              </div>
            )}
          </label>

          {/* Thumbnail strip (preview only) */}
          {displayImage && (
            <div style={{ display: "flex", gap: 8 }}>
              {[0.3, 0.5, 0.7, 1].map((op, i) => (
                <div key={i} style={{ width: 60, height: 44, borderRadius: 6, overflow: "hidden", border: `1px solid ${s.border}`, opacity: op, flex: "0 0 auto" }}>
                  <img src={displayImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
              <div style={{ color: s.textMuted, fontSize: 11, display: "flex", alignItems: "center", paddingLeft: 4 }}>Preview at different sizes</div>
            </div>
          )}

          {/* Fields */}
          <div>
            <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>Banner Title *</label>
            <input placeholder="e.g. Summer Sale — 50% Off Everything" value={title} onChange={e => setTitle(e.target.value)} style={s.inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>Subtitle</label>
            <input placeholder="Short supporting text (optional)" value={subtitle} onChange={e => setSubtitle(e.target.value)} style={s.inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>CTA Button Text</label>
              <input placeholder="Shop Now" value={ctaText} onChange={e => setCtaText(e.target.value)} style={s.inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>CTA Link</label>
              <input placeholder="/collections/summer" value={ctaLink} onChange={e => setCtaLink(e.target.value)} style={s.inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>Placement *</label>
              <select value={placement} onChange={e => setPlacement(e.target.value)} style={{ ...s.inputStyle, cursor: "pointer" }}>
                {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>Sort Order</label>
              <input type="number" min="0" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={s.inputStyle} placeholder="0" />
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: s.inputBg, borderRadius: 8, border: `1px solid ${s.borderInput}` }}>
            <div
              onClick={() => setIsActive(v => !v)}
              style={{ width: 40, height: 22, borderRadius: 11, background: isActive ? "#16a34a" : (isDark ? "#374151" : "#d1d5db"), position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}
            >
              <div style={{ position: "absolute", top: 3, left: isActive ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
            </div>
            <div>
              <div style={{ color: s.textSecondary, fontSize: 14, fontWeight: 600 }}>Active</div>
              <div style={{ color: s.textMuted, fontSize: 12 }}>Banner will {isActive ? "show" : "not show"} on the storefront</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, padding: "0 22px 22px" }}>
          <button onClick={submit} disabled={submitting} style={{ ...btn.base, flex: 2, background: "#2563eb", color: "#fff", opacity: submitting ? .6 : 1 }}>
            {submitting ? "Saving…" : isEdit ? "✅ Save Changes" : "🎉 Create Banner"}
          </button>
          <button onClick={onClose} disabled={submitting} style={{ ...btn.base, flex: 1, background: isDark ? "#374151" : "#e5e7eb", color: s.textPrimary }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ───────────────────────────────────────────────────────────
function BannerPreviewModal({ banner, onClose, isDark }) {
  const s = getStyles(isDark);
  const imgUrl = getImageUrl(banner.banner_image);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001, padding: 20 }} onClick={onClose}>
      <div style={{ maxWidth: 900, width: "100%", background: isDark ? "#0f172a" : "#ffffff", borderRadius: 12, overflow: "hidden", border: `1px solid ${s.border}` }} onClick={e => e.stopPropagation()}>
        {imgUrl ? (
          <div style={{ position: "relative" }}>
            <img src={imgUrl} alt={banner.title} style={{ width: "100%", display: "block", maxHeight: 500, objectFit: "cover" }} />
            {/* Overlay text (simulates storefront) */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 32px 32px", background: "linear-gradient(transparent, rgba(0,0,0,.8))" }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 28, fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,.5)" }}>{banner.title}</h2>
              {banner.subtitle && <p style={{ margin: "6px 0 0", color: "#e2e8f0", fontSize: 16 }}>{banner.subtitle}</p>}
              {banner.cta_text && (
                <div style={{ marginTop: 16, display: "inline-block", padding: "10px 24px", background: "#2563eb", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 14 }}>
                  {banner.cta_text}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: s.textMuted }}>No image uploaded</div>
        )}
        <div style={{ padding: "16px 24px", display: "flex", gap: 16, color: s.textLabel, fontSize: 13 }}>
          <span>Placement: <strong style={{ color: s.textPrimary }}>{PLACEMENTS.find(p => p.value === banner.placement)?.label ?? banner.placement}</strong></span>
          <span>Sort order: <strong style={{ color: s.textPrimary }}>#{banner.sort_order}</strong></span>
          <span style={{ marginLeft: "auto" }}><button onClick={onClose} style={{ ...btn.base, padding: "0 16px", background: isDark ? "#374151" : "#e5e7eb", color: s.textPrimary }}>Close Preview</button></span>
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
  const placementLabel = PLACEMENTS.find(p => p.value === banner.placement)?.label ?? banner.placement;

  return (
    <div style={{ background: s.surface, border: `1px solid ${banner.is_active ? (isDark ? "#1e3a5f" : "#bfdbfe") : s.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Status indicator line */}
      <div style={{ height: 3, background: banner.is_active ? "#16a34a" : "#475569" }} />

      {/* Image */}
      <div style={{ height: 170, background: s.cardBg, overflow: "hidden", position: "relative" }}>
        {imgUrl && !imgErr ? (
          <img src={imgUrl} alt={banner.title} onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <ImagePlus size={32} color={isDark ? "#334155" : "#cbd5e1"} />
            <span style={{ color: s.textMuted, fontSize: 12 }}>No image</span>
          </div>
        )}
        {/* Preview button overlay */}
        {imgUrl && !imgErr && (
          <button onClick={() => onPreview(banner)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.6)", border: "none", borderRadius: 6, padding: "5px 10px", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
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
      <div style={{ display: "flex", gap: 6, padding: "0 14px 14px", justifyContent: "flex-end" }}>
        <button onClick={() => onToggle(banner.id)} title={banner.is_active ? "Deactivate" : "Activate"} style={{ ...btn.base, padding: "0 10px", background: banner.is_active ? "#78350f" : "#14532d", color: "#fff" }}>
          {banner.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={() => onEdit(banner)} title="Edit" style={{ ...btn.base, padding: "0 10px", background: "#1d4ed8", color: "#fff" }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(banner.id)} title="Delete" style={{ ...btn.base, padding: "0 12px", background: "#dc2626", color: "#fff", fontSize: 12 }}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function BannerPage() {
  const { isDark } = useTheme();
  const s = getStyles(isDark);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlacement, setFilterPlacement] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modal, setModal] = useState(null);     // null | { banner?: Banner }
  const [preview, setPreview] = useState(null); // banner to preview
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/banners/admin/all");
      setBanners(res.data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to load banners");
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
      toast.error("❌ Failed to update banner status");
    }
  };

  const deleteBanner = async (id) => {
    try {
      await api.delete(`/banners/admin/${id}`);
      toast.success("Banner deleted successfully.");
      setDeleteConfirm(null);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to delete banner");
    }
  };

  const stats = {
    total: banners.length,
    active: banners.filter(b => b.is_active).length,
    inactive: banners.filter(b => !b.is_active).length,
  };

  const handleNewBannerClick = () => {
    if (banners.length >= 5) {
      toast.error(
        <div>
          <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
          <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
            You have reached the maximum allowed limit of 5 banners.{"\n"}Please delete an existing banner before creating a new one.
          </div>
        </div>
      );
      return;
    }
    setModal({});
  };

  return (
    <div style={{ padding: "24px 28px", background: s.bg, minHeight: "100vh", transition: "background .3s ease" }}>
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover theme={isDark ? "dark" : "light"} style={{ zIndex: 99999 }} />

      {/* ── Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: s.textPrimary, letterSpacing: "-0.5px" }}>Banner Management</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: s.textMuted }}>
            Hero sliders, promotional banners & marketing campaigns
          </p>
        </div>
        <button onClick={handleNewBannerClick} disabled={banners.length >= 5} title={banners.length >= 5 ? "Maximum limit reached.\nDelete an existing item to continue." : ""} style={{ ...btn.base, height: 40, padding: "0 18px", background: banners.length >= 5 ? "#4b5563" : "#2563eb", color: "#fff", display: "flex", alignItems: "center", gap: 6, opacity: banners.length >= 5 ? 0.6 : 1, cursor: banners.length >= 5 ? "not-allowed" : "pointer" }}>
          <Plus size={16} /> New Banner
        </button>
      </div>

      {/* ── Stat chips */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total", value: stats.total, color: "#3b82f6" },
          { label: "Active", value: stats.active, color: "#22c55e" },
          { label: "Inactive", value: stats.inactive, color: s.textMuted },
        ].map(st => (
          <div key={st.label} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 10, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: st.color }}>{st.value}</span>
            <span style={{ fontSize: 13, color: s.textLabel, fontWeight: 600 }}>{st.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: s.textMuted }} />
          <input
            type="text" placeholder="Search banners…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...s.inputStyle, width: 220, paddingLeft: 32, height: 38 }}
          />
        </div>
        <select value={filterPlacement} onChange={e => setFilterPlacement(e.target.value)} style={{ ...s.inputStyle, width: 180, cursor: "pointer", height: 38 }}>
          <option value="all">All Placements</option>
          {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...s.inputStyle, width: 150, cursor: "pointer", height: 38 }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Loading skeleton */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, height: 320, animation: "pulse 1.5s ease-in-out infinite" }} />
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
        <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, border: `1px dashed ${s.border}`, borderRadius: 14, background: s.surface }}>
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
            <button onClick={handleNewBannerClick} disabled={banners.length >= 5} title={banners.length >= 5 ? "Maximum limit reached.\nDelete an existing item to continue." : ""} style={{ ...btn.base, height: 40, padding: "0 20px", background: banners.length >= 5 ? "#4b5563" : "#2563eb", color: "#fff", display: "flex", alignItems: "center", gap: 6, opacity: banners.length >= 5 ? 0.6 : 1, cursor: banners.length >= 5 ? "not-allowed" : "pointer" }}>
              <Plus size={16} /> New Banner
            </button>
          )}
        </div>
      )}

      {/* ── Form modal */}
      {modal !== null && (
        <BannerFormModal
          initial={modal?.banner ?? null}
          onClose={() => setModal(null)}
          onSaved={refresh}
          isDark={isDark}
        />
      )}

      {/* ── Preview modal */}
      {preview && <BannerPreviewModal banner={preview} onClose={() => setPreview(null)} isDark={isDark} />}

      {/* ── Delete confirm */}
      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, background: s.modalOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ background: s.surfaceAlt, border: `1px solid ${s.border}`, borderRadius: 12, padding: 28, width: 360, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, background: "rgba(239,68,68,.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <X size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: "0 0 8px", color: s.textPrimary, fontWeight: 700 }}>Delete Banner?</h3>
            <p style={{ margin: "0 0 20px", color: s.textLabel, fontSize: 14 }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ ...btn.base, flex: 1, background: isDark ? "#374151" : "#e5e7eb", color: s.textPrimary }}>Cancel</button>
              <button onClick={() => deleteBanner(deleteConfirm)} style={{ ...btn.base, flex: 1, background: "#dc2626", color: "#fff" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}