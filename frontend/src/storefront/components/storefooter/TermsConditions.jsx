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

      {/* Hero */}

      <section className="border-b border-gray-200">

        <div className="max-w-5xl mx-auto px-6 py-20 text-center">

          <p className="uppercase tracking-[0.35em] text-xs text-gray-500">
            TERMS & CONDITIONS
          </p>

          <h1 className="mt-6 text-5xl md:text-7xl font-light text-gray-900 leading-none">

            Terms &
            <br />
            Conditions

          </h1>

          <p className="mt-10 max-w-3xl mx-auto text-lg leading-9 text-gray-600">

            Welcome to <strong>MY DESIGNERS</strong>.

            By using our website or placing an order,
            you agree to these Terms & Conditions.

            These terms are designed to ensure a fair,
            transparent,
            and secure experience for every customer.

          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">

            <span className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm">

              Last Updated • July 2026

            </span>

            <span className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm">

              MY DESIGNERS

            </span>

          </div>

        </div>

      </section>

      <div className="max-w-6xl mx-auto px-6">

        {/* Quick Overview */}

        <section className="py-14">

          <div className="grid md:grid-cols-3 gap-6">

            <div className="bg-white rounded-3xl p-8 border border-gray-200">

              <h3 className="font-semibold text-lg text-gray-900">

                Fair Policies

              </h3>

              <p className="mt-4 text-gray-600 leading-8">

                Clear terms designed to protect both
                customers and MY DESIGNERS.

              </p>

            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-200">

              <h3 className="font-semibold text-lg text-gray-900">

                Secure Shopping

              </h3>

              <p className="mt-4 text-gray-600 leading-8">

                Safe ordering,
                secure payments,
                and transparent communication.

              </p>

            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-200">

              <h3 className="font-semibold text-lg text-gray-900">

                Customer First

              </h3>

              <p className="mt-4 text-gray-600 leading-8">

                We aim to provide premium quality
                with excellent customer service.

              </p>

            </div>

          </div>

        </section>

        {/* Products & Services */}

        <section className="py-14 border-t border-gray-200">

          <div className="grid lg:grid-cols-2 gap-16">

            <div>

              <p className="uppercase text-xs tracking-[0.3em] text-gray-500">

                Products

              </p>

              <h2 className="mt-4 text-3xl font-semibold text-gray-900">

                What We Offer

              </h2>

              <p className="mt-6 leading-9 text-gray-600">

                MY DESIGNERS specializes in premium
                personalized printing and custom merchandise
                for individuals,
                businesses,
                educational institutions,
                and organizations.

              </p>

            </div>

            <div className="grid grid-cols-2 gap-4">

              {services.map((item) => (

                <div
                  key={item}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-4"
                >

                  <CheckCircle2
                    size={18}
                    className="text-green-600"
                  />

                  <span className="text-gray-700">

                    {item}

                  </span>

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* Order Process */}

        <section className="py-14 border-t border-gray-200">

          <p className="uppercase text-xs tracking-[0.3em] text-gray-500">

            Order Process

          </p>

          <h2 className="mt-4 text-3xl font-semibold text-gray-900">

            How Orders Work

          </h2>

          <div className="grid md:grid-cols-2 gap-6 mt-10">

            {highlights.map((item) => (

              <div
                key={item.title}
                className="bg-white rounded-3xl border border-gray-200 p-8 hover:shadow-lg transition"
              >

                <div className="mb-5">

                  {item.icon}

                </div>

                <h3 className="text-xl font-semibold text-gray-900">

                  {item.title}

                </h3>

                <p className="mt-4 text-gray-600 leading-8">

                  {item.desc}

                </p>

              </div>

            ))}

          </div>

        </section>

        {/* Customer Responsibility */}

        <section className="py-14 border-t border-gray-200">

          <div className="bg-white rounded-[32px] border border-gray-200 p-10">

            <div className="flex items-center gap-4">

              <Shield size={28} />

              <h2 className="text-3xl font-semibold text-gray-900">

                Customer Responsibility

              </h2>

            </div>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              Customers are responsible for ensuring
              that all uploaded artwork,
              logos,
              images,
              photographs,
              and text are legally owned by them
              or used with proper authorization.

              <br /><br />

              MY DESIGNERS does not verify copyright
              ownership of customer-provided designs.

              By placing an order,
              customers accept responsibility
              for the content submitted for printing.

            </p>

          </div>

        </section>

                {/* Intellectual Property */}

        <section className="py-14 border-t border-gray-200">

          <div className="grid lg:grid-cols-2 gap-16">

            <div>

              <p className="uppercase text-xs tracking-[0.3em] text-gray-500">
                Ownership
              </p>

              <h2 className="mt-4 text-3xl font-semibold text-gray-900">
                Intellectual Property
              </h2>

              <p className="mt-6 text-gray-600 leading-9">

                All branding, website content, graphics,
                logos, layouts, and original creative
                materials displayed on this website are the
                intellectual property of MY DESIGNERS.

                <br /><br />

                Customer-provided artwork always remains
                the property of the respective customer.

              </p>

            </div>

            <div className="bg-white rounded-[32px] border border-gray-200 p-10">

              <h3 className="text-xl font-semibold text-gray-900">

                Respecting Creative Ownership

              </h3>

              <p className="mt-6 text-gray-600 leading-8">

                Customers must ensure that uploaded
                designs, logos, photographs, and artwork
                do not violate copyright, trademark,
                or other intellectual property rights.

              </p>

            </div>

          </div>

        </section>



        {/* Production & Delivery */}

        <section className="py-14 border-t border-gray-200">

          <p className="uppercase text-xs tracking-[0.3em] text-gray-500">
            Delivery
          </p>

          <h2 className="mt-4 text-3xl font-semibold text-gray-900">

            Production & Shipping

          </h2>

          <div className="grid md:grid-cols-4 gap-6 mt-12">

            {[
              "Order Confirmation",
              "Design Approval",
              "Production",
              "Quality Check & Shipping",
            ].map((step, index) => (

              <div
                key={step}
                className="bg-white border border-gray-200 rounded-3xl p-8 text-center"
              >

                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mx-auto text-lg font-bold">

                  {index + 1}

                </div>

                <h3 className="mt-6 font-semibold text-gray-900">

                  {step}

                </h3>

              </div>

            ))}

          </div>

          <p className="mt-10 text-gray-600 leading-9">

            Production and delivery timelines may vary
            depending on order quantity,
            customization requirements,
            and courier operations.

          </p>

        </section>



        {/* Pricing */}

        <section className="py-14 border-t border-gray-200">

          <div className="bg-white rounded-[32px] border border-gray-200 p-10">

            <h2 className="text-3xl font-semibold text-gray-900">

              Pricing & Payments

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              Product prices displayed on the website
              may change without prior notice.

              <br /><br />

              Applicable taxes,
              customization charges,
              and shipping fees (if applicable)
              will be shown during checkout.

              <br /><br />

              Payments are processed using secure
              payment methods.

            </p>

          </div>

        </section>



        {/* Limitation */}

        <section className="py-14 border-t border-gray-200">

          <p className="uppercase text-xs tracking-[0.3em] text-gray-500">

            Responsibility

          </p>

          <h2 className="mt-4 text-3xl font-semibold text-gray-900">

            Limitation of Liability

          </h2>

          <div className="grid md:grid-cols-2 gap-5 mt-10">

            {[
              "Courier delays beyond our control.",
              "Incorrect address provided by customers.",
              "Customer-approved spelling or design mistakes.",
              "Delays due to festivals or natural events.",
              "Improper use of products after delivery.",
              "Copyright issues related to customer-provided artwork.",
            ].map((item) => (

              <div
                key={item}
                className="bg-white border border-gray-200 rounded-2xl px-6 py-5"
              >

                <p className="text-gray-700 leading-8">

                  {item}

                </p>

              </div>

            ))}

          </div>

        </section>



        {/* Cancellation */}

        <section className="py-14 border-t border-gray-200">

          <div className="bg-white rounded-[32px] border border-gray-200 p-10">

            <h2 className="text-3xl font-semibold text-gray-900">

              Order Cancellation

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              Orders may be cancelled before
              production begins.

              <br /><br />

              Once customization or printing has started,
              cancellation may not be possible because
              products are manufactured specifically
              for the customer.

            </p>

          </div>

        </section>



        {/* Governing Law */}

        <section className="py-14 border-t border-gray-200">

          <div className="bg-white rounded-[32px] border border-gray-200 p-10">

            <h2 className="text-3xl font-semibold text-gray-900">

              Governing Law

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              These Terms & Conditions are governed
              by the laws of India.

              Any disputes arising from the use of this
              website or our services shall be subject
              to the jurisdiction of the competent
              courts in India.

            </p>

          </div>

        </section>



        {/* Contact */}

        <section className="py-14 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900">

            Need Assistance?

          </h2>

          <p className="mt-6 max-w-3xl text-lg leading-9 text-gray-600">

            If you have any questions regarding these
            Terms & Conditions, feel free to contact
            MY DESIGNERS. Our team will be happy to
            assist you.

          </p>

        </section>



        {/* Bottom CTA */}

        <section className="py-20 text-center border-t border-gray-200">

          <p className="uppercase tracking-[0.35em] text-xs text-gray-500">

            MY DESIGNERS

          </p>

          <h2 className="mt-6 text-5xl font-light text-gray-900">

            Quality.
            <br />
            Creativity.
            <br />
            Trust.

          </h2>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-10"></div>

          <p className="max-w-2xl mx-auto text-gray-600 leading-9">

            Thank you for choosing MY DESIGNERS.

            We are committed to delivering premium
            customized products with transparency,
            quality craftsmanship,
            and exceptional customer service.

          </p>

        </section>

      </div>

    </div>

  );

}