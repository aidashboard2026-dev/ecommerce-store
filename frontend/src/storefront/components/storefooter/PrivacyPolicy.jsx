import React from "react";
import {
  Shield,
  User,
  Database,
  CreditCard,
  FileImage,
  Share2,
} from "lucide-react";

const collectedInfo = [
  {
    icon: <User size={28} />,
    title: "Personal Information",
    description:
      "Name, email address, phone number, shipping address, and billing information provided during purchases.",
  },
  {
    icon: <Database size={28} />,
    title: "Order Information",
    description:
      "Products ordered, customization details, order history, and delivery preferences.",
  },
  {
    icon: <FileImage size={28} />,
    title: "Uploaded Designs",
    description:
      "Logos, artwork, images, and files shared for customized printing are used only to complete your order.",
  },
  {
    icon: <CreditCard size={28} />,
    title: "Payment Information",
    description:
      "Payments are securely processed through trusted payment providers. We do not store complete card details.",
  },
];

const usage = [
  "Process and confirm your orders",
  "Customize products according to your request",
  "Deliver products safely",
  "Provide customer support",
  "Send order updates and notifications",
  "Improve our products and services",
  "Prevent fraud and unauthorized activities",
  "Comply with applicable legal requirements",
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F6F6F4]">

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">

        {/* Hero */}

        <section className="pt-14 sm:pt-16 pb-12 sm:pb-14 text-center">

          <p className="uppercase tracking-[0.3em] text-xs sm:text-sm text-gray-500">
            Privacy Policy
          </p>

          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-light leading-tight text-gray-900">

            Your Privacy.
            <br />
            Our Responsibility.

          </h1>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-base sm:text-lg leading-8 text-gray-600">

            At <strong>MY DESIGNERS</strong>,
            protecting your privacy is one of our highest priorities.

            <br /><br />

            This Privacy Policy explains how we collect,
            use, protect and manage your information.

          </p>

        </section>

        {/* Information */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Information We Collect

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            We may collect your personal information,
            shipping details,
            order information,
            uploaded designs and payment details
            necessary to complete your order.

          </p>

        </section>

        {/* Usage */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            How We Use Your Information

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Your information helps us process orders,
            manufacture customized products,
            provide customer support,
            improve our services and comply with legal requirements.

          </p>

        </section>

        {/* Designs */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Your Designs

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Logos,
            artwork and uploaded files remain your property.

            <br /><br />

            They are used only to produce your customized products.

          </p>

        </section>

        {/* Payment */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Payment Security

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Payments are securely processed through trusted providers.

            <br /><br />

            MY DESIGNERS never stores complete
            card or banking credentials.

          </p>

        </section>

        {/* Sharing */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Sharing Information

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            We never sell or trade your personal data.

            <br /><br />

            Information is shared only when necessary
            with courier partners,
            payment providers or when legally required.

          </p>

        </section>

        {/* Cookies */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Cookies

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Cookies improve browsing,
            remember preferences
            and enhance website performance.

          </p>

        </section>

            {/* Data Security */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Data Security

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            We use appropriate security practices
            to protect your information against
            unauthorized access,
            misuse or disclosure.

          </p>

        </section>

        {/* Rights */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Your Rights

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            You may request access,
            correction or deletion of
            eligible personal information.

          </p>

        </section>

        {/* Third Party */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Third-Party Services

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            We work with trusted partners
            for payments,
            shipping and essential services.

          </p>

        </section>

        {/* Updates */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Policy Updates

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            This Privacy Policy may be updated
            whenever required.

            <br /><br />

            The latest version will always
            be available on this page.

          </p>

        </section>

        {/* Contact */}

       

        {/* Thank You */}

        <section className="py-14 text-center border-t border-gray-200">

          <p className="uppercase tracking-[0.3em] text-xs sm:text-sm text-gray-500">

            MY DESIGNERS

          </p>

          <h2 className="mt-4 text-3xl sm:text-4xl font-light leading-tight text-gray-900">

            Your Trust.
            <br />
            Our Commitment.

          </h2>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-base sm:text-lg leading-8 text-gray-600">

            Thank you for trusting
            <strong> MY DESIGNERS.</strong>

            <br /><br />

            We remain committed to protecting
            your information with transparency,
            responsibility and care.

          </p>

        </section>

      </div>

    </div>
  )}