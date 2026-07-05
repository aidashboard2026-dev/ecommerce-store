import React from "react";
import { Link } from "react-router-dom";
import {
  Award,
  ShieldCheck,
  Truck,
  Palette,
  CheckCircle2,
  Sparkles,
  Scissors,
  PackageCheck,
  Send,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F6F6F4]">

      {/* Step 1 - Hero */}
      <section className="bg-grey">

        <div className="max-w-[920px] mx-auto px-6 py-28">

            <h1
            className="
            text-center
            uppercase
            text-[52px]
            tracking-[10px]
            font-extralight
            text-[#1A1A1A]
            "
            >
            About Us
            </h1>

            <div className="mt-20">

            <p
                className="
                text-[18px]
                leading-[2]
                text-[#5C5C5C]
                font-light
                "
            >
                Welcome to <strong className="text-[#111] font-medium">My Designers</strong>,
                where creativity meets precision manufacturing.
                We specialize in premium apparel, custom printing,
                and personalized merchandise crafted for businesses,
                organizations, educational institutions, and individuals.
                Every product we create reflects quality, attention to detail,
                and a commitment to helping our customers express their identity
                through exceptional design.
            </p>

            </div>

        </div>

    </section>

    <section className="bg-[#F8F8F5] pb-28">

        <div className="max-w-[920px] mx-auto px-6">

            <h2
            className="
            uppercase
            tracking-[8px]
            text-[36px]
            font-extralight
            text-[#1A1A1A]
            "
            >
            Our Story
            </h2>

            <div className="mt-10 space-y-8">

            <p
                className="
                text-[18px]
                leading-[2]
                text-[#5C5C5C]
                font-light
                "
            >
                My Designers was founded with a simple vision — to deliver products
                that combine premium quality, modern craftsmanship, and meaningful
                personalization. What started as a passion for creating outstanding
                printed apparel has evolved into a complete manufacturing solution
                for custom clothing, corporate branding, promotional merchandise,
                and personalized gifting.
            </p>

            <p
                className="
                text-[18px]
                leading-[2]
                text-[#5C5C5C]
                font-light
                "
            >
                Today, we manufacture premium T-Shirts, Shirts, Trousers,
                Track Pants, Jerseys, and a wide range of custom products including
                Embroidery Design T-Shirts, Graphic Printed T-Shirts,
                Sublimation Products, Magic Mugs, Water Bottles,
                Mouse Pads, Glassware, Photo Frames, Metal Frames,
                Personal Gifts, Skinny Tumblers, and many more.
                Every order is produced with precision, consistency,
                and a strong focus on customer satisfaction.
            </p>

            <p
                className="
                text-[18px]
                leading-[2]
                text-[#5C5C5C]
                font-light
                "
            >
                Our mission is not simply to manufacture products.
                We build experiences that help brands stand out,
                strengthen business identity,
                and create lasting impressions through exceptional craftsmanship.
            </p>

            </div>

        </div>

    </section>

    <section className="bg-[#F8F8F5] py-28">

        <div className="max-w-[1250px] mx-auto px-6">

            {/* Section Heading */}

            <p
            className="
            text-center
            uppercase
            tracking-[6px]
            text-[#7A7A7A]
            text-xs
            mb-5
            "
            >
            What We Manufacture
            </p>

            <h2
            className="
            text-center
            uppercase
            tracking-[8px]
            text-[42px]
            font-extralight
            text-[#161616]
            "
            >
            Products We Create
            </h2>

            <p
            className="
            max-w-3xl
            mx-auto
            mt-8
            text-center
            text-[17px]
            leading-9
            text-[#666]
            "
            >
            We manufacture premium apparel and personalized products for
            businesses, educational institutions, organizations and individuals.
            Every product is crafted with precision, premium materials,
            and modern printing technology.
            </p>

            {/* Products */}

            <div className="grid lg:grid-cols-2 gap-24 mt-24">

            {/* Main Products */}

            <div>

                <h3
                className="
                uppercase
                tracking-[5px]
                text-[22px]
                font-light
                text-[#111]
                mb-10
                "
                >
                Main Products
                </h3>

                <div className="space-y-6">

                {[
                    "Premium T-Shirts",
                    "Premium Shirts",
                    "Trousers",
                    "Track Pants",
                    "Sports Jerseys",
                ].map((item) => (

                    <div
                    key={item}
                    className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-[#E6E6E6]
                    pb-4
                    "
                    >

                    <span className="text-[18px] text-[#444]">
                        {item}
                    </span>

                    <span className="text-[#BDBDBD] text-xl">
                        →
                    </span>

                    </div>

                ))}

                </div>

            </div>

            {/* Custom Products */}

            <div>

                <h3
                className="
                uppercase
                tracking-[5px]
                text-[22px]
                font-light
                text-[#111]
                mb-10
                "
                >
                Custom Manufacturing
                </h3>

                <div className="grid grid-cols-2 gap-y-6 gap-x-10">

                {[
                    "Embroidery Design T-Shirts",
                    "Graphic Printed T-Shirts",
                    "Sublimation Products",
                    "Gifts & Printing",
                    "Magic Mug Printing",
                    "White Mugs",
                    "Water Bottles",
                    "Mouse Pads",
                    "Glass",
                    "Glass Ware",
                    "Photo Frames",
                    "Metal Frames",
                    "Personal Gifts",
                    "Skinny Tumblers",
                ].map((item) => (

                    <div
                    key={item}
                    className="
                    text-[16px]
                    text-[#555]
                    border-b
                    border-[#ECECEC]
                    pb-3
                    "
                    >
                    {item}
                    </div>

                ))}

                </div>

            </div>

            </div>

        </div>

    </section>

    {/* ================= OUR VALUES ================= */}

    <section className="mt-28">
        <h2 className="text-[42px] font-light tracking-[8px] uppercase text-[#111111]">
            Our Values
        </h2>

        <div className="w-24 h-[2px] bg-[#111111] mt-6 mb-10"></div>

        <p className="
                text-[18px]
                leading-[2]
                text-[#5C5C5C]
                font-light
                ">
            At <span className="font-semibold text-[#111111]">My Designers</span>,
            every product reflects the principles that define our brand. Whether it's
            a premium T-Shirt, custom printed gift, or personalized merchandise, our
            commitment remains the same.
        </p>

        <div className="space-y-14">

            {/* 1 */}
            <div>
            <h3 className="text-[26px] tracking-[3px] uppercase text-[#111111] mb-4">
                Authentic Craftsmanship
            </h3>

            <p className="text-[17px] leading-9 text-[#555555]">
                Every garment and custom product is manufactured with precision,
                attention to detail, and premium finishing. We focus on creating
                products that customers are proud to wear and gift.
            </p>
            </div>

            {/* 2 */}
            <div>
            <h3 className="text-[26px] tracking-[3px] uppercase text-[#111111] mb-4">
                Premium Quality
            </h3>

            <p className="text-[17px] leading-9 text-[#555555]">
                From breathable fabrics to high-definition printing and durable
                materials, quality remains our highest priority. Every order undergoes
                strict quality checks before delivery.
            </p>
            </div>

            {/* 3 */}
            <div>
            <h3 className="text-[26px] tracking-[3px] uppercase text-[#111111] mb-4">
                Creative Customization
            </h3>

            <p className="text-[17px] leading-9 text-[#555555]">
                We specialize in transforming ideas into reality through custom
                printing. Whether it's T-Shirts, Jerseys, Mugs, Mouse Pads, Glassware,
                Water Bottles, Photo Frames, or corporate gifts, every design is
                tailored to match your vision.
            </p>
            </div>

            {/* 4 */}
            <div>
            <h3 className="text-[26px] tracking-[3px] uppercase text-[#111111] mb-4">
                Customer First
            </h3>

            <p className="text-[17px] leading-9 text-[#555555]">
                Every customer receives personalized attention, transparent
                communication, reliable delivery, and responsive after-sales support.
                Building long-term relationships matters more than simply completing an
                order.
            </p>
            </div>

            {/* 5 */}
            <div>
            <h3 className="text-[26px] tracking-[3px] uppercase text-[#111111] mb-4">
                Innovation
            </h3>

            <p className="text-[17px] leading-9 text-[#555555]">
                We continuously explore new printing technologies, premium fabrics,
                modern fits, and creative personalization techniques to deliver
                products that stay ahead of trends while maintaining timeless appeal.
            </p>
            </div>

        </div>
    </section>

      {/* Step 2 - Welcome */}

      {/* Step 3 - Our Story */}

      {/* Step 4 - Products */}

      {/* Step 5 - Why Choose Us */}

      {/* Step 6 - Manufacturing */}

      {/* Step 7 - CTA */}

    </div>
  );
}