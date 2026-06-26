import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
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
} from "lucide-react";
import api from "@/shared/services/api";
import clsx from "clsx";

import PageHeader from "@/shared/components/ui/PageHeader";
import SearchBar from "@/shared/components/ui/SearchBar";
import Drawer from "@/shared/components/ui/Drawer";
import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";

export default function OffersPage() {
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
      toast.error("Failed to load promotional offers");
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
      !bannerFile ||
      // !offerName.trim() ||
      // !percentage.trim() ||
      !startDate ||
      !startTime ||
      !endDate ||
      !endTime
    ) {
      toast.error(
        "Please fill all required fields, including the banner image.",
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

    setStartDate("");
    setEndDate("");

    setStartTime("");
    setEndTime("");

    setBanner(null);
    setBannerFile(null);
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

    setBanner(getOfferImageUrl(offer.banner_image));

    setShowAddOffer(true);
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

        toast.success("Campaign updated successfully!");
      } else {
        await api.post("/offers/admin", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        toast.success(
          isPub ? "Offer published successfully!" : "Offer saved as draft.",
        );
      }

      fetchOffers();
      clearForm();
      setEditingOffer(null);
      setShowAddOffer(false);
    } catch (error) {
      console.log(error);

      const detail = error.response?.data?.detail;

      let message = "Unable to save offer.";

      if (Array.isArray(detail)) {
        message = detail.map((e) => e.msg).join(", ");
      } else if (typeof detail === "string") {
        message = detail;
      }

      toast.error(message);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const publishOffer = async (offerId) => {
    try {
      await api.put(`/offers/admin/${offerId}`, { status: "published" });
      toast.success("Offer published successfully!");
      fetchOffers();
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish offer.");
    }
  };

  const deleteOffer = async (offerId) => {
    try {
      await api.delete(`/offers/admin/${offerId}`);
      toast.success("Offer deleted successfully.");
      fetchOffers();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete offer.");
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

  return (
    <div className="space-y-6 ">
      {/* Header Panel */}
      <PageHeader
        title="Offers & Promos"
        description="Deploy discount codes and custom banner campaigns"
        actions={
          <>
            <SearchBar
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              className="max-w-xs"
            />
            <Button
              onClick={() => {
                clearForm();
                setShowAddOffer(true);
              }}
              icon={Plus}
              variant="primary"
              className="flex flex-row w-fit whitespace-nowrap"
            >
              <span>Create Campaign</span>
            </Button>
          </>
        }
      />

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-xs font-medium text-muted">
            Syncing promotions...
          </p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="card p-16 text-center border-dashed flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-app flex items-center justify-center text-muted">
            <Percent size={20} />
          </div>
          <div>
            <h3 className="font-bold text-app text-sm">
              No promotional campaigns found
            </h3>
            <p className="text-muted text-xs mt-1">
              Create banners and discount deals to boost your customer
              engagement.
            </p>
          </div>
          <Button
            onClick={() => setShowAddOffer(true)}
            icon={Plus}
            variant="addvariant"
            className="flex items-center gap-2 py-2 bg-sky-500 text-xs font-semibold whitespace-nowrap"
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
                {/* Banner Image */}
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
                        <button
                          onClick={() => publishOffer(offer.id)}
                          variant="addvariant"
                          className="px-3 py-1.5 rounded-l text-white font-bold text-[11px] transition-all"
                        >
                          Publish
                        </button>
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
                              "Are you sure you want to delete this campaign?",
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

      {/* Add Offer Drawer Overlay */}
      <Drawer
        isOpen={showAddOffer}
        onClose={() => setShowAddOffer(false)}
        title="Create Campaign"
        subtitle="Fill details to create a promotional banner"
        size="xl"
      >
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {/* Image upload preview box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-app">
              Campaign Banner <span className="text-red-500">*</span>
            </label>
            <label className="w-full h-36 border-2 border-dashed border-gray-500/50 hover:border-brand-500 rounded-xl cursor-pointer overflow-hidden bg-app flex flex-col items-center justify-center gap-2 transition-colors">
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setBanner(URL.createObjectURL(file));
                    setBannerFile(file);
                  }
                }}
              />
              {banner ? (
                <img
                  src={banner}
                  alt="Offer Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <ImageIcon size={24} className="text-muted mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-brand-500">
                    Upload Offer & Campaign Image
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">
                    Support PNG, JPG, WEBP (ratio 16:9)
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Offer Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-app">Offer Name</label>
            <input
              type="text"
              placeholder="e.g. Summer Clearance Sale"
              value={offerName}
              onChange={(e) => setOfferName(e.target.value)}
              className="input-field py-2.5 text-xs"
            />
          </div>

          {/* Percentage */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-app">
              Discount Percentage (%)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 50"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="input-field pl-9 py-2.5 text-xs"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">
                %
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-app">
              Description
            </label>
            <textarea
              placeholder="Briefly describe the promotional campaign terms..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="input-field py-2.5 text-xs resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-app">
              Text Alignment
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setitemAlign("left")}
                className={clsx(
                  "flex-1 rounded-lg border py-2 text-xs font-semibold transition",
                  itemAlign === "left"
                    ? "bg-brand-500 text-white border-brand-500"
                    : "border-app hover:bg-app",
                )}
              >
                Left
              </button>

              <button
                type="button"
                onClick={() => setitemAlign("center")}
                className={clsx(
                  "flex-1 rounded-lg border py-2 text-xs font-semibold transition",
                  itemAlign === "center"
                    ? "bg-brand-500 text-white border-brand-500"
                    : "border-app hover:bg-app",
                )}
              >
                Center
              </button>

              <button
                type="button"
                onClick={() => setitemAlign("right")}
                className={clsx(
                  "flex-1 rounded-lg border py-2 text-xs font-semibold transition",
                  itemAlign === "right"
                    ? "bg-brand-500 text-white border-brand-500"
                    : "border-app hover:bg-app",
                )}
              >
                Right
              </button>
            </div>
          </div>
          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-app">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field py-2 text-xs"
                placeholder="DD-MM-YYYY"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-app">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field py-2 text-xs"
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-app">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field py-2 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-app">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field py-2 text-xs"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="border-t border-app pt-4 mt-6 flex gap-3">
            <Button
              type="button"
              onClick={() => handleSave("saved")}
              disabled={saving || publishing}
              variant="save"
              className="flex-1"
            >
              {saving ? "Saving..." : "Save Draft"}
            </Button>

            <Button
              type="button"
              onClick={() => handleSave("published")}
              disabled={saving || publishing}
              variant="addvariant"
              className="flex-1"
            >
              {publishing ? "Publishing..." : "Publish Campaign"}
            </Button>

            <Button
              type="button"
              onClick={() => setShowAddOffer(false)}
              variant="delete"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
