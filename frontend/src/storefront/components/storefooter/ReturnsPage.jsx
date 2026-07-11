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

      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Hero */}

        <section className="py-28 text-center">

          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">
            Returns & Refund Policy
          </p>

          <h1 className="mt-6 text-5xl md:text-6xl font-light text-gray-900">

            Fair. Transparent.
            <br />
            Reliable.

          </h1>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-8"></div>

          <p className="max-w-3xl mx-auto text-lg leading-9 text-gray-600">

            We want every customer to shop with confidence.

            <br /><br />

            This policy explains when returns,
            replacements,
            and refunds are available for products
            purchased from MY DESIGNERS.

          </p>

        </section>

        {/* Return Eligibility */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">

            Return Eligibility

          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {eligibleReturns.map((item) => (

              <div
                key={item.title}
                className="bg-white rounded-3xl border border-gray-200 p-8 hover:shadow-lg transition duration-300"
              >

                <div className="text-gray-900 mb-6">
                  {item.icon}
                </div>

                <h3 className="text-xl font-semibold text-gray-900">

                  {item.title}

                </h3>

                <p className="mt-4 leading-8 text-gray-600">

                  {item.description}

                </p>

              </div>

            ))}

          </div>

        </section>

        {/* Non Returnable */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-10 lg:p-14">

            <h2 className="text-3xl font-semibold text-gray-900">

              Non-Returnable Products

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              Since most of our products are customized
              specifically for each customer,
              the following products are generally
              not eligible for return unless
              there is a manufacturing defect
              or an error from our side.

            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">

              {nonReturnable.map((item) => (

                <div
                  key={item}
                  className="border border-gray-200 rounded-2xl bg-[#FAFAF9] px-6 py-5"
                >

                  <p className="text-gray-700">

                    {item}

                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* Damaged Products */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-8">

            Damaged Products

          </h2>

          <div className="max-w-5xl">

            <p className="text-lg leading-9 text-gray-600">

              If your parcel arrives damaged,
              please contact our support team
              within <strong>48 hours</strong>
              after delivery.

              <br /><br />

              Please provide:

            </p>

          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-10">

            {[
              "Clear photos of the product",
              "Photos of the packaging",
              "Shipping label (if available)",
              "Your order information",
            ].map((item) => (

              <div
                key={item}
                className="bg-white rounded-2xl border border-gray-200 px-6 py-5"
              >

                <p className="text-gray-700">

                  {item}

                </p>

              </div>

            ))}

          </div>

        </section>

        {/* Replacement Policy */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-12">

            <h2 className="text-3xl font-semibold text-gray-900">

              Replacement Policy

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              Eligible replacement requests include:

              <br /><br />

              • Manufacturing defects

              <br />

              • Printing errors from our side

              <br />

              • Wrong product shipped

              <br />

              • Verified shipping damage

              <br /><br />

              Once approved,
              replacement products will be
              processed at no additional cost.

            </p>

          </div>

        </section>

                {/* Refund Policy */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-12">

            <h2 className="text-3xl font-semibold text-gray-900">
              Refund Policy
            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              Refunds are considered only when a replacement
              is not possible or when an order cannot be
              fulfilled due to verified circumstances.

              <br /><br />

              Approved refunds will be processed through the
              original payment method whenever applicable.

              <br /><br />

              Every refund request is carefully reviewed by
              our support team to ensure a fair and transparent
              resolution.

            </p>

          </div>

        </section>



        {/* Cancellation Policy */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-10">
            Cancellation Policy
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            <div className="bg-white rounded-3xl border border-gray-200 p-8">

              <h3 className="text-xl font-semibold text-gray-900">
                Before Production
              </h3>

              <p className="mt-4 leading-8 text-gray-600">

                Orders may be cancelled before production
                begins by contacting our support team.

              </p>

            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-8">

              <h3 className="text-xl font-semibold text-gray-900">
                After Production
              </h3>

              <p className="mt-4 leading-8 text-gray-600">

                Customized products cannot normally be
                cancelled once production has started,
                since every product is made specifically
                for the customer.

              </p>

            </div>

          </div>

        </section>



        {/* Quality Commitment */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-10">
            Quality Commitment
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

            {[
              "Production Inspection",
              "Print Quality Verification",
              "Packaging Inspection",
              "Final Dispatch Check",
            ].map((item) => (

              <div
                key={item}
                className="bg-white rounded-3xl border border-gray-200 p-8 text-center hover:shadow-lg transition"
              >

                <h3 className="text-lg font-semibold text-gray-900">
                  {item}
                </h3>

              </div>

            ))}

          </div>

        </section>



        {/* Return Process */}
{/* 
        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">
            Return Process
          </h2>

          <div className="grid md:grid-cols-5 gap-6">

            {[
              "Contact Support",
              "Share Photos",
              "Verification",
              "Approval",
              "Replacement / Refund",
            ].map((step, index) => (

              <div
                key={step}
                className="bg-white rounded-3xl border border-gray-200 p-8 text-center hover:shadow-lg transition"
              >

                <div className="text-3xl font-light text-gray-400 mb-4">
                  {index + 1}
                </div>

                <h3 className="font-semibold text-gray-900">
                  {step}
                </h3>

              </div>

            ))}

          </div>

        </section> */}



        {/* FAQ */}
{/* 
        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">

            {[
              {
                q: "Can I return customized products?",
                a: "Customized products are generally non-returnable unless there is a manufacturing defect or an error from our side.",
              },
              {
                q: "How many days do I have to report an issue?",
                a: "Please contact us within 48 hours after receiving your order.",
              },
              {
                q: "Who pays return shipping?",
                a: "If the issue occurred due to our mistake, we'll take responsibility for the approved replacement process.",
              },
              {
                q: "Can I exchange sizes?",
                a: "Size exchanges are available only if the incorrect size was sent due to our error.",
              },
            ].map((faq) => (

              <div
                key={faq.q}
                className="bg-white rounded-3xl border border-gray-200 p-8"
              >

                <h3 className="text-xl font-semibold text-gray-900">
                  {faq.q}
                </h3>

                <p className="mt-4 leading-8 text-gray-600">
                  {faq.a}
                </p>

              </div>

            ))}

          </div>

        </section> */}



        {/* Our Promise */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-8">
            Our Promise
          </h2>

          <div className="max-w-5xl">

            <p className="text-lg leading-9 text-gray-600">

              Every customized product is created with care,
              inspected for quality,
              and securely packed before shipping.

              <br /><br />

              If something goes wrong because of our mistake,
              we'll work quickly to provide a fair,
              transparent,
              and customer-friendly resolution.

            </p>

          </div>

        </section>



        {/* Bottom CTA */}

        <section className="py-28 border-t border-gray-200 text-center">

          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">
            MY DESIGNERS
          </p>

          <h2 className="mt-6 text-5xl font-light text-gray-900">

            Your Satisfaction
            <br />
            Comes First.

          </h2>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-10"></div>

          <p className="max-w-3xl mx-auto text-lg leading-9 text-gray-600">

            Thank you for choosing MY DESIGNERS.

            <br /><br />

            We are committed to delivering premium-quality
            customized products along with reliable service
            and a transparent customer experience.

          </p>

        </section>

      </div>

    </div>

  );

}