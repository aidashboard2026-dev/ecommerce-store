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

    <div className="max-w-5xl mx-auto px-6">

      {/* Hero */}

      <section className="pt-16 pb-14 text-center">

        <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
          Privacy Policy
        </p>

        <h1 className="mt-5 text-5xl font-light text-gray-900">
          Your Privacy.
          <br />
          Our Responsibility.
        </h1>

        <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

        <p className="max-w-3xl mx-auto text-lg leading-8 text-gray-600">
          At <strong>MY DESIGNERS</strong>, protecting your privacy is one of
          our highest priorities.

          <br /><br />

          This Privacy Policy explains how we collect,
          use, protect and manage your information.
        </p>

      </section>

      {/* Information We Collect */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Information We Collect
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          We may collect your personal information,
          shipping details, order information,
          uploaded designs and payment details
          necessary to complete your order.

        </p>

      </section>

      {/* How We Use Information */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          How We Use Your Information
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          Your information helps us process orders,
          manufacture customized products,
          provide customer support,
          improve our services and comply with legal requirements.

        </p>

      </section>

      {/* Your Designs */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Your Designs
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          Logos, artwork and other files uploaded
          by you remain your property.

          <br /><br />

          They are used only to produce
          your customized products and are never
          sold or used without permission.

        </p>

      </section>

      {/* Payment Security */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Payment Security
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          Payments are processed securely
          through trusted payment providers.

          <br /><br />

          MY DESIGNERS never stores complete
          card or banking credentials.

        </p>

      </section>

      {/* Sharing Information */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Sharing Information
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          We never sell or trade your personal data.

          <br /><br />

          Information is shared only when necessary
          with courier partners,
          payment providers or
          when legally required.

        </p>

      </section>

      {/* Cookies */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Cookies
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          Cookies help improve your browsing experience,
          remember preferences and enhance website performance.

        </p>

      </section>

          {/* Data Security */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Data Security
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          We use appropriate security practices
          to protect your personal information
          against unauthorized access,
          misuse or disclosure.

        </p>

      </section>

      {/* Your Rights */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Your Rights
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          You may request access,
          correction or deletion of
          eligible personal information
          by contacting our support team.

        </p>

      </section>

      {/* Third Party */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Third-Party Services
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          We work with trusted providers
          for payments,
          shipping and essential business services.

        </p>

      </section>

      {/* Policy Updates */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Policy Updates
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          This Privacy Policy may be updated
          whenever required.

          <br /><br />

          The latest version will always
          be available on this page.

        </p>

      </section>

      {/* Contact */}

      <section className="py-10 border-t border-gray-200">

        <h2 className="text-3xl font-semibold mb-6">
          Contact Us
        </h2>

        <p className="text-lg leading-8 text-gray-600">

          Email:
          support@mydesigners.in

          <br /><br />

          Phone:
          +91 XXXXX XXXXX

          <br /><br />

          Dharmapuri,
          Tamil Nadu,
          India

        </p>

      </section>

      {/* Thank You */}

      <section className="py-14 border-t border-gray-200 text-center">

        <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
          MY DESIGNERS
        </p>

        <h2 className="mt-4 text-4xl font-light text-gray-900">
          Your Trust.
          <br />
          Our Commitment.
        </h2>

        <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

        <p className="max-w-3xl mx-auto text-lg leading-8 text-gray-600">

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