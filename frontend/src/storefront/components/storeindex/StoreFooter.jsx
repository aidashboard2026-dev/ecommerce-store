import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router-dom";
import {
  Phone,
  MessageCircle,
  Instagram,
  Zap,
} from "lucide-react";
import useStoreSettings from "@/shared/hooks/useStoreSettings";

export default function StoreFooter() {
  const { settings } = useStoreSettings();
  const logoUrl = settings?.logo;
  const storeName = settings?.store_name || "AuraStore";
  const supportEmail = settings?.support_email || "mydesigners303@gmail.com";
  const supportPhone = settings?.support_phone || "+91 8778021610";
  const whatsappNumber = "918778021610"; // + illa, spaces illa
  const message = encodeURIComponent(
    "Hello! I would like to know more about your products."
  );
  const instagramUrl = "https://instagram.com/my._.designers";
  const description =
    settings?.description ||
    "Curating premium, hand-crafted designer streetwear, high-performance athletic apparel, and timeless accessories.";

  const linkBase =
    "text-[14px] leading-[1.6] text-[#555555] hover:text-black transition-all duration-300 ease-out inline-block hover:translate-x-[2px]";

  const headingBase =
    "text-[12px] font-semibold uppercase tracking-[3px] text-[#111111] mb-8 whitespace-nowrap";

  const customProducts = [
    "Embroidery Design T-Shirt",
    "Gifts & Printing",
    "Glass",
    "Glass Ware",
    "Graphic Printed T-Shirt",
    "Jersey",
    "Magic Mug Print",
    "Metal Frames",
    "Mouse Pads",
    "Personal Gifts",
    "Photo Frames",
    "Skinny Tumblers",
    "Sublimation Products",
    "Water Bottles",
    "White Mug",
  ];

  const openWhatsApp = () => {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const url = isMobile
      ? `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${message}`
      : `https://web.whatsapp.com/send?phone=${whatsappNumber}&text=${message}`;

    window.location.href = url;
  };

  return (
    <footer className="bg-[#F6F6F4] border-t border-[#DDDDDD] transition-colors duration-300">
      {/* Main footer — single row, 6 equal columns */}
      <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-12 py-24 lg:py-24">
        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-[400px_140px_140px_160px_160px]
            gap-x-16
            gap-y-16
            items-start
          "
        >
          {/* Column 1 — About */}
          <div className="w-[430px]">
            {/* <Link
              to="/"
              className="flex items-center gap-3 group w-fit mb-2"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-9 w-9 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-white shrink-0">
                  <Zap size={14} strokeWidth={2.5} />
                </div>
              )}
              <span className="font-medium text-[17px] tracking-wide text-[#111111]">
                {logoUrl || settings?.store_name ? (
                  <span>{storeName}</span>
                ) : (
                  <>
                    Aura<span className="text-[#555555]">Store</span>
                  </>
                )}
              </span>
            </Link> */}
            <h4 className={headingBase}>About My Designers</h4>
       
            <p
            className="
            mt-7
            w-[340px]
            text-[15px]
            leading-9
            text-[#555555]
            font-light
            "
            >
              {description}
            </p>

            <div className="flex items-center gap-6 pt-3">

              {/* Phone */}
              <a
                href={`tel:${supportPhone}`}
                aria-label="Call Us"
                className="text-[#555555] hover:text-black transition-all duration-300 hover:scale-110"
              >
                <Phone size={18} strokeWidth={1.7} />
              </a>

              {/* WhatsApp */}
              

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openWhatsApp();
                }}
                aria-label="WhatsApp"
                className="text-[#555555] hover:text-[#25D366] transition-all duration-300 hover:scale-110"
              >
                <FaWhatsapp size={19} />
              </a>

              {/* Instagram */}
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

            <p className="text-[14px] text-[#555555] pt-6">
              © {new Date().getFullYear()} {storeName}
            </p>
          </div>

          {/* Column 2 — Useful Links */}
          <div className="ml-6">
            <h4 className={headingBase}>Useful Links</h4>
            <div className="flex flex-col gap-3.5">
              <Link to="/about" className={linkBase}>
                About Us
              </Link>
              <Link to="/contact" className={linkBase}>
                Contact
              </Link>
              <Link to="/faqs" className={linkBase}>
                FAQs
              </Link>
              <Link to="/login" className={linkBase}>
                Login
              </Link>
              <Link to="/register" className={linkBase}>
                Register
              </Link>
            </div>
          </div>

          {/* Column 3 — Main Products */}
          <div>
            <h4 className={headingBase}>Main Products</h4>
            <div className="flex flex-col gap-3.5">
              <Link to="/products?category=T-Shirt" className={linkBase}>
                T-Shirt
              </Link>
              <Link to="/products?category=Shirt" className={linkBase}>
                Shirt
              </Link>
              <Link to="/products?category=Trousers" className={linkBase}>
                Trousers
              </Link>
              <Link to="/products?category=Track+Pants" className={linkBase}>
                Track Pants
              </Link>
              <Link to="/products?category=Jersey" className={linkBase}>
                Jersey
              </Link>
            </div>
          </div>

          {/* Column 4 — Custom Products */}
            <div>
              <h4 className={headingBase}>Custom Products</h4>
              <div className="flex flex-col gap-3.5">
                {customProducts.map((item) => (
                  <Link
                    key={item}
                    to={`/products?category=${encodeURIComponent(item)}`}
                    className={linkBase}
                  >
                    {item}
                  </Link>
                ))}
            </div>
          </div>

          {/* Column 5 — Store Policies */}
          <div>
            <h4 className={headingBase}>Store Policies</h4>
            <div className="flex flex-col gap-3.5">
              <Link to="/tracking" className={linkBase}>
                Create Return | Exchange
              </Link>
              <Link to="/profile/orders" className={linkBase}>
                Return Policy
              </Link>
              <a href={`mailto:${supportEmail}`} className={linkBase}>
                Shipping Policy
              </a>
              <Link to="/support/privacy" className={linkBase}>
                Privacy Policy
              </Link>
              <Link to="/support/terms" className={linkBase}>
                Terms of Service
              </Link>
              <span className="text-[14px] leading-[1.6] text-[#555555] pt-1">
                Phone: {supportPhone}
              </span>
            </div>
          </div>

         
        </div>
      </div>

      
    </footer>
  );
}