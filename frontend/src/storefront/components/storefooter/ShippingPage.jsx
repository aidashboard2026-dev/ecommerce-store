import React from "react";
import {
  Package,
  Truck,
  Clock,
  ShieldCheck,
} from "lucide-react";

const processSteps = [
  {
    icon: <Package size={22} />,
    title: "Order Confirmation",
    description:
      "Every order is reviewed and confirmed before production begins.",
  },
  {
    icon: <ShieldCheck size={22} />,
    title: "Production",
    description:
      "Products are manufactured using premium materials and modern printing.",
  },
  {
    icon: <Package size={22} />,
    title: "Quality Inspection",
    description:
      "Every product is inspected before packaging.",
  },
  {
    icon: <Truck size={22} />,
    title: "Dispatch",
    description:
      "Orders are securely packed and shipped through trusted partners.",
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

      <div className="max-w-5xl mx-auto px-6">

        {/* Hero */}

        <section className="pt-16 pb-14 text-center">

          <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
            Shipping Information
          </p>

          <h1 className="mt-5 text-5xl font-light text-gray-900">
            Fast. Secure.
            <br />
            Reliable.
          </h1>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-lg leading-8 text-gray-600">
            Every customized product is carefully packed,
            professionally handled and delivered with care.
          </p>

        </section>

        {/* Shipping Overview */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-5">
            Shipping Overview
          </h2>

          <p className="max-w-4xl text-lg leading-8 text-gray-600">

            At <strong>MY DESIGNERS</strong>, every order is handled with
            precision from production to final delivery.

            <br /><br />

            Every customized product is inspected carefully,
            securely packed and prepared for safe transportation.

            <br /><br />

            Whether you order one personalized product or a
            large corporate order, our commitment to quality
            remains the same.

          </p>

        </section>

        {/* Order Processing */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-8">
            Order Processing
          </h2>

          <div className="grid md:grid-cols-2 gap-5">

            {processSteps.map((step) => (

              <div
                key={step.title}
                className="bg-white border border-gray-200 rounded-xl p-6"
              >

                <div className="mb-4">
                  {step.icon}
                </div>

                <h3 className="text-xl font-semibold">
                  {step.title}
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {step.description}
                </p>

              </div>

            ))}

          </div>

        </section>

        {/* Delivery Timeline */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-8">
            Estimated Delivery Timeline
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {timeline.map((item) => (

              <div
                key={item.title}
                className="border border-gray-200 rounded-xl bg-white p-5 text-center"
              >

                <Clock
                  size={24}
                  className="mx-auto mb-3"
                />

                <h3 className="font-semibold">
                  {item.title}
                </h3>

                <p className="mt-2 text-gray-600">
                  {item.value}
                </p>

              </div>

            ))}

          </div>

        </section>

                {/* Shipping Guidelines */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-8">
            Shipping Guidelines
          </h2>

          <div className="space-y-4">

            {[
              "Provide a complete delivery address.",
              "Keep your mobile number active.",
              "Production starts after order confirmation.",
              "Delivery timelines may vary during holidays.",
              "Courier delays due to weather are beyond our control.",
              "Address changes are accepted only before dispatch.",
            ].map((item) => (

              <div
                key={item}
                className="border-b border-gray-200 pb-4"
              >

                <p className="leading-8 text-gray-700">
                  {item}
                </p>

              </div>

            ))}

          </div>

        </section>

        {/* Shipping Promise */}

        <section className="py-10 border-t border-gray-200">

          <h2 className="text-3xl font-semibold mb-5">
            Our Shipping Promise
          </h2>

          <p className="max-w-4xl text-lg leading-8 text-gray-600">

            Every customized product represents the trust our
            customers place in us.

            <br /><br />

            From production to packaging and final delivery,
            every order receives the attention, protection
            and care it deserves.

            <br /><br />

            Our commitment is simple —
            deliver every order safely,
            professionally and on time.

          </p>

        </section>

        {/* Thank You */}

        <section className="py-14 border-t border-gray-200 text-center">

          <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
            MY DESIGNERS
          </p>

          <h2 className="mt-4 text-4xl font-light text-gray-900">
            Delivered With Care
          </h2>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-lg leading-8 text-gray-600">

            Every package reflects our commitment to
            premium quality, secure packaging and
            customer satisfaction.

            <br /><br />

            Thank you for choosing
            <strong> MY DESIGNERS.</strong>

          </p>

        </section>

      </div>

    </div>

  );
}