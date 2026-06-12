import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../services/api";
import { Search, Plus, X, ImagePlus, Tag, Calendar, Clock, Pencil } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../../hooks/useAuth";

// ─── Image helper (mirrors productUtils — no localhost dependency) ──────────
const _BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");
function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${_BACKEND_ORIGIN}${path}`;
  return `${_BACKEND_ORIGIN}/uploads/offers/${path}`;
}

// ─── Theme-aware style factories ─────────────────────────────────────────────
function getStyles(isDark) {
  const bg = isDark ? "#111827" : "#f9fafb";
  const surface = isDark ? "#1e293b" : "#ffffff";
  const surfaceAlt = isDark ? "#1f2937" : "#ffffff";
  const border = isDark ? "#334155" : "#e2e8f0";
  const borderInput = isDark ? "#374151" : "#d1d5db";
  const inputBg = isDark ? "#111827" : "#f9fafb";
  const textPrimary = isDark ? "#fff" : "#111827";
  const textSecondary = isDark ? "#f1f5f9" : "#1e293b";
  const textMuted = isDark ? "#64748b" : "#6b7280";
  const textLabel = isDark ? "#94a3b8" : "#6b7280";
  const cardBg = isDark ? "#0f172a" : "#f1f5f9";
  const modalOverlay = isDark ? "rgba(0,0,0,.75)" : "rgba(0,0,0,.5)";

  return {
    inputStyle: {
      width: "100%", height: 38, border: `1px solid ${borderInput}`,
      borderRadius: 6, background: inputBg, color: textPrimary,
      padding: "0 12px", outline: "none", fontSize: 14, boxSizing: "border-box",
    },
    bg, surface, surfaceAlt, border, borderInput, inputBg,
    textPrimary, textSecondary, textMuted, textLabel, cardBg, modalOverlay,
  };
}

// ─── Countdown helper ───────────────────────────────────────────────────────
function useCountdown(expiresAt) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const d = new Date(expiresAt + "Z").getTime() - Date.now();
      setDiff(d);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return diff;
}

// ─── Sub-components ─────────────────────────────────────────────────────────
const badge = {
  green: {
    background: "rgba(34,197,94,.15)", color: "#22c55e",
    border: "1px solid #22c55e", padding: "4px 10px",
    borderRadius: 20, fontSize: 11, fontWeight: 700, display: "inline-block",
  },
  amber: {
    background: "rgba(245,158,11,.15)", color: "#f59e0b",
    border: "1px solid #f59e0b", padding: "4px 10px",
    borderRadius: 20, fontSize: 11, fontWeight: 700, display: "inline-block",
  },
};
const textTokens = {
  warn: { color: "#f59e0b", fontWeight: 700, fontSize: 13 },
  expired: { color: "#ef4444", fontWeight: 700, fontSize: 13 },
  countdown: { color: "#f10b64", fontWeight: 700, fontSize: 13 },
};
const btn = {
  base: {
    height: 38, border: "none", borderRadius: 6, fontWeight: 700,
    cursor: "pointer", fontSize: 14, transition: "opacity .15s",
  },
};

const StatusBadge = ({ status }) =>
  status === "published" ? (
    <span style={badge.green}>● Published</span>
  ) : (
    <span style={badge.amber}>● Draft</span>
  );

const CountdownDisplay = ({ expiresAt }) => {
  const diff = useCountdown(expiresAt);
  if (!expiresAt) return <div style={textTokens.warn}>⚠️ Expiry time missing</div>;
  if (diff <= 0) return <div style={textTokens.expired}>⛔ Expired</div>;
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return (
    <div style={textTokens.countdown}>
      ⏰ Ends in: {days}d {hrs}h {mins}m
    </div>
  );
};

// ─── Offer Form Modal ────────────────────────────────────────────────────────
function OfferFormModal({ initial, onClose, onSaved, isDark }) {
  const s = getStyles(isDark);
  const isEdit = Boolean(initial?.id);
  const [preview, setPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [offerName, setOfferName] = useState(initial?.title ?? "");
  const [percentage, setPercentage] = useState(initial?.percentage ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [startTime, setStartTime] = useState(initial?.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(initial?.end_time?.slice(0, 5) ?? "");
  const [submitting, setSubmitting] = useState(false);
  const previewRef = useRef(null);

  const serverImage = initial?.banner_image ? getImageUrl(initial.banner_image) : null;
  const displayImage = preview || serverImage;

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setBannerFile(file);
  };

  const validate = () => {
    if (!isEdit && !bannerFile) { toast.error("⚠️ Please upload a banner image!"); return false; }
    if (!offerName.trim()) { toast.error("⚠️ Offer name is required!"); return false; }
    if (!/^\d+$/.test(percentage.trim())) { toast.error("⚠️ Percentage must be a number!"); return false; }
    const pct = Number(percentage);
    if (pct < 1 || pct > 100) { toast.error("⚠️ Percentage must be between 1 – 100!"); return false; }
    if (!startDate || !startTime || !endDate || !endTime) { toast.error("⚠️ All date/time fields are required!"); return false; }
    if (new Date(`${endDate}T${endTime}`) <= new Date(`${startDate}T${startTime}`)) {
      toast.error("⚠️ End must be after start!"); return false;
    }
    return true;
  };

  const submit = async (status) => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", offerName.trim());
      fd.append("percentage", percentage.trim());
      fd.append("description", description.trim());
      fd.append("start_date", startDate);
      fd.append("end_date", endDate);
      fd.append("start_time", startTime);
      fd.append("end_time", endTime);
      fd.append("status", status);
      if (bannerFile) fd.append("banner_image", bannerFile);

      if (isEdit) {
        await api.patch(`/offers/${initial.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success(status === "published" ? "🚀 Offer published!" : "💾 Offer saved!");
      } else {
        await api.post("/offers/", fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success(status === "published" ? "🚀 Offer published!" : "💾 Offer saved!");
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
      <div style={{ width: "100%", maxWidth: 560, background: s.surfaceAlt, borderRadius: 14, border: `1px solid ${s.border}`, display: "flex", flexDirection: "column", maxHeight: "92vh", overflow: "hidden" }}>
        {/* Modal header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 0" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.textPrimary }}>{isEdit ? "Edit Offer" : "New Offer"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: s.textLabel, cursor: "pointer", padding: 4 }}><X size={20} /></button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Banner upload */}
          <label style={{ display: "block", width: "100%", height: 160, border: "2px dashed #3b82f6", borderRadius: 10, cursor: "pointer", overflow: "hidden", background: s.inputBg, position: "relative" }}>
            <input type="file" hidden accept="image/*" onChange={handleFile} />
            {displayImage ? (
              <img src={displayImage} alt="Banner preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                <ImagePlus size={40} color={isDark ? "#4b5563" : "#9ca3af"} />
                <span style={{ color: s.textMuted, fontSize: 13 }}>Click to upload banner image</span>
              </div>
            )}
            {displayImage && (
              <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,.6)", borderRadius: 6, padding: "4px 10px", color: "#fff", fontSize: 12, fontWeight: 600 }}>Change</div>
            )}
          </label>

          {/* Fields */}
          <input placeholder="Offer Name *" value={offerName} onChange={e => setOfferName(e.target.value)} style={s.inputStyle} />
          <input placeholder="Discount Percentage (1–100) *" value={percentage} onChange={e => setPercentage(e.target.value)} style={s.inputStyle} type="number" min="1" max="100" />
          <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...s.inputStyle, height: "auto", padding: "10px 12px", resize: "none" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>Start Date *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={s.inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>Start Time *</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={s.inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>End Date *</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={s.inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: s.textLabel, display: "block", marginBottom: 4 }}>End Time *</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={s.inputStyle} />
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ display: "flex", gap: 8, padding: "0 20px 20px" }}>
          <button onClick={() => submit("saved")} disabled={submitting} style={{ ...btn.base, flex: 1, background: "#16a34a", color: "#fff", opacity: submitting ? .6 : 1 }}>
            {submitting ? "Saving…" : "💾 Save Draft"}
          </button>
          <button onClick={() => submit("published")} disabled={submitting} style={{ ...btn.base, flex: 1, background: "#2563eb", color: "#fff", opacity: submitting ? .6 : 1 }}>
            {submitting ? "Publishing…" : "🚀 Publish"}
          </button>
          <button onClick={onClose} disabled={submitting} style={{ ...btn.base, flex: 1, background: isDark ? "#374151" : "#e5e7eb", color: s.textPrimary }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Offer Card ──────────────────────────────────────────────────────────────
function OfferCard({ offer, onPublish, onDelete, onEdit, isDark }) {
  const s = getStyles(isDark);
  const imgUrl = getImageUrl(offer.banner_image);
  const [imgErr, setImgErr] = useState(false);
  const isPublished = offer.status === "published";

  return (
    <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Banner image */}
      <div style={{ height: 180, background: s.cardBg, overflow: "hidden", position: "relative" }}>
        {imgUrl && !imgErr ? (
          <img src={imgUrl} alt={offer.title} onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <ImagePlus size={32} color={isDark ? "#334155" : "#cbd5e1"} />
            <span style={{ color: isDark ? "#475569" : "#94a3b8", fontSize: 12 }}>No image</span>
          </div>
        )}
        <div style={{ position: "absolute", top: 10, left: 10 }}><StatusBadge status={offer.status} /></div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 15px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <h3 style={{ margin: 0, color: s.textSecondary, fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{offer.title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Tag size={14} color="#fbbf24" />
          <span style={{ color: "#fce307", fontWeight: 800, fontSize: 18 }}>{offer.percentage}%</span>
          <span style={{ color: s.textLabel, fontSize: 12, fontWeight: 600 }}>discount</span>
        </div>
        {offer.description && <p style={{ margin: 0, color: s.textLabel, fontSize: 13, lineHeight: 1.5, WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>{offer.description}</p>}

        {/* Dates / countdown */}
        <div style={{ marginTop: "auto", paddingTop: 8 }}>
          {isPublished ? (
            <CountdownDisplay expiresAt={offer.expires_at} />
          ) : (
            <div style={{ color: "#07fc96", fontSize: 12, fontWeight: 600, lineHeight: 1.8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {offer.start_date} {offer.start_time?.slice(0, 5)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {offer.end_date} {offer.end_time?.slice(0, 5)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, padding: "0 15px 15px", justifyContent: "flex-end" }}>
        <button onClick={() => onEdit(offer)} style={{ ...btn.base, padding: "0 10px", background: "#1d4ed8", color: "#fff", fontSize: 12 }}>
          <Pencil size={12} />
        </button>
        {!isPublished && (
          <button onClick={() => onPublish(offer.id)} style={{ ...btn.base, padding: "0 12px", background: "#2563eb", color: "#fff", fontSize: 12 }}>
            Publish
          </button>
        )}
        <button onClick={() => onDelete(offer.id)} style={{ ...btn.base, padding: "0 12px", background: "#dc2626", color: "#fff", fontSize: 12 }}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function OffersPage() {
  const { isDark } = useTheme();
  const s = getStyles(isDark);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);   // null | { offer?: Offer }
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Network listener
  useEffect(() => {
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  const fetchOffers = useCallback(async () => {
    try {
      const res = await api.get("/offers/");
      setOffers(res.data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const filteredOffers = offers
    .filter(o => o.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.status === "published" && b.status === "published")
        return new Date(a.expires_at) - new Date(b.expires_at);
      if (a.status === "published") return -1;
      if (b.status === "published") return 1;
      return b.id - a.id;
    });

  const publishOffer = async (id) => {
    if (!isOnline) { toast.error("📡 No internet connection!"); return; }
    try {
      await api.put(`/offers/${id}`, { status: "published" });
      toast.success("🚀 Offer published!");
      fetchOffers();
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to publish offer");
    }
  };

  const deleteOffer = async (id) => {
    try {
      await api.delete(`/offers/${id}`);
      toast.success("🗑️ Offer deleted!");
      setDeleteConfirm(null);
      fetchOffers();
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to delete offer");
    }
  };

  return (
    <div style={{ padding: "24px 28px", background: s.bg, minHeight: "100vh", transition: "background .3s ease" }}>
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover theme={isDark ? "dark" : "light"} style={{ zIndex: 99999 }} />

      {/* ── Offline banner */}
      {!isOnline && (
        <div style={{ background: "#7f1d1d", color: "#fca5a5", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 14, fontWeight: 600 }}>
          📡 You are offline. Changes may not save.
        </div>
      )}

      {/* ── Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: s.textPrimary, letterSpacing: "-0.5px" }}>Offers & Promo</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: s.textMuted }}>
            {offers.length} offer{offers.length !== 1 ? "s" : ""} total · {offers.filter(o => o.status === "published").length} active
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: s.textMuted }} />
            <input
              type="text" placeholder="Search offers…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...s.inputStyle, width: 240, paddingLeft: 36, height: 40 }}
            />
          </div>
          <button onClick={() => setModal({})} style={{ ...btn.base, height: 40, padding: "0 18px", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> Add Offer
          </button>
        </div>
      </div>

      {/* ── Loading skeleton */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, height: 380, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {/* ── Grid */}
      {!loading && filteredOffers.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
          {filteredOffers.map(offer => (
            <OfferCard
              key={offer.id} offer={offer} isDark={isDark}
              onPublish={publishOffer}
              onDelete={id => setDeleteConfirm(id)}
              onEdit={offer => setModal({ offer })}
            />
          ))}
        </div>
      )}

      {/* ── Empty state */}
      {!loading && filteredOffers.length === 0 && (
        <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, border: `1px dashed ${s.border}`, borderRadius: 14, background: s.surface }}>
          <div style={{ width: 64, height: 64, background: "#1d4ed8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Tag size={28} color="#fff" />
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ margin: "0 0 6px", color: s.textPrimary, fontWeight: 700 }}>
              {search ? "No offers match your search" : "No offers yet"}
            </h2>
            <p style={{ margin: 0, color: s.textMuted, fontSize: 14 }}>
              {search ? "Try a different keyword." : "Click Add Offer to create your first promotional campaign."}
            </p>
          </div>
          {!search && (
            <button onClick={() => setModal({})} style={{ ...btn.base, height: 40, padding: "0 20px", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={16} /> Add Offer
            </button>
          )}
        </div>
      )}

      {/* ── Offer form modal */}
      {modal !== null && (
        <OfferFormModal
          initial={modal?.offer ?? null}
          onClose={() => setModal(null)}
          onSaved={fetchOffers}
          isDark={isDark}
        />
      )}

      {/* ── Delete confirm modal */}
      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, background: s.modalOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ background: s.surfaceAlt, border: `1px solid ${s.border}`, borderRadius: 12, padding: 28, width: 360, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, background: "rgba(239,68,68,.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <X size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: "0 0 8px", color: s.textPrimary, fontWeight: 700 }}>Delete Offer?</h3>
            <p style={{ margin: "0 0 20px", color: s.textLabel, fontSize: 14 }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ ...btn.base, flex: 1, background: isDark ? "#374151" : "#e5e7eb", color: s.textPrimary }}>Cancel</button>
              <button onClick={() => deleteOffer(deleteConfirm)} style={{ ...btn.base, flex: 1, background: "#dc2626", color: "#fff" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}