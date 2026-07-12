import React from "react";
import {
  Package,
  Truck,
  MapPinned,
  Clock,
  ShieldCheck,
} from "lucide-react";

const processSteps = [
  {
    icon: <Package size={28} />,
    title: "Order Confirmation",
    description:
      "Every order is carefully reviewed and confirmed before production begins.",
  },
  {
    icon: <ShieldCheck size={28} />,
    title: "Production",
    description:
      "Your customized products are manufactured using premium materials and modern printing techniques.",
  },
  {
    icon: <Package size={28} />,
    title: "Quality Inspection",
    description:
      "Each product undergoes a detailed quality check before packaging.",
  },
  {
    icon: <Truck size={28} />,
    title: "Dispatch",
    description:
      "Orders are securely packed and handed over to our trusted delivery partners.",
  },
];

const timeline = [
  {
    title: "Order Confirmation",
    value: "Within 24 Hours",
  },
  {
    title: "Production",
    value: "2 – 5 Business Days",
  },
  {
    title: "Shipping",
    value: "2 – 4 Business Days",
  },
  {
    title: "Delivery",
    value: "Based on Location",
  },
];

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-[#F6F6F4]">

      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Hero */}

        <section className="py-28 text-center">

          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">
            Shipping Information
          </p>

          <h1 className="mt-6 text-5xl md:text-6xl font-light text-gray-900">

            Fast. Secure.
            <br />
            Reliable.

          </h1>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-8"></div>

          <p className="max-w-3xl mx-auto text-lg leading-9 text-gray-600">

            Every customized product is carefully packed,
            professionally handled,
            and delivered with the attention it deserves.

          </p>

        </section>

        {/* Shipping Overview */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-8">

            Shipping Overview

          </h2>

          <div className="max-w-5xl">

            <p className="text-lg leading-9 text-gray-600">

              At <strong>MY DESIGNERS</strong>,
              every order is handled with precision from
              production to final delivery.

              <br /><br />

              We carefully inspect every customized product,
              package it securely,
              and prepare it for safe transportation.

              <br /><br />

              Whether you're ordering a personalized gift
              or a bulk corporate order,
              we follow the same commitment to quality,
              packaging,
              and customer satisfaction.

            </p>

          </div>

        </section>

        {/* Order Processing */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">

            Order Processing

          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {processSteps.map((step) => (

              <div
                key={step.title}
                className="bg-white rounded-3xl border border-gray-200 p-8 hover:shadow-lg transition duration-300"
              >

                <div className="text-gray-900 mb-6">
                  {step.icon}
                </div>

                <h3 className="text-xl font-semibold text-gray-900">

                  {step.title}

                </h3>

                <p className="mt-4 leading-8 text-gray-600">

                  {step.description}

                </p>

              </div>

            ))}

          </div>

        </section>

        {/* Shipping Coverage */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white border border-gray-200 rounded-3xl p-10 lg:p-14">

            <div className="flex items-center gap-4">

              <MapPinned size={34} />

              <h2 className="text-3xl font-semibold text-gray-900">

                Shipping Coverage

              </h2>

            </div>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              We proudly deliver customized products
              across <strong>Tamil Nadu</strong>.

              <br /><br />

              Whether you're ordering for personal use,
              business branding,
              educational institutions,
              or corporate events,
              every shipment is packed with care
              and delivered securely.

              <br /><br />

              Our goal is to ensure every customer
              receives their order safely
              and in excellent condition.

            </p>

          </div>

        </section>

        {/* Delivery Timeline */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">

            Estimated Delivery Timeline

          </h2>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">

            {timeline.map((item) => (

              <div
                key={item.title}
                className="bg-white rounded-3xl border border-gray-200 p-8 text-center hover:shadow-lg transition"
              >

                <Clock
                  size={30}
                  className="mx-auto mb-6"
                />

                <h3 className="text-xl font-semibold text-gray-900">

                  {item.title}

                </h3>

                <p className="mt-4 text-gray-600">

                  {item.value}

                </p>

              </div>

            ))}

          </div>

        </section>

                {/* Secure Packaging */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-10">
            Secure Packaging
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {[
              "Premium Packaging Materials",
              "Damage Protection",
              "Quality Checked Products",
              "Safe Transportation",
            ].map((item) => (

              <div
                key={item}
                className="bg-white rounded-3xl border border-gray-200 p-8 hover:shadow-lg transition"
              >

                <h3 className="text-xl font-semibold text-gray-900">
                  {item}
                </h3>

                <p className="mt-4 leading-8 text-gray-600">

                  Every shipment is carefully packed to
                  protect your customized products during
                  transportation and delivery.

                </p>

              </div>

            ))}

          </div>

        </section>



        {/* Order Tracking */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-12">

            <h2 className="text-3xl font-semibold text-gray-900 mb-8">
              Order Tracking
            </h2>

            <p className="text-lg leading-9 text-gray-600">

              Once your order has been shipped,
              tracking information will be shared with you.

              <br /><br />

              You can easily monitor your shipment until
              it reaches your delivery address.

              <br /><br />

              If you experience any issues while tracking
              your order, our support team is always ready
              to assist you.

            </p>

          </div>

        </section>



        {/* Shipping Guidelines */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">

            Shipping Guidelines

          </h2>

          <div className="grid lg:grid-cols-2 gap-6">

            {[
              "Provide a complete and accurate delivery address.",
              "Keep your mobile number active during delivery.",
              "Customized orders begin production shortly after confirmation.",
              "Delivery timelines may vary during holidays and peak seasons.",
              "Courier delays due to weather or unforeseen events are beyond our control.",
              "Address changes are possible only before dispatch.",
            ].map((item) => (

              <div
                key={item}
                className="bg-white rounded-2xl border border-gray-200 px-8 py-6"
              >

                <p className="text-gray-700 leading-8">

                  {item}

                </p>

              </div>

            ))}

          </div>

        </section>



        {/* FAQ */}

        {/* <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">

            Frequently Asked Questions

          </h2>

          <div className="space-y-6">

            {[
              {
                q: "Do you deliver across Tamil Nadu?",
                a: "Yes. We currently provide shipping services across Tamil Nadu.",
              },
              {
                q: "Can I track my order?",
                a: "Yes. Tracking details will be shared once your order has been dispatched.",
              },
              {
                q: "How long does delivery take?",
                a: "Production generally takes 2–5 business days followed by 2–4 business days for shipping.",
              },
              {
                q: "What if my parcel is damaged?",
                a: "Please contact us immediately with clear photos of the damaged package and product. Our support team will assist you as quickly as possible.",
              },
              {
                q: "Can I change my delivery address?",
                a: "Address changes may be possible before the shipment is dispatched.",
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



        {/* Shipping Promise */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-8">

            Our Shipping Promise

          </h2>

          <div className="max-w-5xl">

            <p className="text-lg leading-9 text-gray-600">

              Every customized product represents the trust
              our customers place in us.

              <br /><br />

              From production to packaging and final delivery,
              we ensure every order receives the attention,
              protection, and care it deserves.

              <br /><br />

              Our commitment is simple —
              deliver every product safely,
              professionally,
              and with the highest quality standards.

            </p>

          </div>

        </section>



        {/* Bottom CTA */}

        <section className="py-28 border-t border-gray-200 text-center">

          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">

            MY DESIGNERS

          </p>

          <h2 className="mt-6 text-5xl font-light text-gray-900">

            Delivered With Care.

          </h2>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-10"></div>

          <p className="max-w-3xl mx-auto text-lg leading-9 text-gray-600">

            Every package reflects our commitment to
            premium quality, secure packaging,
            and customer satisfaction.

            <br /><br />

            Thank you for choosing
            <strong> MY DESIGNERS.</strong>

          </p>

        </section>

      </div>

    </div>

  );
}