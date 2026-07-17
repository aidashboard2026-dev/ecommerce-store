import React, { useState } from "react";
import { storefrontAPI } from "@/shared/services/api";
import { toast } from "react-hot-toast";
import { FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Phone, Instagram, Facebook, Mail } from "lucide-react";
import useStoreSettings from "@/shared/hooks/useStoreSettings";

import ContactModal from "../storefooter/ContactModal";
import AboutPage from "@/storefront/components/storefooter/about";
import ContactPage from "@/storefront/components/storefooter/contact";
import ShippingPage from "@/storefront/components/storefooter/ShippingPage";
import ReturnsPage from "@/storefront/components/storefooter/ReturnsPage";
import PrivacyPolicy from "@/storefront/components/storefooter/PrivacyPolicy";
import TermsConditions from "@/storefront/components/storefooter/TermsConditions";
const StoreFooterComponent = function StoreFooter() {
  const { settings } = useStoreSettings();


  const [openContact, setOpenContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const storeName = import.meta.env.VITE_STORE_NAME || "My Designers";
  const supportEmail = settings?.support_email || "";

  // Normalize phone to +91XXXXXXXXXX from whatever format is stored
  const rawPhone = settings?.support_phone || "";
  const supportPhone = rawPhone
    ? rawPhone.startsWith("+91")
      ? rawPhone
      : rawPhone.startsWith("91") && rawPhone.replace(/\D/g, "").length === 12
      ? `+${rawPhone.replace(/\D/g, "")}`
      : `+91${rawPhone.replace(/\D/g, "")}`
    : "";

  // Display-formatted phone: "+91 9876543210"
  const displayPhone = supportPhone
    ? `${supportPhone.slice(0, 3)} ${supportPhone.slice(3)}`
    : "";

  // Social links from environment — never hardcoded
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL || "";
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || "";
  // WhatsApp business number resolved dynamically from settings
  const rawWaPhone = settings?.support_phone || import.meta.env.VITE_WHATSAPP_NUMBER || "";
  const cleanWaNumber = rawWaPhone.replace(/\D/g, "");
  const whatsappNumber = cleanWaNumber.length === 10 ? `91${cleanWaNumber}` : cleanWaNumber;

  const waMessage = encodeURIComponent(
    "Hello! I would like to know more about your products.",
  );

  const description = settings?.description || "";

  const linkBase =
    "text-[14px] leading-[1.6] text-muted hover:text-app transition-all duration-300 ease-out inline-block hover:translate-x-[2px]";

  const headingBase =
    "text-[12px] font-semibold uppercase tracking-[3px] text-[#111111] whitespace-nowrap";

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    // wa.me works on both mobile and desktop; the OS/browser decides which app to open
    window.open(`https://wa.me/${whatsappNumber}?text=${waMessage}`, "_blank", "noopener,noreferrer");
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await storefrontAPI.contact(form);
      toast.success("Message sent successfully!");
      setForm({ name: "", email: "", subject: "", message: "" });
      setOpenContact(false);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t border-app mt-16 transition-colors duration-300">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-10 lg:px-12 py-5">
        <div className="grid grid-cols-1 gap-5 md:gap-5 md:grid-cols-2 lg:grid-cols-4 justify-center md:items-start">

          {/* ================= About ================= */}
          <div className="flex flex-col justify-between items-start h-full gap-4">
            <div className="space-y-3">
              <h4 className={headingBase}>About {storeName}</h4>

              {description && (
                <p className="max-w-[340px] text-[13px] leading-[1.6] text-[#555555] font-light whitespace-pre-line">
                  {description}
                </p>
              )}

              {/* {settings?.store_location && (
                <div className="text-[13px] leading-[1.5] text-[#555555] font-light max-w-[340px] whitespace-pre-line border-t border-gray-100 pt-3">
                  <span className="font-semibold text-xs text-[#111111] block mb-1">Our Store Location</span>
                  {settings.store_location}
                </div>
              )} */}
            </div>

            {/* Social & Contact icon row — always rendered; links degrade gracefully when data is absent */}
            <div className="flex items-center gap-5">
              <a
                href={supportEmail ? `mailto:${supportEmail}` : "#"}
                aria-label="Email Us"
                className="text-[#555555] hover:text-indigo-500 transition-all duration-300 hover:scale-110"
              >
                <Mail size={18} strokeWidth={1.7} />
              </a>

              <a
                href={supportPhone ? `tel:${supportPhone}` : "#"}
                aria-label="Call Us"
                className="text-[#555555] hover:text-orange-500 transition-all duration-300 hover:scale-110"
              >
                <Phone size={18} strokeWidth={1.7} />
              </a>

              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${waMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="text-[#555555] hover:text-[#25D366] transition-all duration-300 hover:scale-110"
                >
                  <FaWhatsapp size={19} />
                </a>
              )}

              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-[#555555] hover:text-[#1877F2] transition-all duration-300 hover:scale-110"
                >
                  <Facebook size={18} strokeWidth={1.7} />
                </a>
              )}

              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-[#555555] hover:text-[#E1306C] transition-all duration-300 hover:scale-110"
                >
                  <Instagram size={18} strokeWidth={1.7} />
                </a>
              )}
            </div>
          </div>

          {/* ================= Quick Links ================= */}
          <div className="flex flex-col items-start lg:items-center h-full mt-5 md:mt-0 gap-3">
            <h4 className={headingBase}>Quick Links</h4>
            <Link to="/" className={linkBase}>Home</Link>
            <Link to="/products" className={linkBase}>Shop</Link>
            <Link
                to="/about"
                className={linkBase}
            >
                About
            </Link>
            <Link
              to="/contact"
              className={linkBase}
            >
              Contact
            </Link>
          </div>

          {/* ================= Customer Care ================= */}
          <div className="flex flex-col items-start lg:items-center h-full mt-5 md:mt-5 lg:mt-0 gap-3">
            <h4 className={headingBase}>Customer Care</h4>
            <Link
              to="/shipping"
              className={linkBase}
            >
              Shipping
            </Link>
            <Link
              to="/returns"
              className={linkBase}
            >
              Returns
            </Link>
            <Link
              to="/privacy-policy"
              className={linkBase}
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-conditions"
              className={linkBase}
            >
              Terms & Conditions
            </Link>
          </div>

          {/* ================= Contact ================= */}
          <div className="flex flex-col items-start justify-between lg:items-center h-full mt-5 md:mt-5 lg:mt-0 gap-3">
            <h4 className={headingBase}>Contact</h4>

            {supportEmail && (
              <div className="flex flex-col gap-0.5">
                <a href={`mailto:${supportEmail}`} className={linkBase}>
                  {supportEmail}
                </a>
              </div>
            )}


            <button
              onClick={() => setOpenContact(true)}
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Contact Us
            </button>
          </div>

          <ContactModal
            open={openContact}
            onClose={() => setOpenContact(false)}
            form={form}
            setForm={setForm}
            loading={loading}
            onSubmit={handleContactSubmit}
          />
        </div>
      </div>

      {/* ================= Bottom Bar ================= */}
      <div className="mx-auto flex w-full p-5 items-center justify-center">
        <p className="text-[12px] md:text-[14px] text-nowrap text-[#555555]">
          © {new Date().getFullYear()} {storeName}. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};

const StoreFooter = React.memo(StoreFooterComponent);

export default StoreFooter;