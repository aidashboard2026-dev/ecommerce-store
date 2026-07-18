import React from "react";
import {
  Shield,
  ShoppingBag,
  CreditCard,
  Package,
  Palette,
  CheckCircle2,
} from "lucide-react";

const services = [
  "Custom Printed T-Shirts",
  "Hoodies",
  "Caps",
  "Printed Mugs",
  "Printed Glasses",
  "Tote Bags",
  "Photo Frames",
  "Corporate Gift Kits",
];

const highlights = [
  {
    icon: <ShoppingBag size={24} />,
    title: "Order Confirmation",
    desc: "Every order is confirmed before production begins.",
  },
  {
    icon: <Palette size={24} />,
    title: "Customization",
    desc: "Products are manufactured exactly according to your approved design.",
  },
  {
    icon: <CreditCard size={24} />,
    title: "Secure Payments",
    desc: "All payments are processed through secure payment methods.",
  },
  {
    icon: <Package size={24} />,
    title: "Quality Check",
    desc: "Every product is inspected before dispatch.",
  },
];

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-[#F6F6F4]">

      <div className="max-w-5xl mx-auto px-6">

        {/* Hero */}

        <section className="pt-16 pb-14 text-center">

          <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
            Terms & Conditions
          </p>

          <h1 className="mt-5 text-5xl font-light text-gray-900">
            Terms &
            <br />
            Conditions
          </h1>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-lg leading-8 text-gray-600">

            Welcome to <strong>MY DESIGNERS</strong>.

            <br /><br />

            By using our website or placing an order,
            you agree to the following Terms & Conditions.

          </p>

        </section>

        {/* Overview */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Terms Overview
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            These terms are designed to provide a fair,
            transparent and secure shopping experience
            for every customer.

          </p>

        </section>

        {/* Order Process */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Order Process
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Every order is confirmed before production.

            <br /><br />

            Customized products are manufactured only
            after your order and design have been approved.

          </p>

        </section>

        {/* Customer Responsibility */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Customer Responsibility
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Customers are responsible for ensuring that
            uploaded artwork, logos, photographs and text
            belong to them or are used with permission.

          </p>

        </section>

        {/* Intellectual Property */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Intellectual Property
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            MY DESIGNERS owns all website branding,
            layouts and original content.

            <br /><br />

            Customer-provided artwork always remains
            the property of the customer.

          </p>

        </section>

        {/* Production */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Production & Delivery
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Production and delivery timelines
            depend on customization,
            order quantity and courier operations.

          </p>

        </section>

            {/* Pricing */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Pricing & Payments
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Product prices may change without notice.

            <br /><br />

            Applicable taxes,
            customization charges and shipping fees
            are shown during checkout.

          </p>

        </section>

        {/* Liability */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Limitation of Liability
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            MY DESIGNERS is not responsible for
            courier delays,
            incorrect addresses,
            customer-approved design mistakes
            or copyright issues related to
            customer-provided artwork.

          </p>

        </section>

        {/* Cancellation */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Order Cancellation
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Orders may be cancelled before
            production begins.

            <br /><br />

            Once production starts,
            customized products cannot normally
            be cancelled.

          </p>

        </section>

        {/* Governing Law */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Governing Law
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            These Terms & Conditions
            are governed by the laws of India.

          </p>

        </section>

        {/* Contact */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Need Assistance?
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            If you have questions regarding these
            Terms & Conditions,
            please contact MY DESIGNERS.

          </p>

        </section>

        {/* Thank You */}

        <section className="py-14 border-t border-gray-200 text-center">

          <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
            MY DESIGNERS
          </p>

          <h2 className="mt-4 text-4xl font-light text-gray-900">

            Quality.
            <br />
            Creativity.
            <br />
            Trust.

          </h2>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-lg leading-8 text-gray-600">

            Thank you for choosing
            <strong> MY DESIGNERS.</strong>

            <br /><br />

            We are committed to providing
            premium customized products with
            transparency, quality and exceptional service.

          </p>

        </section>

      </div>

    </div>
  )}