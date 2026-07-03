import React from "react";
import { Link } from "react-router-dom";
import {
  Award,
  ShieldCheck,
  Truck,
  Palette,
  CheckCircle2,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">

      {/* Hero Section */}
      <section
        className="
        relative
        h-[70vh]
        min-h-[620px]
        overflow-hidden
        "
        >

        {/* Background Image */}
        <img
            src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1600&q=80"
            alt="About Us"
            className="
            absolute
            inset-0
            h-full
            w-full
            object-cover
            grayscale
            "
        />

        {/* Dark Overlay */}
        <div
            className="
            absolute
            inset-0
            bg-black/75
            "
        />

        {/* Content */}
        <div
            className="
            relative
            z-10
            h-full
            flex
            flex-col
            items-center
            justify-center
            px-6
            text-center
            "
        >

            <p
            className="
            uppercase
            tracking-[6px]
            text-white/60
            text-xs
            mb-6
            "
            >
            Premium Manufacturing
            </p>

            <h1
            className="
            text-white
            text-5xl
            md:text-7xl
            font-extralight
            tracking-[10px]
            uppercase
            "
            >
            About Us
            </h1>

            <div className="w-16 h-px bg-white/30 mt-8" />

            <p
            className="
            mt-8
            max-w-3xl
            text-base
            md:text-lg
            leading-9
            text-white/60
            font-light
            tracking-wide
            "
            >
            Premium T-Shirts &nbsp;•&nbsp; Custom Printing &nbsp;•&nbsp; Corporate Merchandise &nbsp;•&nbsp;
            Personalized Gifts &nbsp;•&nbsp; Manufacturing Excellence
            </p>

        </div>

        </section>

        {/* Intro Statement */}
        <section className="bg-[#0A0A0A]">

            <div
                className="
                max-w-[980px]
                mx-auto
                px-6
                py-24
                "
            >

                <div
                className="
                bg-white/[0.03]
                border
                border-white/10
                rounded-3xl
                p-14
                text-center
                "
                >

                <p
                    className="
                    text-[20px]
                    md:text-[22px]
                    leading-[2]
                    text-white/70
                    font-light
                    tracking-wide
                    "
                >
                    At <strong className="text-white font-medium">My Designers</strong>, we manufacture products that
                    combine premium quality, modern craftsmanship, and personalized
                    creativity. Every product is designed to represent your identity,
                    business, or brand with confidence.
                </p>

                </div>

            </div>

        </section>

            {/* Why Choose Us */}
            <section className="max-w-[1300px] mx-auto px-6 py-24">

                <p className="text-center uppercase tracking-[6px] text-white/40 text-xs mb-4">
                    The Difference
                </p>

                <h2
                    className="
                    text-[32px]
                    md:text-[40px]
                    font-extralight
                    tracking-[8px]
                    uppercase
                    text-center
                    text-white
                    mb-20
                    "
                >
                    Why Choose Us
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 hover:border-white/30 hover:bg-white/[0.05] transition duration-500">
                    <Award className="w-8 h-8 mb-6 text-white/80" strokeWidth={1.25} />
                    <h3 className="text-lg font-light tracking-wide uppercase text-white mb-4">
                        Premium Quality
                    </h3>
                    <p className="text-white/50 leading-8 font-light">
                        Every product is manufactured using premium materials and strict quality checks.
                    </p>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 hover:border-white/30 hover:bg-white/[0.05] transition duration-500">
                    <Palette className="w-8 h-8 mb-6 text-white/80" strokeWidth={1.25} />
                    <h3 className="text-lg font-light tracking-wide uppercase text-white mb-4">
                        Custom Printing
                    </h3>
                    <p className="text-white/50 leading-8 font-light">
                        Personalized printing, embroidery and branding solutions for every requirement.
                    </p>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 hover:border-white/30 hover:bg-white/[0.05] transition duration-500">
                    <Truck className="w-8 h-8 mb-6 text-white/80" strokeWidth={1.25} />
                    <h3 className="text-lg font-light tracking-wide uppercase text-white mb-4">
                        Fast Delivery
                    </h3>
                    <p className="text-white/50 leading-8 font-light">
                        Reliable manufacturing and timely delivery across India.
                    </p>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 hover:border-white/30 hover:bg-white/[0.05] transition duration-500">
                    <ShieldCheck className="w-8 h-8 mb-6 text-white/80" strokeWidth={1.25} />
                    <h3 className="text-lg font-light tracking-wide uppercase text-white mb-4">
                        Trusted Service
                    </h3>
                    <p className="text-white/50 leading-8 font-light">
                        Thousands of satisfied customers trust our quality and commitment.
                    </p>
                    </div>

                </div>

            </section>

            {/* Manufacturing Process */}
            <section className="bg-white/[0.02] border-y border-white/10 py-28">

                <div className="max-w-[1200px] mx-auto px-6">

                    <p className="text-center uppercase tracking-[6px] text-white/40 text-xs mb-4">
                        How It Works
                    </p>

                    <h2
                    className="
                    text-[32px]
                    md:text-[40px]
                    tracking-[8px]
                    uppercase
                    text-center
                    font-extralight
                    text-white
                    mb-20
                    "
                    >
                    Manufacturing Process
                    </h2>

                    <div className="grid md:grid-cols-4 gap-10">

                    <div className="text-center">
                        <div className="text-5xl font-extralight mb-6 text-white/25">01</div>
                        <h3 className="text-lg tracking-wide uppercase font-light text-white mb-4">
                        Design
                        </h3>
                        <p className="text-white/50 leading-8 font-light">
                        Understanding your ideas and creating premium artwork.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="text-5xl font-extralight mb-6 text-white/25">02</div>
                        <h3 className="text-lg tracking-wide uppercase font-light text-white mb-4">
                        Manufacturing
                        </h3>
                        <p className="text-white/50 leading-8 font-light">
                        High-quality materials and precision production.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="text-5xl font-extralight mb-6 text-white/25">03</div>
                        <h3 className="text-lg tracking-wide uppercase font-light text-white mb-4">
                        Quality Check
                        </h3>
                        <p className="text-white/50 leading-8 font-light">
                        Every product undergoes strict inspection before dispatch.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="text-5xl font-extralight mb-6 text-white/25">04</div>
                        <h3 className="text-lg tracking-wide uppercase font-light text-white mb-4">
                        Delivery
                        </h3>
                        <p className="text-white/50 leading-8 font-light">
                        Safe packaging and timely delivery to your doorstep.
                        </p>
                    </div>

                    </div>

                </div>

            </section>

            {/* Stats */}
            <section className="py-28">

                <div className="max-w-[1200px] mx-auto px-6">

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">

                    <div>
                        <h3 className="text-5xl md:text-6xl font-extralight mb-4 text-white">
                        5000+
                        </h3>

                        <p className="uppercase tracking-[4px] text-xs text-white/40">
                        Products Delivered
                        </p>
                    </div>

                    <div>
                        <h3 className="text-5xl md:text-6xl font-extralight mb-4 text-white">
                        1000+
                        </h3>

                        <p className="uppercase tracking-[4px] text-xs text-white/40">
                        Happy Customers
                        </p>
                    </div>

                    <div>
                        <h3 className="text-5xl md:text-6xl font-extralight mb-4 text-white">
                        100%
                        </h3>

                        <p className="uppercase tracking-[4px] text-xs text-white/40">
                        Quality Checked
                        </p>
                    </div>

                    <div>
                        <h3 className="text-5xl md:text-6xl font-extralight mb-4 text-white">
                        24/7
                        </h3>

                        <p className="uppercase tracking-[4px] text-xs text-white/40">
                        Customer Support
                        </p>
                    </div>

                    </div>

                </div>

            </section>

            {/* Manufacturing Gallery */}
            <section className="bg-white/[0.02] border-y border-white/10 py-28">

                <div className="max-w-[1350px] mx-auto px-6">

                    <p className="text-center uppercase tracking-[6px] text-white/40 text-xs mb-4">
                        Behind The Scenes
                    </p>

                    <h2
                    className="
                    text-[32px]
                    md:text-[40px]
                    font-extralight
                    tracking-[8px]
                    uppercase
                    text-center
                    text-white
                    mb-20
                    "
                    >
                    Our Manufacturing
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">

                    <div className="overflow-hidden rounded-3xl border border-white/10">
                        <img
                        src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"
                        alt=""
                        className="h-[420px] w-full object-cover grayscale hover:grayscale-0 hover:scale-110 transition duration-700"
                        />
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-white/10">
                        <img
                        src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80"
                        alt=""
                        className="h-[420px] w-full object-cover grayscale hover:grayscale-0 hover:scale-110 transition duration-700"
                        />
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-white/10">
                        <img
                        src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80"
                        alt=""
                        className="h-[420px] w-full object-cover grayscale hover:grayscale-0 hover:scale-110 transition duration-700"
                        />
                    </div>

                    </div>

                </div>

            </section>

            {/* Trusted By */}
            <section className="py-24">

                <div className="max-w-[1100px] mx-auto text-center px-6">

                    <p
                    className="
                    uppercase
                    tracking-[6px]
                    text-white/40
                    text-xs
                    mb-12
                    "
                    >
                    Trusted By
                    </p>

                    <div
                    className="
                    grid
                    grid-cols-2
                    md:grid-cols-4
                    gap-12
                    text-[22px]
                    md:text-[26px]
                    font-extralight
                    tracking-wide
                    text-white/60
                    "
                    >

                    <span>Startups</span>

                    <span>Schools</span>

                    <span>Businesses</span>

                    <span>Corporate</span>

                    </div>

                </div>

            </section>

            {/* CTA */}
            <section className="py-32">

                <div
                    className="
                    max-w-[1200px]
                    mx-auto
                    rounded-[40px]
                    bg-white/[0.03]
                    border
                    border-white/15
                    px-10
                    py-24
                    text-center
                    "
                >

                    <p className="uppercase tracking-[6px] text-white/40 text-xs mb-6">
                    Get In Touch
                    </p>

                    <h2
                    className="
                    text-white
                    text-3xl
                    md:text-5xl
                    font-extralight
                    tracking-[6px]
                    uppercase
                    "
                    >
                    Let's Build Something Amazing
                    </h2>

                    <p
                    className="
                    mt-8
                    text-white/50
                    text-base
                    md:text-lg
                    font-light
                    max-w-3xl
                    mx-auto
                    leading-9
                    "
                    >
                    Whether you're looking for premium apparel,
                    corporate merchandise,
                    promotional products,
                    or personalized gifts,
                    we're ready to manufacture products
                    that represent your brand with excellence.
                    </p>

                    <div className="flex justify-center gap-6 mt-12">

                    <Link
                        to="/contact"
                        className="
                        bg-white
                        text-black
                        px-10
                        py-4
                        rounded-full
                        text-sm
                        uppercase
                        tracking-[3px]
                        font-light
                        hover:scale-105
                        transition
                        "
                    >
                        Contact Us
                    </Link>

                    <Link
                        to="/products"
                        className="
                        border
                        border-white/40
                        text-white
                        px-10
                        py-4
                        rounded-full
                        text-sm
                        uppercase
                        tracking-[3px]
                        font-light
                        hover:bg-white
                        hover:text-black
                        hover:border-white
                        transition
                        "
                    >
                        Explore Products
                    </Link>

                    </div>

                </div>

            </section>

            {/* Thank You */}
            <section className="pb-24">

                <div className="max-w-[900px] mx-auto text-center px-6">

                    <h3
                    className="
                    text-[26px]
                    md:text-[34px]
                    font-extralight
                    tracking-[5px]
                    uppercase
                    text-white
                    mb-8
                    "
                    >
                    Thank You
                    </h3>

                    <div className="w-16 h-px bg-white/20 mx-auto mb-8" />

                    <p
                    className="
                    text-base
                    md:text-[18px]
                    leading-10
                    font-light
                    text-white/50
                    "
                    >
                    Every order we manufacture reflects our passion for quality,
                    creativity, and customer satisfaction.
                    Thank you for trusting My Designers.
                    We look forward to creating something exceptional for you.
                    </p>

                </div>

            </section>

    </div>
  );
}