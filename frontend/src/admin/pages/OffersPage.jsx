import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import useBusinessLimits from "@/shared/hooks/useBusinessLimits";
import { useTheme } from "@/shared/hooks/useAuth";
import { BannerPreviewModal } from "./BannerPage";
import { getApiErrorMessage } from "@/shared/utils/productUtils";

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
} from "lucide-react";
import api from "@/shared/services/api";
import clsx from "clsx";

import PageHeader from "@/shared/components/ui/PageHeader";
import SearchBar from "@/shared/components/ui/SearchBar";
import Drawer from "@/shared/components/ui/Drawer";
import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";

export default function OffersPage() {
  const { limits, isLoading: limitsLoading, error: limitsError, refetch: refetchLimits } = useBusinessLimits();
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");

  const [showAddOffer, setShowAddOffer] = useState(false);

  // Form states
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
  const [itemAlign, setitemAlign] = useState("left");

  // Modern image upload state variables
  const [offerStatus, setOfferStatus] = useState("saved");
  const [dragActive, setDragActive] = useState(false);
  const [imageDimensions, setImageDimensions] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fileInputRef = useRef(null);

  // Listing states
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Timer state
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchOffers = async () => {
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
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getOfferImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const origin = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");
    const base = origin || "http://localhost:8000";
    return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
  };

  const filteredOffers = offers
    .filter((offer) =>
      offer.title?.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (a.status === "published" && b.status === "published") {
        return new Date(a.expires_at) - new Date(b.expires_at);
      }
      if (a.status === "published") return -1;
      if (b.status === "published") return 1;
      return b.id - a.id;
    });

  const validateOfferForm = () => {
    if (
      (!bannerFile && !banner) ||
      // !offerName.trim() ||
      // !percentage.trim() ||
      !startDate ||
      !startTime ||
      !endDate ||
      !endTime
    ) {
      toast.error(
        "Please fill all required fields, including the offer image.",
      );
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

    if (
      new Date(`${endDate}T${endTime}`) <= new Date(`${startDate}T${startTime}`)
    ) {
      toast.error("End Date & Time must be after Start Date & Time.");
      return false;
    }

    return true;
  };

  const clearForm = () => {
    setEditingOffer(null);

    setOfferName("");
    setPercentage("");
    setDescription("");
    setitemAlign("left");
    setOfferStatus("saved");

    setStartDate("");
    setEndDate("");

    setStartTime("");
    setEndTime("");

    setBanner(null);
    setBannerFile(null);
    setImageDimensions("");
    setFileSizeStr("");
    setUploadSuccess(false);
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
    setitemAlign(offer.text_align || "left");
    setOfferStatus(offer.status || "saved");

    setBanner(getOfferImageUrl(offer.banner_image));
    if (offer.banner_image) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions(`${img.width}×${img.height}`);
      };
      img.src = getOfferImageUrl(offer.banner_image);
      setUploadSuccess(true);
      setFileSizeStr(""); // size unknown for server image
    } else {
      setImageDimensions("");
      setFileSizeStr("");
      setUploadSuccess(false);
    }

    setShowAddOffer(true);
  };

  // Modern Upload Handlers
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
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    // We visually display 5MB limit recommendation, but backend allows up to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be under 10 MB.");
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageDimensions(`${img.width}×${img.height}`);
    };
    img.src = URL.createObjectURL(file);

    setFileSizeStr((file.size / (1024 * 1024)).toFixed(1) + " MB");
    setBanner(URL.createObjectURL(file));
    setBannerFile(file);
    setUploadSuccess(true);
  };

  const handleRemoveImage = () => {
    setBanner(null);
    setBannerFile(null);
    setImageDimensions("");
    setFileSizeStr("");
    setUploadSuccess(false);
  };

  const handleSave = async (status = "saved") => {
    if (!validateOfferForm()) return;

    const isPub = status === "published";

    if (isPub) setPublishing(true);
    else setSaving(true);

    try {
      const formData = new FormData();

      if (offerName.trim()) {
        formData.append("title", offerName);
      }

      if (percentage.trim()) {
        formData.append("percentage", percentage);
      }

      formData.append("description", description);
      formData.append("text_align", itemAlign);
      formData.append("start_date", startDate);
      formData.append("end_date", endDate);
      formData.append("start_time", startTime);
      formData.append("end_time", endTime);
      formData.append("status", status);

      if (bannerFile) {
        formData.append("banner_image", bannerFile);
      }

      if (editingOffer) {
        await api.put(`/offers/admin/${editingOffer.id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        toast.success("Offer updated successfully.");
      } else {
        await api.post("/offers/admin", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        toast.success(
          isPub ? "Offer published successfully." : "Offer saved as draft successfully.",
        );
      }

      fetchOffers();
      clearForm();
      setEditingOffer(null);
      setShowAddOffer(false);
    } catch (error) {
      console.log(error);
      toast.error(getApiErrorMessage(error, "Unable to save offer."));
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const publishOffer = async (offerId) => {
    try {
      await api.put(`/offers/admin/${offerId}`, { status: "published" });
      toast.success("Offer published successfully.");
      fetchOffers();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Failed to publish offer."));
    }
  };

  const deleteOffer = async (offerId) => {
    try {
      await api.delete(`/offers/admin/${offerId}`);
      toast.success("Offer deleted successfully.");
      fetchOffers();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Failed to delete offer."));
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

    if (days > 0) {
      return `Ends in: ${days}d ${hours}h`;
    }
    return `Ends in: ${hours}h ${minutes}m`;
  };

  const handleCreateCampaignClick = () => {
    if (!limits) {
      toast.error("⚠️ Store limits are not loaded yet. Please wait.");
      return;
    }
    if (offers.length >= limits.max_offers) {
      toast.error(
        <div>
          <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
          <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
            You have reached the maximum allowed limit of {limits.max_offers} offers.{"\n"}Please delete an existing offer before creating a new one.
          </div>
        </div>
      );
      return;
    }
    clearForm();
    setShowAddOffer(true);
  };

  const handleAddFirstOfferClick = () => {
    if (!limits) {
      toast.error("⚠️ Store limits are not loaded yet. Please wait.");
      return;
    }
    if (offers.length >= limits.max_offers) {
      toast.error(
        <div>
          <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
          <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
            You have reached the maximum allowed limit of {limits.max_offers} offers.{"\n"}Please delete an existing offer before creating a new one.
          </div>
        </div>
      );
      return;
    }
    setShowAddOffer(true);
  };

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
              disabled={limitsLoading || !!limitsError || (limits && offers.length >= limits.max_offers)}
              icon={limitsLoading ? Loader2 : Plus}
              variant={(limits && offers.length >= limits.max_offers) ? "secondary" : "primary"}
              title={limitsLoading ? "Loading store configuration..." : limitsError ? "Unable to load configuration" : (limits && offers.length >= limits.max_offers) ? "Maximum limit reached.\nDelete an existing item to continue." : ""}
              className={clsx("flex flex-row w-fit whitespace-nowrap", (limitsLoading || !!limitsError || (limits && offers.length >= limits.max_offers)) && "opacity-50 cursor-not-allowed")}
            >
              <span>{limitsLoading ? "Loading..." : "Create Offer"}</span>
            </Button>
          </>
        }
      />

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-xs font-medium text-muted">
            Syncing offers...
          </p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="card p-16 text-center border-dashed flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-app flex items-center justify-center text-muted">
            <Percent size={20} />
          </div>
          <div>
            <h3 className="font-bold text-app text-sm">
              No promotional offers found
            </h3>
            <p className="text-muted text-xs mt-1">
              Create offers and discount deals to boost your customer engagement.
            </p>
          </div>
          <Button
            onClick={handleAddFirstOfferClick}
            disabled={limitsLoading || !!limitsError || (limits && offers.length >= limits.max_offers)}
            icon={Plus}
            variant="addvariant"
            title={limitsLoading ? "Loading store configuration..." : limitsError ? "Unable to load configuration" : (limits && offers.length >= limits.max_offers) ? "Maximum limit reached.\nDelete an existing item to continue." : ""}
            className={clsx("flex items-center gap-2 py-2 text-xs font-semibold whitespace-nowrap", (limitsLoading || !!limitsError || (limits && offers.length >= limits.max_offers)) ? "bg-gray-500 cursor-not-allowed opacity-50" : "bg-sky-500")}
          >
            Add First Offer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => {
            const expired =
              offer.expires_at &&
              new Date(offer.expires_at + "Z") <= currentTime;
            const statusVariant = expired
              ? "default"
              : offer.status === "published"
                ? "success"
                : "warning";
            return (
              <div
                key={offer.id}
                className="card overflow-hidden hover:border-brand-500/30 flex flex-col h-full hover:shadow-card-hover transition-all duration-200"
              >
                {/* Offer Image */}
                <div className="h-40 bg-app border-b border-app relative overflow-hidden group">
                  {offer.banner_image ? (
                    <img
                      src={getOfferImageUrl(offer.banner_image)}
                      alt={offer.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                  <div className="absolute top-3 right-3 bg-brand-500 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm">
                    {offer.percentage}% OFF
                  </div>
                </div>

                {/* Offer details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        label={
                          expired
                            ? "Expired"
                            : offer.status === "published"
                              ? "Published"
                              : "Draft"
                        }
                        variant={statusVariant}
                        dot
                      />
                    </div>
                    <h3 className="font-bold text-sm text-app leading-snug">
                      {offer.title}
                    </h3>
                    {offer.description && (
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">
                        {offer.description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-app pt-4 space-y-3">
                    {/* Time limits */}
                    {offer.status === "saved" ? (
                      <div className="text-[10px] space-y-1 text-app font-medium leading-relaxed bg-app/50 p-2.5 rounded-lg border border-app">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-muted" />
                          <span>
                            Start: {offer.start_date} {offer.start_time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-muted" />
                          <span>
                            End: {offer.end_date} {offer.end_time}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-rose-500/10">
                        <Clock size={13} />
                        <span>{formatCountdown(offer.expires_at)}</span>
                      </div>
                    )}

                    {/* Actions buttons */}
                    <div className="flex justify-end gap-2 pt-1">
                      {offer.status === "saved" && (
                        <Button
                          onClick={() => publishOffer(offer.id)}
                          variant="addvariant"
                          className="px-3 py-1.5 rounded-l text-white font-bold text-[11px] transition-all"
                        >
                          Publish
                        </Button>
                      )}
                      <Button
                        onClick={() => handleEdit(offer)}
                        variant="secondary"
                        icon={FileText}
                      >
                        Edit
                      </Button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this offer?",
                            )
                          ) {
                            deleteOffer(offer.id);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold text-[11px] transition-all flex items-center gap-1"
                      >
                        <Trash2 size={11} />
                        Delete
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
            
            {/* Left Column: Media upload, Schedule, and Status */}
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
                  /* Selected Image Preview */
                  <div className="relative rounded-xl border border-app overflow-hidden bg-app">
                    <div className="relative h-48 bg-black/20 flex items-center justify-center overflow-hidden group">
                      <img
                        src={banner}
                        alt="Offer Preview"
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Hover Overlay Preview Button */}
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
                          <p className="text-xs font-bold text-green-500">
                            ✓ Uploaded Successfully
                          </p>
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
                  /* Dashed Upload Area */
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
                      <p className="text-sm font-semibold text-app">
                        Drag & Drop Offer Image Here
                      </p>
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

              {/* Section 4: Schedule */}
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

              {/* Section 5: Status */}
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
                      offerStatus === "saved" 
                        ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20" 
                        : "border-app bg-app/20 hover:bg-app"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="offerStatus" 
                      value="saved" 
                      checked={offerStatus === "saved"} 
                      onChange={() => setOfferStatus("saved")}
                      className="sr-only"
                    />
                    <span className={clsx("text-xs font-bold transition-colors", offerStatus === "saved" ? "text-brand-500" : "text-app")}>Draft</span>
                    <span className="text-[10px] text-muted mt-1 leading-relaxed">
                      Save the offer without displaying it on the storefront.
                    </span>
                  </label>
                  
                  <label 
                    className={clsx(
                      "flex-1 flex flex-col justify-center p-4 rounded-xl border cursor-pointer transition-all duration-150 min-h-[90px] select-none",
                      offerStatus === "published" 
                        ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20" 
                        : "border-app bg-app/20 hover:bg-app"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="offerStatus" 
                      value="published" 
                      checked={offerStatus === "published"} 
                      onChange={() => setOfferStatus("published")}
                      className="sr-only"
                    />
                    <span className={clsx("text-xs font-bold transition-colors", offerStatus === "published" ? "text-brand-500" : "text-app")}>Published</span>
                    <span className="text-[10px] text-muted mt-1 leading-relaxed">
                      Make this offer active immediately or at the scheduled time.
                    </span>
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: Information, Description, and Display Settings */}
            <div className="space-y-4 lg:space-y-6">
              
              {/* Section 1: Offer Information */}
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
                    <span className="text-[10px] text-muted font-mono">
                      {offerName.length} / 100
                    </span>
                  </div>
                  <input
                    id="offer-name"
                    type="text"
                    placeholder="e.g. Summer Clearance Sale"
                    value={offerName}
                    onChange={(e) => setOfferName(e.target.value.slice(0, 100))}
                    className="input-field w-full py-2.5 text-xs"
                  />
                  <p className="text-[10px] text-muted">
                    This name will identify the offer campaign.
                  </p>
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">
                      %
                    </span>
                  </div>
                  <p className="text-[10px] text-muted">
                    Enter a value between 1 and 100.
                  </p>
                </div>
              </div>

              {/* Section 2: Description */}
              <div className="card p-5 md:p-6 border border-app bg-surface rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-app pb-3">
                  <h3 className="text-sm font-bold text-app flex items-center gap-2">
                    <span>📝</span> Description
                  </h3>
                  <span className="text-[10px] text-muted font-mono">
                    {description.length} / 500
                  </span>
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
                  <p className="text-[10px] text-muted">
                    This text helps customers understand the offer.
                  </p>
                </div>
              </div>

              {/* Section 3: Display Settings */}
              <div className="card p-5 md:p-6 border border-app bg-surface rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-app pb-3">
                  <h3 className="text-sm font-bold text-app flex items-center gap-2">
                    <span>🎨</span> Display Settings
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-app">
                    Text Alignment
                  </label>
                  <div className="flex gap-3">
                    {["left", "center", "right"].map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => setitemAlign(align)}
                        className={clsx(
                          "flex-1 rounded-lg border py-2.5 text-xs font-bold capitalize transition-all duration-150 active:scale-[0.98]",
                          itemAlign === align
                            ? "bg-brand-500 text-white border-brand-500 shadow-md ring-2 ring-brand-500/20"
                            : "border-app hover:bg-app text-app bg-app/20 hover:scale-[1.01]",
                        )}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-app border-t border-app py-4 mt-8 flex justify-end items-center gap-3 z-10 -mx-6 px-6 -mb-6">
            <Button
              type="button"
              onClick={() => setShowAddOffer(false)}
              variant="secondary"
              className="px-5 py-2.5 h-10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleSave(offerStatus)}
              disabled={saving || publishing}
              variant="primary"
              className="px-5 py-2.5 h-10"
            >
              {saving || publishing
                ? "Saving..."
                : editingOffer
                ? "Save Changes"
                : "Save Offer"}
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
