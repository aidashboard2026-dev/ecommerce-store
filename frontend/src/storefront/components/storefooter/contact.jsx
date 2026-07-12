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

      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Hero */}

        <section className="py-28 text-center">

          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">
            Contact Us
          </p>

          <h1 className="mt-6 text-5xl md:text-6xl font-light text-gray-900">
            WE'RE HERE TO HELP
          </h1>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-8"></div>

          <p className="max-w-3xl mx-auto text-lg leading-9 text-gray-600">

            Have questions about our products, custom orders,
            or bulk printing?

            <br />
            <br />

            Our team is always ready to assist you with
            reliable guidance and premium customer support.

          </p>

        </section>

        {/* Get In Touch */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-8">

            Get In Touch

          </h2>

          <div className="max-w-4xl">

            <p className="text-lg leading-9 text-gray-600">

              At <strong>MY DESIGNERS</strong>,
              we're always happy to hear from you.

              <br />
              <br />

              Whether you're planning a personalized gift,
              custom apparel, promotional merchandise,
              or corporate branding products,
              we're here to help make your ideas a reality.

            </p>

          </div>

        </section>

        {/* Contact Cards */}

        <section className="py-20 border-t border-gray-200">

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">

            {contactCards.map((card) => (

              <div
                key={card.title}
                className="bg-white rounded-3xl border border-gray-200 p-8 hover:shadow-xl transition duration-300"
              >

                <div className="text-gray-900 mb-6">
                  {card.icon}
                </div>

                <h3 className="text-xl font-semibold text-gray-900">
                  {card.title}
                </h3>

                <p className="mt-4 font-medium text-gray-800">
                  {card.value}
                </p>

                <p className="mt-4 leading-7 text-gray-500">
                  {card.description}
                </p>

              </div>

            ))}

          </div>

        </section>

        {/* Services */}

        {/* <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-8">

            Our Services

          </h2>

          <p className="max-w-4xl text-lg leading-9 text-gray-600 mb-14">

            We create premium-quality personalized products
            for individuals, businesses, educational institutions,
            and organizations using modern printing and
            embroidery techniques.

          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {services.map((service) => (

              <div
                key={service}
                className="bg-white rounded-2xl border border-gray-200 px-6 py-5 hover:shadow-md transition"
              >

                <p className="text-gray-700">
                  {service}
                </p>

              </div>

            ))}

          </div>

        </section> */}


                {/* Bulk Orders */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white border border-gray-200 rounded-3xl p-10 lg:p-14">

            <p className="uppercase tracking-[0.3em] text-sm text-gray-500">
              Bulk & Corporate Orders
            </p>

            <h2 className="mt-5 text-4xl font-light text-gray-900">
              Professional Printing Solutions
            </h2>

            <div className="w-20 h-[2px] bg-gray-300 mt-8 mb-8"></div>

            <p className="max-w-4xl text-lg leading-9 text-gray-600">

              Looking for customized merchandise for your company,
              college, school, organization, or special event?

              <br /><br />

              MY DESIGNERS provides high-quality printing and
              embroidery services for businesses of every size.
              From employee uniforms to promotional merchandise,
              we ensure premium quality, competitive pricing,
              and dependable delivery.

            </p>

          </div>

        </section>

        {/* Why Choose */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">
            Why Choose MY DESIGNERS
          </h2>

          <div className="grid lg:grid-cols-2 gap-6">

            {[
              {
                title: "Premium Quality",
                desc: "Every product is created using quality materials and professional production techniques."
              },
              {
                title: "Affordable Pricing",
                desc: "We believe premium products should remain affordable for everyone."
              },
              {
                title: "Modern Printing",
                desc: "Reliable printing and embroidery solutions with consistent quality."
              },
              {
                title: "Personalized Support",
                desc: "Every customer receives individual attention from enquiry to delivery."
              },
              {
                title: "Reliable Delivery",
                desc: "Orders are completed carefully and delivered with professionalism."
              },
              {
                title: "Customer Satisfaction",
                desc: "Building long-term relationships through trust and quality service."
              }
            ].map((item) => (

              <div
                key={item.title}
                className="bg-white rounded-3xl border border-gray-200 p-8 hover:shadow-lg transition duration-300"
              >

                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {item.title}
                </h3>

                <p className="leading-8 text-gray-600">
                  {item.desc}
                </p>

              </div>

            ))}

          </div>

        </section>

        {/* FAQ */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">

            {[
              {
                q: "Do you accept bulk orders?",
                a: "Yes. We provide bulk printing solutions for businesses, schools, colleges, events, and organizations."
              },
              {
                q: "Can I provide my own design?",
                a: "Absolutely. You can share your artwork or logo, and we'll print it professionally."
              },
              {
                q: "Do you offer embroidery?",
                a: "Yes. We provide premium embroidery for apparel, uniforms, and custom clothing."
              },
              {
                q: "Do you deliver across India?",
                a: "Yes. We deliver customized products across India with secure packaging."
              },
              {
                q: "What products can be customized?",
                a: "T-Shirts, Hoodies, Caps, Mugs, Glasses, Tote Bags, Keychains, Photo Frames, Corporate Gifts and much more."
              }

            ].map((faq) => (

              <div
                key={faq.q}
                className="bg-white border border-gray-200 rounded-2xl p-8"
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

        </section>

        {/* Commitment */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-8">
            Our Commitment
          </h2>

          <div className="max-w-5xl">

            <p className="text-lg leading-9 text-gray-600">

              Every order represents someone's idea,
              celebration, business, or special memory.

              <br /><br />

              That's why we approach every project with
              creativity, precision, and dedication.
              Whether you're ordering one personalized gift
              or thousands of branded products,
              our goal is always the same—
              delivering quality you can trust.

            </p>

          </div>

        </section>

        {/* CTA */}

        <section className="py-28 border-t border-gray-200 text-center">

          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">
            Let's Work Together
          </p>

          <h2 className="mt-6 text-5xl font-light text-gray-900">

            Let's Create Something
            <br />
            Amazing Together.

          </h2>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-10"></div>

          <p className="max-w-3xl mx-auto text-lg leading-9 text-gray-600">

            Whether you need a single personalized gift
            or thousands of custom products,
            MY DESIGNERS is ready to bring your ideas
            to life with premium craftsmanship
            and dependable service.

          </p>

          <p className="mt-12 text-xl font-medium text-gray-900">

            We're just one conversation away.

          </p>

        </section>

      </div>

    </div>

  );

}