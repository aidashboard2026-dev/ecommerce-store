import React from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
} from "lucide-react";

const contactCards = [
  {
    icon: <Phone size={28} />,
    title: "Phone",
    value: "+91 63812 75955",
    description: "For product enquiries, bulk orders and customer support.",
  },
  {
    icon: <Mail size={28} />,
    title: "Email",
    value: "mydesigners303@gmail.com",
    description: "We'll get back to you as quickly as possible.",
  },
  {
  icon: <MapPin size={28} />,
  title: "Location",
  value: `2/72, Thippatti,
Mariyamman Kovil Street,
Rajagollahalli (PO),
Pennagaram Road,
Dharmapuri - 636813,
Tamil Nadu, India`,
  description: "Delivering premium custom products across Tamil Nadu.",
},
  {
    icon: <Clock size={28} />,
    title: "Business Hours",
    value: "Mon - Sat | 9:00 AM - 7:00 PM",
    description: "Sunday Closed",
  },
];

const services = [
  "Custom Printed T-Shirts",
  "Embroidered T-Shirts",
  "Hoodies",
  "Caps",
  "Printed Mugs",
  "Printed Glasses",
  "Tote Bags",
  "Keychains",
  "Photo Frames",
  "Corporate Gift Kits",
  "Personalized Gifts",
  "Business Branding",
];

export default function ContactPage() {
  return (
    <div className="bg-[#F6F6F4] min-h-screen">

      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">

        {/* Hero */}

        <section className="pt-16 pb-14 text-center">

          <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
            Contact Us
          </p>

          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-light text-gray-900 leading-tight">
            WE'RE HERE TO HELP
          </h1>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-base sm:text-lg leading-8 text-gray-600">

            Have questions about our products,
            custom orders or bulk printing?

            <br /><br />

            Our team is always ready to assist you with
            reliable guidance and premium customer support.

          </p>

        </section>

        {/* Get In Touch */}

        <section className="py-10 border-t border-gray-200 text-center">

          <div className="max-w-3xl mx-auto">

            <h2 className="text-3xl font-semibold text-gray-900">

              Get In Touch

            </h2>

            <div className="w-20 h-px bg-gray-300 mx-auto my-5"></div>

            <p className="text-base sm:text-lg leading-8 text-gray-600">

              At <strong>MY DESIGNERS</strong>,
              we're always happy to hear from you.

              <br /><br />

              Whether you're planning a personalized gift,
              custom apparel,
              promotional merchandise,
              or corporate branding products,
              we're here to help bring your ideas to life.

            </p>

          </div>

        </section>

        {/* Contact Cards */}

        <section className="py-10 border-t border-gray-200">

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

            {contactCards.map((card) => (

              <div
                key={card.title}
                className="bg-white border border-gray-200 rounded-xl p-6 text-center"
              >

                <div className="flex justify-center mb-4">
                  {card.icon}
                </div>

                <h3 className="text-lg font-semibold text-gray-900">
                  {card.title}
                </h3>

                <p className="mt-3 font-medium text-gray-800 whitespace-pre-line break-words">
                  {card.value}
                </p>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  {card.description}
                </p>

              </div>

            ))}

          </div>

        </section>

            {/* Professional Printing */}

        <section className="py-10 border-t border-gray-200 text-center">

          <div className="max-w-3xl mx-auto">

            <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
              Bulk & Corporate Orders
            </p>

            <h2 className="mt-3 text-3xl font-semibold text-gray-900">

              Professional Printing Solutions

            </h2>

            <div className="w-20 h-px bg-gray-300 mx-auto my-5"></div>

            <p className="text-base sm:text-lg leading-8 text-gray-600">

              Looking for customized merchandise
              for your company,
              college,
              school,
              organization or special event?

              <br /><br />

              MY DESIGNERS provides premium printing
              and embroidery solutions for businesses
              of every size with dependable delivery
              and competitive pricing.

            </p>

          </div>

        </section>

        {/* FAQ */}

        <section className="py-10 border-t border-gray-200">

          <div className="max-w-4xl mx-auto">

            <h2 className="text-3xl font-semibold text-center text-gray-900">

              Frequently Asked Questions

            </h2>

            <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

            <div className="space-y-5">

              {[
                {
                  q: "Do you accept bulk orders?",
                  a: "Yes. We provide bulk printing solutions for businesses, schools, colleges, events and organizations."
                },
                {
                  q: "Can I provide my own design?",
                  a: "Absolutely. You can share your artwork or logo and we'll print it professionally."
                },
                {
                  q: "Do you offer embroidery?",
                  a: "Yes. Premium embroidery services are available for uniforms and apparel."
                },
                {
                  q: "Do you deliver across India?",
                  a: "Yes. We deliver customized products across India."
                },
                {
                  q: "What products can be customized?",
                  a: "T-Shirts, Hoodies, Caps, Mugs, Glasses, Tote Bags, Photo Frames, Corporate Gifts and more."
                }

              ].map((faq) => (

                <div
                  key={faq.q}
                  className="border-b border-gray-200 pb-5"
                >

                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">

                    {faq.q}

                  </h3>

                  <p className="mt-2 text-gray-600 leading-8">

                    {faq.a}

                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* Commitment */}

        <section className="py-10 border-t border-gray-200 text-center">

          <div className="max-w-3xl mx-auto">

            <h2 className="text-3xl font-semibold text-gray-900">

              Our Commitment

            </h2>

            <div className="w-20 h-px bg-gray-300 mx-auto my-5"></div>

            <p className="text-base sm:text-lg leading-8 text-gray-600">

              Every order represents someone's idea,
              celebration,
              business or special memory.

              <br /><br />

              Whether you're ordering one product
              or thousands,
              our goal remains the same—

              <br /><br />

              Delivering premium quality
              you can trust.

            </p>

          </div>

        </section>

        {/* CTA */}

        <section className="py-14 border-t border-gray-200 text-center">

          <p className="uppercase tracking-[0.3em] text-sm text-gray-500">

            Let's Work Together

          </p>

          <h2 className="mt-4 text-4xl sm:text-5xl font-light text-gray-900 leading-tight">

            Let's Create Something
            <br />
            Amazing Together.

          </h2>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="max-w-3xl mx-auto text-base sm:text-lg leading-8 text-gray-600">

            Whether you need one personalized gift
            or thousands of custom products,
            MY DESIGNERS is ready to bring
            your ideas to life.

          </p>

          <p className="mt-8 font-medium text-gray-900">

            We're just one conversation away.

          </p>

        </section>

      </div>

    </div>
  )}