import React, { useState } from "react";
import { storefrontAPI } from "@/shared/services/api";
import { toast } from "react-hot-toast";
import { FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Phone, Instagram, Facebook, Mail } from "lucide-react";
import useStoreSettings from "@/shared/hooks/useStoreSettings";
import ContactModal from "../storefooter/ContactModal";
import { Section, ContentWrapper } from "@/shared/components/layout";

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

  const rawPhone = settings?.support_phone || "";
  const supportPhone = rawPhone
    ? rawPhone.startsWith("+91")
      ? rawPhone
      : rawPhone.startsWith("91") && rawPhone.replace(/\D/g, "").length === 12
        ? `+${rawPhone.replace(/\D/g, "")}`
        : `+91${rawPhone.replace(/\D/g, "")}`
    : "";

  const displayPhone = supportPhone
    ? `${supportPhone.slice(0, 3)} ${supportPhone.slice(3)}`
    : "";

  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL || "";
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || "";
  const rawWaPhone =
    settings?.support_phone || import.meta.env.VITE_WHATSAPP_NUMBER || "";
  const cleanWaNumber = rawWaPhone.replace(/\D/g, "");
  const whatsappNumber =
    cleanWaNumber.length === 10 ? `91${cleanWaNumber}` : cleanWaNumber;

  const waMessage = encodeURIComponent(
    "Hello! I would like to know more about your products.",
  );

  const description = settings?.description || "";

  const linkBase =
    "inline-block text-[14px] leading-[1.6] text-muted transition-all duration-300 ease-out hover:translate-x-[2px] hover:text-app";

  const headingBase =
    "text-[12px] font-semibold uppercase tracking-[3px] text-app";

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
    <Section spacing="md" className="bg-green-400">
      <footer className="mt-12 border-t border-app transition-colors duration-300 lg:mt-16">
        <ContentWrapper className="py-8 sm:py-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            <div className="flex h-full flex-col items-start justify-between gap-5">
              <div className="space-y-3">
                <h4 className={headingBase}>About {storeName}</h4>

                {description && (
                  <p className="max-w-sm whitespace-pre-line text-[13px] font-light leading-[1.6] text-muted">
                    {description}
                  </p>
                )}

                {/* {settings?.store_location && (
                <div className="max-w-sm border-t border-app pt-3 text-[13px] font-light leading-[1.5] text-muted">
                  <h4 className={headingBase}>Our Store Location</h4>
                  <p className="mt-2 whitespace-pre-line">
                    {settings.store_location}
                  </p>
                </div>
              )} */}
              </div>

              <div className="flex items-center gap-5">
                <a
                  href={supportEmail ? `mailto:${supportEmail}` : "#"}
                  aria-label="Email Us"
                  className="text-muted transition-all duration-300 hover:scale-110 hover:text-indigo-500"
                >
                  <Mail size={18} strokeWidth={1.7} />
                </a>

                <a
                  href={supportPhone ? `tel:${supportPhone}` : "#"}
                  aria-label="Call Us"
                  className="text-muted transition-all duration-300 hover:scale-110 hover:text-orange-500"
                >
                  <Phone size={18} strokeWidth={1.7} />
                </a>

                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="text-muted transition-all duration-300 hover:scale-110 hover:text-[#25D366]"
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
                    className="text-muted transition-all duration-300 hover:scale-110 hover:text-[#1877F2]"
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
                    className="text-muted transition-all duration-300 hover:scale-110 hover:text-[#E1306C]"
                  >
                    <Instagram size={18} strokeWidth={1.7} />
                  </a>
                )}
              </div>
            </div>

            <div className="flex h-full flex-col items-start gap-3">
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

            <div className="flex h-full flex-col items-start gap-3">
              <h4 className={headingBase}>Customer Care</h4>
              <Link to="/shipping" className={linkBase}>
                Shipping
              </Link>
              <Link to="/returns" className={linkBase}>
                Returns
              </Link>
              <Link to="/privacy-policy" className={linkBase}>
                Privacy Policy
              </Link>
              <Link to="/terms-conditions" className={linkBase}>
                Terms & Conditions
              </Link>
            </div>

            <div className="flex h-full flex-col items-start gap-3 lg:justify-between">
              <h4 className={headingBase}>Contact</h4>

              {supportEmail && (
                <a href={`mailto:${supportEmail}`} className={linkBase}>
                  {supportEmail}
                </a>
              )}

              {displayPhone && (
                <>
                  {/* <h4 className={headingBase}>Call</h4> */}
                  <a href={`tel:${supportPhone}`} className={linkBase}>
                    {displayPhone}
                  </a>
                </>
              )}

              <button
                onClick={() => setOpenContact(true)}
                className="focus-ring rounded-md bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Contact Us
              </button>
            </div>
          </div>
        </ContentWrapper>

        <div className="mx-auto flex w-full items-center justify-center border-t border-app/70 p-5 text-center">
          <p className="text-[12px] text-muted md:text-[14px]">
            &copy; {new Date().getFullYear()} {storeName}. All Rights Reserved.
          </p>
        </div>

        <ContactModal
          open={openContact}
          onClose={() => setOpenContact(false)}
          form={form}
          setForm={setForm}
          loading={loading}
          onSubmit={handleContactSubmit}
        />
      </footer>
    </Section>
  );
};

const StoreFooter = React.memo(StoreFooterComponent);

export default StoreFooter;
