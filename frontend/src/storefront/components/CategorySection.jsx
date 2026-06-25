import React from "react";
import { Link } from "react-router-dom";

import StreetwearImg from "../assets/categories/tshirt.jpg";
import ActivewearImg from "../assets/categories/halfpant.jpeg";
import EssentialsImg from "../assets/categories/trackpant1.jpg";
import AccessoriesImg from "../assets/categories/custom.jpg";

const CATEGORIES = [
  {
    name: "Streetwear",
    collection: "Streetwear",
    image: StreetwearImg,
  },
  {
    name: "Activewear",
    collection: "Activewear",
    image: ActivewearImg,
  },
  {
    name: "Essentials",
    collection: "Essentials",
    image: EssentialsImg,
  },
  {
    name: "Accessories",
    collection: "Accessories",
    image: AccessoriesImg,
  },
];

export default function CategorySection() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="font-display font-bold text-xl sm:text-2xl text-app mb-6">
        Shop by Category
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.name}
            to={`/products?collection=${encodeURIComponent(cat.collection)}`}
            className="group overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className="overflow-hidden">
              <img
                src={cat.image}
                alt={cat.name}
                className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            <div className="p-4 text-center">
              <h3 className="text-lg font-semibold text-app">{cat.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
