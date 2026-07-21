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

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">

        {/* Hero */}

        <section className="pt-14 sm:pt-16 pb-12 sm:pb-14 text-center">

          <p className="uppercase tracking-[0.3em] text-xs sm:text-sm text-gray-500">
            Returns
          </p>

          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-light leading-tight text-gray-900">

            Fair.
            <br />
            Transparent.
            <br />
            Reliable.

          </h1>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-base sm:text-lg leading-8 text-gray-600">

            We want every customer to shop with confidence.

            <br /><br />

            This policy explains when returns,
            replacements and refunds are available
            for products purchased from
            <strong> MY DESIGNERS.</strong>

          </p>

        </section>

        {/* Return Eligibility */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Return Eligibility

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Returns are accepted only when products
            arrive damaged,
            contain manufacturing defects,
            printing mistakes from our side
            or an incorrect product has been delivered.

            <br /><br />

            Every request is carefully reviewed
            before approval.

          </p>

        </section>

        {/* Non Returnable */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Non-Returnable Products

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Customized products normally cannot
            be returned after production begins
            unless the issue is caused by us.

          </p>

          <div className="mt-6 space-y-2">

            {nonReturnable.map(item => (

              <div
                key={item}
                className="border-b border-gray-200 pb-3 text-gray-700"
              >
                {item}
              </div>

            ))}

          </div>

        </section>

        {/* Damaged */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Damaged Products

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Please report damaged products
            within <strong>48 hours</strong>
            after delivery.

          </p>

          <div className="mt-6 space-y-2">

            {[
              "Clear photos of the product",
              "Photos of the package",
              "Shipping label (if available)",
              "Order information",
            ].map(item => (

              <div
                key={item}
                className="border-b border-gray-200 pb-3 text-gray-700"
              >
                {item}
              </div>

            ))}

          </div>

        </section>

            {/* Replacement */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Replacement Policy

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

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
            at no additional cost.

          </p>

        </section>

        {/* Refund */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Refund Policy

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Refunds are processed only when
            replacement is not possible.

            <br /><br />

            Approved refunds will be issued
            through the original payment method.

          </p>

        </section>

        {/* Cancellation */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Cancellation Policy

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Orders may be cancelled
            before production begins.

            <br /><br />

            Once production starts,
            customized products normally
            cannot be cancelled.

          </p>

        </section>

        {/* Promise */}

        <section className="py-8 sm:py-10 border-t border-gray-200">

          <h2 className="text-2xl sm:text-3xl font-semibold mb-5">

            Our Promise

          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">

            Every customized product
            is carefully inspected before dispatch.

            <br /><br />

            If an issue occurs because of our mistake,
            we will provide a fair,
            transparent and customer-friendly solution.

          </p>

        </section>

        {/* Thank You */}

        <section className="py-14 border-t border-gray-200 text-center">

          <p className="uppercase tracking-[0.3em] text-xs sm:text-sm text-gray-500">

            MY DESIGNERS

          </p>

          <h2 className="mt-4 text-3xl sm:text-4xl font-light leading-tight text-gray-900">

            Customer Satisfaction
            <br />
            Comes First

          </h2>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-base sm:text-lg leading-8 text-gray-600">

            Thank you for choosing
            <strong> MY DESIGNERS.</strong>

            <br /><br />

            We are committed to providing
            premium products,
            reliable service and
            transparent customer support.

          </p>

        </section>

      </div>

    </div>
  )}