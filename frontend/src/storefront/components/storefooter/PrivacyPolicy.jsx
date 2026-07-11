import React from "react";
import {
  Shield,
  User,
  Database,
  CreditCard,
  FileImage,
  Share2,
} from "lucide-react";

const collectedInfo = [
  {
    icon: <User size={28} />,
    title: "Personal Information",
    description:
      "Name, email address, phone number, shipping address, and billing information provided during purchases.",
  },
  {
    icon: <Database size={28} />,
    title: "Order Information",
    description:
      "Products ordered, customization details, order history, and delivery preferences.",
  },
  {
    icon: <FileImage size={28} />,
    title: "Uploaded Designs",
    description:
      "Logos, artwork, images, and files shared for customized printing are used only to complete your order.",
  },
  {
    icon: <CreditCard size={28} />,
    title: "Payment Information",
    description:
      "Payments are securely processed through trusted payment providers. We do not store complete card details.",
  },
];

const usage = [
  "Process and confirm your orders",
  "Customize products according to your request",
  "Deliver products safely",
  "Provide customer support",
  "Send order updates and notifications",
  "Improve our products and services",
  "Prevent fraud and unauthorized activities",
  "Comply with applicable legal requirements",
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F6F6F4]">

      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Hero */}

        <section className="py-28 text-center">

          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">
            Privacy Policy
          </p>

          <h1 className="mt-6 text-5xl md:text-6xl font-light text-gray-900">

            Your Privacy.
            <br />
            Our Responsibility.

          </h1>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-8"></div>

          <p className="max-w-3xl mx-auto text-lg leading-9 text-gray-600">

            At <strong>MY DESIGNERS</strong>,
            protecting your privacy is one of our highest priorities.

            <br /><br />

            This Privacy Policy explains how we collect,
            use,
            protect,
            and manage the information you share with us.

          </p>

        </section>

        {/* Information We Collect */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">

            Information We Collect

          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {collectedInfo.map((item) => (

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

        {/* How We Use Your Information */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-12">

            <h2 className="text-3xl font-semibold text-gray-900">

              How We Use Your Information

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              The information you provide helps us deliver
              a better shopping experience and ensure your
              customized products are produced accurately.

            </p>

            <div className="grid md:grid-cols-2 gap-5 mt-12">

              {usage.map((item) => (

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

        {/* Your Designs */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-12">

            <h2 className="text-3xl font-semibold text-gray-900">

              Your Designs, Your Ownership

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              Any logo,
              artwork,
              image,
              photograph,
              or design uploaded by you remains your property.

              <br /><br />

              MY DESIGNERS uses these files only for
              producing your requested customized products.

              <br /><br />

              We do not claim ownership of your creative work,
              sell it,
              or use it for unrelated commercial purposes
              without your permission.

            </p>

          </div>

        </section>

        {/* Payment Security */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-12">

            <h2 className="text-3xl font-semibold text-gray-900">

              Payment Security

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              Your payment security is extremely important to us.

              <br /><br />

              Transactions are processed through trusted
              and secure payment providers.

              <br /><br />

              MY DESIGNERS does not store complete debit card,
              credit card,
              or online banking credentials.

            </p>

          </div>

        </section>

        {/* Sharing Information */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-12">

            <div className="flex items-center gap-4">

              <Share2 size={30} />

              <h2 className="text-3xl font-semibold text-gray-900">

                Sharing Information

              </h2>

            </div>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              We respect your privacy.

              <br /><br />

              We do not sell,
              rent,
              or trade your personal information.

              <br /><br />

              Information may only be shared when necessary with:

            </p>

            <div className="grid md:grid-cols-3 gap-5 mt-10">

              {[
                "Trusted Courier Partners",
                "Secure Payment Providers",
                "Government Authorities (if legally required)",
              ].map((item) => (

                <div
                  key={item}
                  className="border border-gray-200 rounded-2xl bg-[#FAFAF9] px-6 py-5 text-center"
                >

                  <p className="text-gray-700">

                    {item}

                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>

                {/* Cookies */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-10">
            Cookies
          </h2>

          <div className="max-w-5xl">

            <p className="text-lg leading-9 text-gray-600">

              Our website may use cookies and similar technologies
              to improve your browsing experience,
              remember your preferences,
              and enhance website performance.

              <br /><br />

              Cookies help us understand how visitors use our website
              so we can continue improving our products and services.

            </p>

          </div>

        </section>



        {/* Data Security */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">
            Data Security
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {[
              "Secure Data Storage",
              "Restricted Employee Access",
              "Protected Customer Information",
              "Continuous Security Monitoring",
            ].map((item) => (

              <div
                key={item}
                className="bg-white rounded-3xl border border-gray-200 p-8 hover:shadow-lg transition"
              >

                <Shield size={28} className="mb-5" />

                <h3 className="text-xl font-semibold text-gray-900">

                  {item}

                </h3>

                <p className="mt-4 leading-8 text-gray-600">

                  We take appropriate security measures
                  to help protect your personal information
                  from unauthorized access,
                  misuse,
                  or disclosure.

                </p>

              </div>

            ))}

          </div>

        </section>



        {/* Your Rights */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-12">

            <h2 className="text-3xl font-semibold text-gray-900">

              Your Rights

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              As our customer,
              you have the right to:

            </p>

            <div className="grid md:grid-cols-2 gap-5 mt-10">

              {[
                "Access your personal information",
                "Request corrections to inaccurate information",
                "Request deletion of eligible personal data",
                "Contact us regarding privacy concerns",
              ].map((item) => (

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



        {/* Third Party Services */}

        <section className="py-20 border-t border-gray-200">

          <div className="bg-white rounded-3xl border border-gray-200 p-12">

            <h2 className="text-3xl font-semibold text-gray-900">

              Third-Party Services

            </h2>

            <p className="mt-8 text-lg leading-9 text-gray-600">

              Our website may work with trusted third-party
              service providers for payment processing,
              shipping,
              website analytics,
              and other essential business operations.

              <br /><br />

              These providers maintain their own privacy
              and security policies for handling data.

            </p>

          </div>

        </section>



        {/* Policy Updates */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-8">

            Policy Updates

          </h2>

          <div className="max-w-5xl">

            <p className="text-lg leading-9 text-gray-600">

              We may update this Privacy Policy
              from time to time
              to reflect improvements,
              legal requirements,
              or changes to our services.

              <br /><br />

              The latest version will always be available
              on this page.

            </p>

          </div>

        </section>



        {/* Contact */}

        <section className="py-20 border-t border-gray-200">

          <h2 className="text-3xl font-semibold text-gray-900 mb-12">

            Contact Us

          </h2>

          <div className="grid md:grid-cols-3 gap-6">

            <div className="bg-white rounded-3xl border border-gray-200 p-8">

              <h3 className="text-xl font-semibold text-gray-900">
                Phone
              </h3>

              <p className="mt-4 text-gray-600">
                +91 XXXXX XXXXX
              </p>

            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-8">

              <h3 className="text-xl font-semibold text-gray-900">
                Email
              </h3>

              <p className="mt-4 text-gray-600">
                support@mydesigners.in
              </p>

            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-8">

              <h3 className="text-xl font-semibold text-gray-900">
                Address
              </h3>

              <p className="mt-4 text-gray-600">
                Dharmapuri,
                Tamil Nadu,
                India
              </p>

            </div>

          </div>

        </section>



        {/* Bottom CTA */}

        <section className="py-28 border-t border-gray-200 text-center">

          <p className="uppercase tracking-[0.35em] text-sm text-gray-500">
            MY DESIGNERS
          </p>

          <h2 className="mt-6 text-5xl font-light text-gray-900">

            Your Trust.
            <br />
            Our Commitment.

          </h2>

          <div className="w-24 h-[2px] bg-gray-300 mx-auto my-10"></div>

          <p className="max-w-3xl mx-auto text-lg leading-9 text-gray-600">

            Protecting your personal information
            is an important part of the trust
            you place in MY DESIGNERS.

            <br /><br />

            We are committed to maintaining
            transparency,
            security,
            and responsible handling
            of your information.

          </p>

        </section>

      </div>

    </div>

  );

}