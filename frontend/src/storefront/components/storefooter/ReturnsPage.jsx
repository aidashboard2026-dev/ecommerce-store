import React from "react";
import {
  RotateCcw,
  ShieldCheck,
  Package,
  AlertTriangle,
} from "lucide-react";

const eligibleReturns = [
  {
    icon: <ShieldCheck size={28} />,
    title: "Damaged Product",
    description:
      "Products that arrive damaged during shipping are eligible for review and replacement.",
  },
  {
    icon: <Package size={28} />,
    title: "Wrong Product",
    description:
      "If you receive a different product than what you ordered, we'll make it right.",
  },
  {
    icon: <RotateCcw size={28} />,
    title: "Manufacturing Defect",
    description:
      "Products with verified manufacturing defects qualify for replacement after inspection.",
  },
  {
    icon: <AlertTriangle size={28} />,
    title: "Printing Error",
    description:
      "If the final product differs from the approved design due to our mistake, we'll resolve it promptly.",
  },
];

const nonReturnable = [
  "Custom Printed T-Shirts",
  "Embroidered Apparel",
  "Printed Mugs",
  "Printed Glasses",
  "Personalized Gifts",
  "Corporate Gift Kits",
  "Bulk Orders Made to Customer Specifications",
];

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-[#F6F6F4]">

      <div className="max-w-5xl mx-auto px-6">

        {/* Hero */}

        <section className="pt-16 pb-14 text-center">

          <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
            Returns
          </p>

          <h1 className="mt-5 text-5xl font-light text-gray-900">
            Fair.
            <br />
            Transparent.
            <br />
            Reliable.
          </h1>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-lg leading-8 text-gray-600">

            We want every customer to shop with confidence.

            <br /><br />

            This policy explains when returns,
            replacements and refunds are available
            for products purchased from MY DESIGNERS.

          </p>

        </section>

        {/* Return Eligibility */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Return Eligibility
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Returns are accepted only when products
            arrive damaged, contain manufacturing defects,
            printing mistakes from our side,
            or when an incorrect product has been delivered.

            <br /><br />

            Every request is carefully reviewed before
            approval to ensure a fair process.

          </p>

        </section>

        {/* Non Returnable */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Non-Returnable Products
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Since most of our products are customized,
            they cannot normally be returned once production
            has started unless the issue is caused by us.

          </p>

          <div className="mt-8 space-y-3">

            {nonReturnable.map(item => (

              <div
                key={item}
                className="border-b border-gray-200 pb-3"
              >
                {item}
              </div>

            ))}

          </div>

        </section>

        {/* Damaged Products */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Damaged Products
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Please report damaged products within
            <strong> 48 hours </strong>
            after delivery.

          </p>

          <div className="mt-8 space-y-3">

            {[
              "Clear photos of the product",
              "Photos of the package",
              "Shipping label (if available)",
              "Order information",
            ].map(item => (

              <div
                key={item}
                className="border-b border-gray-200 pb-3"
              >
                {item}
              </div>

            ))}

          </div>

        </section>

            {/* Replacement Policy */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Replacement Policy
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Replacement requests are approved for:

            <br /><br />

            • Manufacturing defects

            <br />

            • Printing mistakes from our side

            <br />

            • Wrong product delivered

            <br />

            • Verified shipping damage

            <br /><br />

            Once approved,
            replacement products are shipped
            without additional charges.

          </p>

        </section>

        {/* Refund */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Refund Policy
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Refunds are processed only when
            replacement is not possible.

            <br /><br />

            Approved refunds will be issued
            through the original payment method.

          </p>

        </section>

        {/* Cancellation */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Cancellation Policy
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Orders may be cancelled before production begins.

            <br /><br />

            Once production starts,
            customized products normally
            cannot be cancelled.

          </p>

        </section>

        {/* Promise */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-6">
            Our Promise
          </h2>

          <p className="text-lg leading-8 text-gray-600">

            Every customized product is carefully
            inspected before dispatch.

            <br /><br />

            If any issue occurs because of our mistake,
            we will provide a fair and transparent solution.

          </p>

        </section>

        {/* Thank You */}

        <section className="py-14 border-t border-gray-200 text-center">

          <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
            MY DESIGNERS
          </p>

          <h2 className="mt-4 text-4xl font-light text-gray-900">

            Customer Satisfaction
            <br />
            Comes First

          </h2>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-lg leading-8 text-gray-600">

            Thank you for choosing
            <strong> MY DESIGNERS.</strong>

            <br /><br />

            We are committed to providing
            premium products together with
            reliable service and transparent support.

          </p>

        </section>

      </div>

    </div>
  )}


          