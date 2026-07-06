import React, { useState } from "react";
import { storefrontAPI } from "@/shared/services/api";
import { toast } from "react-hot-toast";
import { FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Phone, Instagram, Facebook } from "lucide-react";
import useStoreSettings from "@/shared/hooks/useStoreSettings";

import ContactModal from "../storefooter/ContactModal";

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

  const logoUrl = settings?.logo;
  const storeName = settings?.store_name || "AuraStore";
  const supportEmail = settings?.support_email || "aidashboard2026@gmail.com";
  const supportPhone = settings?.support_phone || "+91 8778021610";

  const whatsappNumber = "918778021610";

  const message = encodeURIComponent(
    "Hello! I would like to know more about your products.",
  );

  const instagramUrl = "https://instagram.com/my._.designers";
  const facebookUrl = "https://facebook.com/your-page";

  const description =
    settings?.description ||
    "Curating premium, hand-crafted designer streetwear, high-performance athletic apparel, and timeless accessories.";

  const linkBase =
    "text-[14px] leading-[1.6] text-[#555555] hover:text-black transition-all duration-300 ease-out inline-block hover:translate-x-[2px]";

  const headingBase =
    "text-[12px] font-semibold uppercase tracking-[3px] text-[#111111] whitespace-nowrap";

  const openWhatsApp = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const url = isMobile
      ? `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${message}`
      : `https://web.whatsapp.com/send?phone=${whatsappNumber}&text=${message}`;

    window.location.href = url;
  };

  const handleContactSubmit = async (e) => {
  e.preventDefault();

  try {
    setLoading(true);

    await storefrontAPI.contact(form);

    toast.success("Message sent successfully!");

    setForm({
      name: "",
      email: "",
      subject: "",
      message: "",
    });

    setOpenContact(false);
  } catch (error) {
    console.error(error);

    toast.error(
      error?.response?.data?.message || "Failed to send message."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <footer className="border-t border-app transition-colors duration-300">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-10 lg:px-12 py-5">
        <div className="grid grid-cols-1 gap-5 md:gap-5 md:grid-cols-2 lg:grid-cols-4 justify-center md:items-start">
          {/* ================= About ================= */}

          <div className="flex flex-col justify-between items-start h-full">
            <h4 className={headingBase}>About {storeName}</h4>

            <p className="max-w-[340px] text-[14px] leading-2 text-[#555555] font-light">
              {description}
            </p>

            <div className="flex items-center gap-6">
              <a
                href={`tel:${supportPhone}`}
                aria-label="Call Us"
                className="text-[#555555] hover:text-orange-500 transition-all duration-300 hover:scale-110"
              >
                <Phone size={18} strokeWidth={1.7} />
              </a>

              <a
                href="#"
                aria-label="WhatsApp"
                onClick={(e) => {
                  e.preventDefault();
                  openWhatsApp();
                }}
                className="text-[#555555] hover:text-[#25D366] transition-all duration-300 hover:scale-110"
              >
                <FaWhatsapp size={19} />
              </a>

              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-[#555555] hover:text-[#1877F2] transition-all duration-300 hover:scale-110"
              >
                <Facebook size={18} strokeWidth={1.7} />
              </a>

              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-[#555555] hover:text-[#E1306C] transition-all duration-300 hover:scale-110"
              >
                <Instagram size={18} strokeWidth={1.7} />
              </a>
            </div>
          </div>

          {/* ================= Quick Links ================= */}

          <div className="flex flex-col items-start lg:items-center h-full mt-5 md:mt-0 gap-3">
            <h4 className={headingBase}>Quick Links</h4>

            <Link to="/" className={linkBase}>
              Home
            </Link>

            <Link to="/products" className={linkBase}>
              Shop
            </Link>

            <Link to="/about" className={linkBase}>
              About
            </Link>

            <Link to="/contact" className={linkBase}>
              Contact
            </Link>
          </div>

          {/* ================= Customer Care ================= */}

          <div className="flex flex-col items-start lg:items-center h-full mt-5 md:mt-5 lg:mt-0 gap-3">
            <h4 className={headingBase}>Customer Care</h4>

            <Link to="/shipping-policy" className={linkBase}>
              Shipping
            </Link>

            <Link to="/returns" className={linkBase}>
              Returns
            </Link>

            <Link to="/privacy-policy" className={linkBase}>
              Privacy Policy
            </Link>

            <Link to="/terms" className={linkBase}>
              Terms & Conditions
            </Link>
          </div>
          {/* ================= Contact ================= */}

          <div className="flex flex-col items-start lg:items-center h-full mt-5 md:mt-5 lg:mt-0 gap-3">
            <h4 className={headingBase}>Contact</h4>

            <a href={`mailto:${supportEmail}`} className={linkBase}>
              {supportEmail}
            </a>

            <button
              onClick={() => setOpenContact(true)}
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Contact Us
            </button>

            {/* <a href={`tel:${supportPhone}`} className={linkBase}>
              {supportPhone}
            </a> */}
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

        {/* Future Features */}
        <div className="flex items-center gap-6 text-[13px] text-[#777777]">
          {/* Payment Icons */}
          {/* Visa • MasterCard • UPI */}

          {/* Social Media */}

          {/* Newsletter */}

          {/* Trust Badges */}
        </div>
      </div>
    </footer>
  );
};

const StoreFooter = React.memo(StoreFooterComponent);

export default StoreFooter;
