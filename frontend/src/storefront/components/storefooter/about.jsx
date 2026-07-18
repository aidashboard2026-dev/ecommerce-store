import React from "react";

const sections = [
  {
    title: "Our Story",
    content: `Founded in 2026, MY DESIGNERS was created with a simple vision — to make premium custom products accessible to everyone.

We believe personalized products should combine quality, creativity, and affordability.

Every order, whether for a single customer or a large organization, is produced using quality materials and modern printing techniques.

Our commitment is simple — deliver products that customers are proud to wear, use, gift, and remember.`,
  },
  {
    title: "Our Mission",
    content: `Our mission is to deliver premium-quality custom products at affordable prices without compromising craftsmanship or customer satisfaction.

We strive to build long-term relationships through quality, honesty, and reliable service.`,
  },
];

export default function AboutPage() {
  return (
    <div className="bg-[#F6F6F4] min-h-screen">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-14 sm:py-16">

        <section className="text-center mb-8 sm:mb-10">
          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">
            About Us
          </p>

          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-light leading-tight text-gray-900">
            MY DESIGNERS
          </h1>

          <div className="w-20 h-px bg-gray-300 mx-auto my-6"></div>

          <p className="text-base sm:text-lg lg:text-xl text-gray-600">
            Crafted with Quality. Made for You.
          </p>
        </section>

        {sections.map((section) => (
          <section
            key={section.title}
            className="border-t border-gray-200 py-8 sm:py-10"
          >
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-5">
              {section.title}
            </h2>

            {section.content.split("\n\n").map((paragraph, index) => (
              <p
                key={index}
                className="text-base sm:text-lg text-gray-600 leading-8 mb-6"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

                <section className="border-t border-gray-200 py-8 sm:py-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-5">
            What We Create
          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">
            MY DESIGNERS specializes in custom printed T-shirts,
            embroidered apparel, hoodies, caps, mugs, glass products,
            tote bags, keychains, photo frames, corporate gifts,
            promotional merchandise, event branding, and personalized
            products for businesses and individuals.
          </p>
        </section>

        <section className="border-t border-gray-200 py-8 sm:py-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-5">
            Our Promise
          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">
            Every order receives the same level of attention,
            whether it is a single personalized gift or a large
            corporate requirement.

            We focus on quality materials, professional production,
            affordable pricing, and dependable customer service.
          </p>
        </section>

        <section className="border-t border-gray-200 py-8 sm:py-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-5">
            Looking Ahead
          </h2>

          <p className="text-base sm:text-lg leading-8 text-gray-600">
            As we continue to grow, MY DESIGNERS aims to become one of
            the most trusted custom printing brands by delivering
            consistent quality, expanding our product collection,
            and helping customers bring their ideas to life through
            personalized products.
          </p>
        </section>

        <section className="border-t border-gray-200 py-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-light leading-tight text-gray-900">
            Thank You
          </h2>

          <p className="mt-6 text-base sm:text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
            Thank you for choosing <strong>MY DESIGNERS</strong>.
            Your trust motivates us to continue creating products that
            combine creativity, craftsmanship, and lasting quality.
          </p>

          <p className="mt-8 text-lg sm:text-xl font-medium text-gray-800">
            Let's Create Something Meaningful Together.
          </p>
        </section>

      </div>
    </div>
  );
}