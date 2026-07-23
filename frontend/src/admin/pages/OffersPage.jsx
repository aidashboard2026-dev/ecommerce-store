import React, { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import useBusinessLimits from "@/shared/hooks/useBusinessLimits";
import { useTheme } from "@/shared/hooks/useAuth";
import { BannerPreviewModal } from "./BannerPage";
import { getApiErrorMessage, getImageUrl } from "@/shared/utils/productUtils";
import { compressImage } from "@/shared/utils/imageCompression";

import {
  Search,
  Plus,
  Calendar,
  Percent,
  Clock,
  Trash2,
  Eye,
  FileText,
  X,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  Upload,
  Download,
} from "lucide-react";
import api from "@/shared/services/api";
import clsx from "clsx";

import PageHeader from "@/shared/components/ui/PageHeader";
import SearchBar from "@/shared/components/ui/SearchBar";
import Drawer from "@/shared/components/ui/Drawer";
import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";

// --- Constants -------------------------------------------------------------
// Centralising status literals avoids typo-based bugs and documents intent.
const OFFER_STATUS = {
  DRAFT: "saved",
  PUBLISHED: "published",
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB (backend limit)

// Countdown text only shows day/hour/minute granularity, so a 1s tick is
// unnecessary work. Update once every 30s instead.
const COUNTDOWN_TICK_MS = 30 * 1000;

const TEXT_ALIGN_OPTIONS = ["left", "center", "right"];

export default function OffersPage() {
  const { limits, isLoading: limitsLoading, error: limitsError, refetch: refetchLimits } = useBusinessLimits();
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");

  const [showAddOffer, setShowAddOffer] = useState(false);

  // Form state
  const [offerName, setOfferName] = useState("");
  const [percentage, setPercentage] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [banner, setBanner] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [editingOffer, setEditingOffer] = useState(null);
  const [textAlign, setTextAlign] = useState("left");

  // Image upload state
  const [offerStatus, setOfferStatus] = useState(OFFER_STATUS.DRAFT);
  const [dragActive, setDragActive] = useState(false);
  const [imageDimensions, setImageDimensions] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fileInputRef = useRef(null);
  // Tracks the last blob URL we created so it can be revoked, preventing
  // memory leaks from accumulating object URLs across selections.
  const objectUrlRef = useRef(null);

  // Listing state
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Timer state (drives the "expires in" countdown)
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/offers/admin/all");
      setOffers(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Failed to load promotional offers"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Revoke any outstanding blob URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);



  const filteredOffers = offers
    .filter((offer) => offer.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.status === OFFER_STATUS.PUBLISHED && b.status === OFFER_STATUS.PUBLISHED) {
        return new Date(a.expires_at) - new Date(b.expires_at);
      }
      if (a.status === OFFER_STATUS.PUBLISHED) return -1;
      if (b.status === OFFER_STATUS.PUBLISHED) return 1;
      return b.id - a.id;
    });

  const validateOfferForm = () => {
    if (!bannerFile && !banner) {
      toast.error("Please add an offer image before saving.");
      return false;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      toast.error("Please fill all required schedule fields.");
      return false;
    }

    if (percentage.trim()) {
      if (!/^\d+$/.test(percentage)) {
        toast.error("Discount percentage must contain numbers only.");
        return false;
      }

      const pctNum = Number(percentage);
      if (pctNum <= 0 || pctNum > 100) {
        toast.error("Discount percentage must be between 1 and 100.");
        return false;
      }
    }

    if (new Date(`${endDate}T${endTime}`) <= new Date(`${startDate}T${startTime}`)) {
      toast.error("End Date & Time must be after Start Date & Time.");
      return false;
    }

    return true;
  };

  const revokeCurrentObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const clearForm = () => {
    setEditingOffer(null);

    setOfferName("");
    setPercentage("");
    setDescription("");
    setTextAlign("left");
    setOfferStatus(OFFER_STATUS.DRAFT);

    setStartDate("");
    setEndDate("");
    setStartTime("");
    setEndTime("");

    revokeCurrentObjectUrl();
    setBanner(null);
    setBannerFile(null);
    setImageDimensions("");
    setFileSizeStr("");
    setUploadSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (offer) => {
    setEditingOffer(offer);

    setOfferName(offer.title || "");
    setPercentage(offer.percentage || "");
    setDescription(offer.description || "");
    setStartDate(offer.start_date || "");
    setEndDate(offer.end_date || "");
    setStartTime(offer.start_time || "");
    setEndTime(offer.end_time || "");
    setTextAlign(offer.text_align || "left");
    setOfferStatus(offer.status || OFFER_STATUS.DRAFT);

    revokeCurrentObjectUrl();
    setBannerFile(null);
    setFileSizeStr(""); // size unknown for a server-stored image

    const imageUrl = getImageUrl(offer.banner_image);
    setBanner(imageUrl || null);

    if (offer.banner_image) {
      const img = new Image();
      img.onload = () => setImageDimensions(`${img.width}×${img.height}`);
      img.onerror = () => setImageDimensions("");
      img.src = imageUrl;
      setUploadSuccess(true);
    } else {
      setImageDimensions("");
      setUploadSuccess(false);
    }

    setShowAddOffer(true);
  };

  // --- Image upload handlers ------------------------------------------------
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    // The UI advertises a 5MB recommendation, but the backend accepts up to 10MB.
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image size must be under 10 MB.");
      return;
    }

    // Reuse a single object URL for both the dimension probe and the preview,
    // and revoke whatever URL preceded it to avoid leaking blob memory.
    revokeCurrentObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    const img = new Image();
    img.onload = () => setImageDimensions(`${img.width}×${img.height}`);
    img.onerror = () => setImageDimensions("");
    img.src = objectUrl;

    setFileSizeStr((file.size / (1024 * 1024)).toFixed(1) + " MB");
    setBanner(objectUrl);
    setBannerFile(file);
    setUploadSuccess(true);
  };

  const handleRemoveImage = () => {
    revokeCurrentObjectUrl();
    setBanner(null);
    setBannerFile(null);
    setImageDimensions("");
    setFileSizeStr("");
    setUploadSuccess(false);
    // Reset the input value so re-selecting the same file still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Save / publish / delete ----------------------------------------------
  const handleSave = async (status = OFFER_STATUS.DRAFT) => {
    if (!validateOfferForm()) return;

    const isPublishing = status === OFFER_STATUS.PUBLISHED;
    isPublishing ? setPublishing(true) : setSaving(true);

    try {
      const formData = new FormData();

      if (offerName.trim()) formData.append("title", offerName);
      if (percentage.trim()) formData.append("percentage", percentage);

      formData.append("description", description);
      formData.append("text_align", textAlign);
      formData.append("start_date", startDate);
      formData.append("end_date", endDate);
      formData.append("start_time", startTime);
      formData.append("end_time", endTime);
      formData.append("status", status);

      if (bannerFile) {
        const compressed = await compressImage(bannerFile);
        formData.append("banner_image", compressed);
      }

      if (editingOffer) {
        await api.put(`/offers/admin/${editingOffer.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Offer updated successfully.");
      } else {
        await api.post("/offers/admin", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(isPublishing ? "Offer published successfully." : "Offer saved as draft successfully.");
      }

      await fetchOffers();
      clearForm();
      setShowAddOffer(false);
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Unable to save offer."));
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };
  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return "";
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hour, minute] = (timeStr || "00:00").split(":").map(Number);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = months[month - 1] || "";
      
      let hoursStr = hour;
      const minutesStr = String(minute).padStart(2, "0");
      const ampmStr = hour >= 12 ? "PM" : "AM";
      hoursStr = hour % 12;
      hoursStr = hoursStr ? hoursStr : 12;
      const formattedTime = `${String(hoursStr).padStart(2, "0")}:${minutesStr} ${ampmStr}`;
      
      return `${day} ${monthName} ${year} • ${formattedTime}`;
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  const handlePublish = async (offerId) => {
    setActionLoading((prev) => ({ ...prev, [`publish-${offerId}`]: true }));
    try {
      await api.put(`/offers/admin/${offerId}`);
      toast.success("Offer published successfully.");
      await fetchOffers();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Failed to publish offer."));
    } finally {
      setActionLoading((prev) => ({ ...prev, [`publish-${offerId}`]: false }));
    }
  };

  const handleUnpublish = async (offerId) => {
    setActionLoading((prev) => ({ ...prev, [`unpublish-${offerId}`]: true }));
    try {
      const formData = new FormData();
      formData.append("status", OFFER_STATUS.DRAFT);
      await api.patch(`/offers/admin/${offerId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Offer unpublished successfully.");
      await fetchOffers();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Failed to unpublish offer."));
    } finally {
      setActionLoading((prev) => ({ ...prev, [`unpublish-${offerId}`]: false }));
    }
  };

  const handleDelete = async (offerId) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    setActionLoading((prev) => ({ ...prev, [`delete-${offerId}`]: true }));
    try {
      await api.delete(`/offers/admin/${offerId}`);
      toast.success("Offer deleted successfully.");
      await fetchOffers();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Failed to delete offer."));
    } finally {
      setActionLoading((prev) => ({ ...prev, [`delete-${offerId}`]: false }));
    }
  };

  const formatCountdown = (expiresAtStr) => {
    if (!expiresAtStr) return "Expiry time missing";
    const expiresAt = new Date(expiresAtStr + "Z");
    const diff = expiresAt.getTime() - currentTime.getTime();

    if (diff <= 0) return "Campaign expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return days > 0 ? `Ends in: ${days}d ${hours}h` : `Ends in: ${hours}h ${minutes}m`;
  };

  // --- Offer-limit gating ----------------------------------------------------
  const isAtOfferLimit = Boolean(limits) && offers.length >= limits.max_offers;

  const showLimitReachedToast = () => {
    toast.error(
      <div>
        <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
        <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
          You have reached the maximum allowed limit of {limits.max_offers} offers.{"\n"}Please delete an existing offer before creating a new one.
        </div>
      </div>
    );
  };

  // Shared gate used by both "Create Offer" entry points. Returns whether
  // it's safe to open the create-offer drawer.
  const canCreateOffer = () => {
    if (!limits) {
      toast.error("⚠️ Store limits are not loaded yet. Please wait.");
      return false;
    }
    if (isAtOfferLimit) {
      showLimitReachedToast();
      return false;
    }
    return true;
  };

  const handleCreateCampaignClick = () => {
    if (!canCreateOffer()) return;
    clearForm();
    setShowAddOffer(true);
  };

  const handleAddFirstOfferClick = () => {
    if (!canCreateOffer()) return;
    setShowAddOffer(true);
  };

  const offerActionDisabled = limitsLoading || !!limitsError || isAtOfferLimit;
  const offerActionTitle = limitsLoading
    ? "Loading store configuration..."
    : limitsError
    ? "Unable to load configuration"
    : isAtOfferLimit
    ? "Maximum limit reached.\nDelete an existing item to continue."
    : "";

  return (
    <div className="space-y-6">
      {limitsError && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>Unable to load store configuration. Please refresh the page or try again.</span>
          </div>
          <button
            type="button"
            onClick={() => refetchLimits()}
            className="px-3 py-1 rounded bg-red-500 text-white font-bold text-[11px]"
          >
            Retry
          </button>
        </div>
      )}
      {/* Header Panel */}
      <PageHeader
        title="Offers & Promos"
        description="Deploy discount codes and custom offer campaigns"
        actions={
          <>
            <SearchBar
              placeholder="Search offers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              className="max-w-xs"
            />
            <Button
              onClick={handleCreateCampaignClick}
              disabled={offerActionDisabled}
              icon={limitsLoading ? Loader2 : Plus}
              variant={isAtOfferLimit ? "secondary" : "primary"}
              title={offerActionTitle}
              className={clsx("flex flex-row w-fit whitespace-nowrap", offerActionDisabled && "opacity-50 cursor-not-allowed")}
            >
              <span>{limitsLoading ? "Loading..." : "Create Offer"}</span>
            </Button>
          </>
        }
      />

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading offers">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card overflow-hidden bg-surface border border-app rounded-2xl flex flex-col h-full animate-pulse"
            >
              <div className="h-40 bg-app" />
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-app rounded w-1/3" />
                  <div className="h-5 bg-app rounded w-3/4" />
                  <div className="h-3 bg-app rounded w-full" />
                  <div className="h-3 bg-app rounded w-5/6" />
                </div>
                <div className="border-t border-app pt-3.5 space-y-2">
                  <div className="h-10 bg-app rounded-xl w-full" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-9 bg-app rounded-lg flex-1" />
                    <div className="h-9 bg-app rounded-lg flex-1" />
                    <div className="h-9 bg-app rounded-lg flex-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="card p-16 text-center border-dashed flex flex-col items-center justify-center max-w-md mx-auto space-y-5 bg-surface/50 backdrop-blur-sm rounded-2xl border border-app shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 shadow-inner">
            <Percent size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-app text-base">No Offers Available</h3>
            <p className="text-muted text-xs">
              Create your first promotional offer.
            </p>
          </div>
          <Button
            onClick={handleAddFirstOfferClick}
            disabled={offerActionDisabled}
            icon={Plus}
            variant="primary"
            title={offerActionTitle}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold whitespace-nowrap rounded-xl shadow-md transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background"
          >
            Add Offer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => {
            const expired = offer.expires_at && new Date(offer.expires_at + "Z") <= currentTime;
            const statusVariant = expired ? "default" : offer.status === OFFER_STATUS.PUBLISHED ? "success" : "warning";

            return (
              <div
                key={offer.id}
                className="bg-surface border border-app rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-200 ease-out shadow-sm hover:shadow-md hover:border-brand-500/40 hover:-translate-y-0.5 group"
              >
                {/* Offer Image */}
                <div className="h-40 bg-app border-b border-app relative overflow-hidden group">
                  {offer.banner_image ? (
                    <img
                      src={getImageUrl(offer.banner_image)}
                      alt={offer.title}
                      className="w-full h-full object-cover transition-all duration-200 ease-in opacity-0"
                      onLoad={(e) => {
                        e.currentTarget.classList.remove("opacity-0");
                      }}
                      onError={(e) => {
                        e.currentTarget.src = "";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <ImageIcon size={28} />
                    </div>
                  )}
                  {/* Discount Badge */}
                  <div className="absolute top-3 right-3 bg-brand-500 text-white font-extrabold text-[11px] px-3 py-1 rounded-lg shadow-md border border-white/10 select-none tracking-wide">
                    {offer.percentage}% OFF
                  </div>
                </div>

                {/* Offer details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        label={expired ? "Expired" : offer.status === OFFER_STATUS.PUBLISHED ? "Published" : "Draft"}
                        variant={statusVariant}
                        dot
                        className="shadow-sm font-semibold tracking-wide"
                      />
                    </div>
                    <h3 className="font-bold text-sm text-app leading-snug">{offer.title}</h3>
                    {offer.description && (
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">{offer.description}</p>
                    )}
                  </div>

                  <div className="border-t border-app pt-3.5 space-y-2.5">
                    {/* Time limits */}
                    <div className="grid grid-cols-2 gap-2 text-app font-medium bg-app/30 p-2.5 rounded-xl border border-app/50 text-[11px] leading-relaxed">
                      <div>
                        <div className="flex items-center gap-1 text-muted text-[10px] uppercase tracking-wider font-bold">
                          <Calendar size={11} className="text-muted" />
                          <span>Starts</span>
                        </div>
                        <div className="text-[11px] text-app font-semibold mt-0.5">
                          {formatDateTime(offer.start_date, offer.start_time)}
                        </div>
                      </div>
                      <div className="border-l border-app/40 pl-2.5">
                        <div className="flex items-center gap-1 text-muted text-[10px] uppercase tracking-wider font-bold">
                          <Clock size={11} className="text-muted" />
                          <span>Ends</span>
                        </div>
                        <div className="text-[11px] text-app font-semibold mt-0.5">
                          {formatDateTime(offer.end_date, offer.end_time)}
                        </div>
                      </div>
                    </div>

                    {/* Active Countdown badge (only if Published and not Expired) */}
                    {offer.status === OFFER_STATUS.PUBLISHED && !expired && (
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-500 bg-rose-500/5 py-1 px-2.5 rounded-lg border border-rose-500/10">
                        <Clock size={12} className="animate-pulse" />
                        <span>{formatCountdown(offer.expires_at)}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                      {offer.status === OFFER_STATUS.DRAFT ? (
                        <button
                          onClick={() => handlePublish(offer.id)}
                          disabled={actionLoading[`publish-${offer.id}`] || actionLoading[`delete-${offer.id}`]}
                          aria-label="Publish offer"
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[11px] font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background active:scale-[0.98] duration-150"
                        >
                          {actionLoading[`publish-${offer.id}`] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>Publish</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnpublish(offer.id)}
                          disabled={actionLoading[`unpublish-${offer.id}`] || actionLoading[`delete-${offer.id}`]}
                          aria-label="Unpublish offer"
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[11px] font-bold transition-all bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background active:scale-[0.98] duration-150"
                        >
                          {actionLoading[`unpublish-${offer.id}`] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>Unpublish</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleEdit(offer)}
                        disabled={
                          actionLoading[`publish-${offer.id}`] ||
                          actionLoading[`unpublish-${offer.id}`] ||
                          actionLoading[`delete-${offer.id}`]
                        }
                        aria-label="Edit offer"
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[11px] font-bold transition-all border border-app hover:bg-app text-app disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background active:scale-[0.98] duration-150"
                      >
                        <FileText size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDelete(offer.id)}
                        disabled={
                          actionLoading[`publish-${offer.id}`] ||
                          actionLoading[`unpublish-${offer.id}`] ||
                          actionLoading[`delete-${offer.id}`]
                        }
                        aria-label="Delete offer"
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[11px] font-bold transition-all bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background active:scale-[0.98] duration-150"
                      >
                        {actionLoading[`delete-${offer.id}`] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Offer Drawer */}
      <Drawer
        isOpen={showAddOffer}
        onClose={() => setShowAddOffer(false)}
        title={editingOffer ? "Edit Offer" : "Create Offer"}
        subtitle={editingOffer ? "Modify the details of this promotional offer" : "Fill details to create a promotional offer"}
        size="xl"
      >
        <form onSubmit={(e) => e.preventDefault()} className="relative flex flex-col h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 pb-6">

            {/* Left Column: Media upload and Schedule */}
            <div className="space-y-4 lg:space-y-6">

              {/* Image Upload section */}
              <div className="card p-5 md:p-6 border border-app bg-surface rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-app pb-3">
                  <h3 className="text-sm font-bold text-app flex items-center gap-2">
                    <span>🖼️</span> Offer Image
                  </h3>
                </div>

                <p className="text-[10px] text-muted">
                  This image will be displayed to customers on the storefront.
                </p>

                {banner ? (
                  <div className="relative rounded-xl border border-app overflow-hidden bg-app">
                    <div className="relative h-48 bg-black/20 flex items-center justify-center overflow-hidden group">
                      <img src={banner} alt="Offer Preview" className="w-full h-full object-cover" />

                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setShowPreviewModal(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/95 hover:bg-white text-gray-900 rounded-lg text-xs font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
                        >
                          <Eye size={14} />
                          <span>Preview</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-surface border-t border-app flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        {uploadSuccess && (
                          <p className="text-xs font-bold text-green-500">✓ Uploaded Successfully</p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-muted font-medium">
                          {imageDimensions && <span>{imageDimensions}</span>}
                          {fileSizeStr && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span>{fileSizeStr}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 border border-app hover:border-brand-500 rounded-lg text-[11px] font-semibold text-app hover:text-brand-500 transition-colors"
                        >
                          Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg text-[11px] font-semibold text-red-500 transition-colors"
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    className={clsx(
                      "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
                      dragActive ? "border-brand-500 bg-brand-500/5 scale-[0.99]" : "border-gray-500/30 hover:border-brand-500 bg-app/50 hover:bg-app"
                    )}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleFileSelection(file);
                      }}
                    />
                    <div className="flex flex-col items-center justify-center p-5 text-center gap-2">
                      <ImageIcon size={32} className="text-muted mb-1" />
                      <p className="text-sm font-semibold text-app">Drag & Drop Offer Image Here</p>
                      <p className="text-xs text-muted">or</p>
                      <span className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
                        Choose Image
                      </span>
                      <div className="mt-2 text-[10px] text-muted space-y-0.5 leading-relaxed">
                        <p>Supported Formats: JPG • PNG • WEBP</p>
                        <p>Max Size: 5 MB · Recommended Size: 1600×600 px</p>
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {/* Schedule */}
              <div className="card p-5 md:p-6 border border-app bg-surface rounded-xl shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-app pb-3">
                  <h3 className="text-sm font-bold text-app flex items-center gap-2">
                    <span>📅</span> Schedule
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="start-date" className="text-xs font-semibold text-app">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input-field w-full py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="start-time" className="text-xs font-semibold text-app">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="input-field w-full py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="end-date" className="text-xs font-semibold text-app">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input-field w-full py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="end-time" className="text-xs font-semibold text-app">
                        End Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="end-time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="input-field w-full py-2 text-xs"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-muted leading-relaxed">
                    The offer will be active between the selected start and end date & time.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Information, Description, and Status */}
            <div className="space-y-4 lg:space-y-6">

              {/* Offer Information */}
              <div className="card p-5 md:p-6 border border-app bg-surface rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-app pb-3">
                  <h3 className="text-sm font-bold text-app flex items-center gap-2">
                    <span>🏷️</span> Offer Information
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="offer-name" className="text-xs font-semibold text-app">
                      Offer Name
                    </label>
                    <span className="text-[10px] text-muted font-mono">{offerName.length} / 100</span>
                  </div>
                  <input
                    id="offer-name"
                    type="text"
                    placeholder="e.g. Summer Clearance Sale"
                    value={offerName}
                    onChange={(e) => setOfferName(e.target.value.slice(0, 100))}
                    className="input-field w-full py-2.5 text-xs"
                  />
                  <p className="text-[10px] text-muted">This name will identify the offer campaign.</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="discount" className="text-xs font-semibold text-app">
                    Discount (%)
                  </label>
                  <div className="relative">
                    <input
                      id="discount"
                      type="text"
                      placeholder="e.g. 50"
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      className="input-field w-full pl-9 py-2.5 text-xs"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">%</span>
                  </div>
                  <p className="text-[10px] text-muted">Enter a value between 1 and 100.</p>
                </div>
              </div>

              {/* Description */}
              <div className="card p-5 md:p-6 border border-app bg-surface rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-app pb-3">
                  <h3 className="text-sm font-bold text-app flex items-center gap-2">
                    <span>📝</span> Description
                  </h3>
                  <span className="text-[10px] text-muted font-mono">{description.length} / 500</span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="description" className="text-xs font-semibold text-app">
                    Offer Description
                  </label>
                  <textarea
                    id="description"
                    placeholder="Briefly describe the promotional campaign terms..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                    rows="4"
                    className="input-field w-full py-2.5 text-xs resize-none"
                  />
                  <p className="text-[10px] text-muted">This text helps customers understand the offer.</p>
                </div>
              </div>

              {/* Status */}
              <div className="card p-5 md:p-6 border border-app bg-surface rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-app pb-3">
                  <h3 className="text-sm font-bold text-app flex items-center gap-2">
                    <span>🛡️</span> Status
                  </h3>
                </div>

                <div className="flex gap-4 items-stretch">
                  <label
                    className={clsx(
                      "flex-1 flex flex-col justify-center p-4 rounded-xl border cursor-pointer transition-all duration-150 min-h-[90px] select-none",
                      offerStatus === OFFER_STATUS.DRAFT
                        ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20"
                        : "border-app bg-app/20 hover:bg-app"
                    )}
                  >
                    <input
                      type="radio"
                      name="offerStatus"
                      value={OFFER_STATUS.DRAFT}
                      checked={offerStatus === OFFER_STATUS.DRAFT}
                      onChange={() => setOfferStatus(OFFER_STATUS.DRAFT)}
                      className="sr-only"
                    />
                    <span className={clsx("text-xs font-bold transition-colors", offerStatus === OFFER_STATUS.DRAFT ? "text-brand-500" : "text-app")}>
                      Draft
                    </span>
                    <span className="text-[10px] text-muted mt-1 leading-relaxed">
                      Save the offer without displaying it on the storefront.
                    </span>
                  </label>

                  <label
                    className={clsx(
                      "flex-1 flex flex-col justify-center p-4 rounded-xl border cursor-pointer transition-all duration-150 min-h-[90px] select-none",
                      offerStatus === OFFER_STATUS.PUBLISHED
                        ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20"
                        : "border-app bg-app/20 hover:bg-app"
                    )}
                  >
                    <input
                      type="radio"
                      name="offerStatus"
                      value={OFFER_STATUS.PUBLISHED}
                      checked={offerStatus === OFFER_STATUS.PUBLISHED}
                      onChange={() => setOfferStatus(OFFER_STATUS.PUBLISHED)}
                      className="sr-only"
                    />
                    <span className={clsx("text-xs font-bold transition-colors", offerStatus === OFFER_STATUS.PUBLISHED ? "text-brand-500" : "text-app")}>
                      Published
                    </span>
                    <span className="text-[10px] text-muted mt-1 leading-relaxed">
                      Make this offer active immediately or at the scheduled time.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-app border-t border-app py-4 mt-8 flex justify-end items-center gap-3 z-10 -mx-6 px-6 -mb-6">
            <Button type="button" onClick={() => setShowAddOffer(false)} variant="secondary" className="px-5 py-2.5 h-10">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleSave(offerStatus)}
              disabled={saving || publishing}
              variant="primary"
              className="px-5 py-2.5 h-10"
            >
              {saving || publishing ? "Saving..." : editingOffer ? "Save Changes" : "Save Offer"}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Offer Preview Modal */}
      {showPreviewModal && (
        <BannerPreviewModal
          banner={{
            title: offerName,
            description: description,
            percentage: percentage,
            banner_image: banner,
            status: offerStatus,
            start_date: startDate,
            start_time: startTime,
            end_date: endDate,
            end_time: endTime,
          }}
          resolvedImageUrl={banner}
          onClose={() => setShowPreviewModal(false)}
          isDark={isDark}
          type="offer"
        />
      )}
    </div>
  );
}