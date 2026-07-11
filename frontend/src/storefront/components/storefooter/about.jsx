import React from "react";

const sections = [
  {
    title: "Our Story",
    content: `Founded in 2026, MY DESIGNERS was created with a simple vision — to make premium custom products accessible to everyone.

We believe that personalized products should be more than just visually appealing. They should represent quality, creativity, and attention to detail while remaining affordable for individuals, businesses, and organizations.

From a single custom order to large corporate requirements, every product is crafted with care using quality materials and modern printing techniques. Every design reflects our commitment to delivering products that customers can proudly wear, use, gift, and remember.

As we continue to grow, our focus remains the same: creating products that combine excellent craftsmanship, lasting quality, and exceptional value.`,
  },
  {
    title: "Our Mission",
    content: `Our mission is to deliver premium-quality custom products at affordable prices without compromising craftsmanship, creativity, or customer satisfaction.

We are committed to making personalized products accessible for everyone by combining quality materials, modern production techniques, and reliable service.`,
  },
];

const products = [
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
  "Business Branding Products",
  "Event Merchandise",
  "Promotional Products",
];

const features = [
  {
    title: "Premium Quality",
    desc: "Carefully selected materials with lasting durability and superior finish.",
  },
  {
    title: "Affordable Pricing",
    desc: "High-quality products at prices that make customization accessible.",
  },
  {
    title: "Modern Production",
    desc: "Reliable printing and embroidery techniques for exceptional results.",
  },
  {
    title: "Attention to Detail",
    desc: "Every product is crafted with precision and care, regardless of order size.",
  },
  {
    title: "Customer First",
    desc: "Building long-term relationships through trust, transparency, and service.",
  },
  {
    title: "Reliable Delivery",
    desc: "Professional production with consistent quality and dependable delivery.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-[#F6F6F4] min-h-screen">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">

        {/* Hero */}
        <section className="py-28 text-center">
          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">
            About Us
          </p>

          <h1 className="mt-6 text-5xl md:text-6xl font-light text-gray-900 tracking-tight">
            MY DESIGNERS
          </h1>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-8" />

          <p className="text-2xl md:text-3xl text-gray-700 font-light">
            Crafted with Quality.
          </p>

          <p className="text-2xl md:text-3xl text-gray-700 font-light mt-2">
            Made for You.
          </p>
        </section>

        {/* Story + Mission */}
        {sections.map((section) => (
          <section
            key={section.title}
            className="py-20 border-t border-gray-200"
          >
            <h2 className="text-3xl font-semibold text-gray-900 mb-8">
              {section.title}
            </h2>

            <div className="max-w-4xl">
              {section.content.split("\n\n").map((paragraph, index) => (
                <p
                  key={index}
                  className="text-lg leading-9 text-gray-600 mb-8"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}

        {/* Products */}
        <section className="py-20 border-t border-gray-200">
          <h2 className="text-3xl font-semibold text-gray-900 mb-12">
            What We Create
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((item) => (
              <div
                key={item}
                className="bg-white border border-gray-200 rounded-2xl px-6 py-5 hover:shadow-md transition-all duration-300"
              >
                <p className="text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose */}
        <section className="py-20 border-t border-gray-200">
          <h2 className="text-3xl font-semibold text-gray-900 mb-12">
            Why Choose MY DESIGNERS
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-3xl border border-gray-200 p-8 hover:-translate-y-1 hover:shadow-lg transition duration-300"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>

                <p className="leading-8 text-gray-600">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Promise */}
        <section className="py-20 border-t border-gray-200">
          <h2 className="text-3xl font-semibold text-gray-900 mb-8">
            Our Promise
          </h2>

          <div className="bg-white rounded-3xl border border-gray-200 p-10">
            <p className="text-lg leading-9 text-gray-600">
              Every product tells a story.
              Whether it's a custom T-shirt, a personalized mug, a corporate
              gift, or promotional merchandise, we treat every order as an
              opportunity to create something meaningful.
            </p>

            <div className="grid md:grid-cols-2 gap-5 mt-10">
              {[
                "Premium Quality",
                "Honest Pricing",
                "Professional Craftsmanship",
                "Reliable Service",
                "Customer Satisfaction",
              ].map((item) => (
                <div
                  key={item}
                  className="border border-gray-200 rounded-xl px-5 py-4 text-gray-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Looking Ahead */}
        <section className="py-20 border-t border-gray-200">
          <h2 className="text-3xl font-semibold text-gray-900 mb-8">
            Looking Ahead
          </h2>

          <p className="max-w-4xl text-lg leading-9 text-gray-600">
            As our journey continues, MY DESIGNERS aims to become a trusted
            destination for custom printing and personalized products. We will
            continue expanding our collection, improving production standards,
            and delivering creative solutions that help individuals and
            businesses express their ideas with confidence.
          </p>
        </section>

        {/* Footer CTA */}
        <section className="py-28 border-t border-gray-200 text-center">
          <h2 className="text-4xl font-light text-gray-900">
            Thank You
          </h2>

          <p className="max-w-3xl mx-auto mt-8 text-lg leading-9 text-gray-600">
            Thank you for choosing <strong>MY DESIGNERS</strong>.
            Your trust inspires us to create products that celebrate ideas,
            strengthen brands, and make every occasion more memorable.
          </p>

          <p className="mt-12 text-xl text-gray-800 font-medium">
            Let's Create Something Meaningful Together.
          </p>
        </section>

      </div>
    </div>
  );
}

