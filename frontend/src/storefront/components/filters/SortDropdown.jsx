import { useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";

const SORT_OPTIONS = [
  {
    label: "Featured",
    value: "featured",
  },
  {
    label: "Best Seller",
    value: "best_seller",
  },
  {
    label: "Trending",
    value: "trending",
  },
  {
    label: "New Arrival",
    value: "new_arrival",
  },
  {
    label: "Alphabetically, A-Z",
    value: "name_asc",
  },
  {
    label: "Alphabetically, Z-A",
    value: "name_desc",
  },
  {
    label: "Price, low to high",
    value: "price_asc",
  },
  {
    label: "Price, high to low",
    value: "price_desc",
  },
  {
    label: "Date, old to new",
    value: "oldest",
  },
  {
    label: "Date, new to old",
    value: "newest",
  },
];

export default function SortDropdown({
  value = "featured",
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  const handleSelect = (option) => {
    onChange?.(option.value);
    setOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className="relative h-full flex-1 sm:flex-none"
    >
      {/* Header */}

      <button
        onClick={() => setOpen(!open)}
        className="focus-ring flex h-full w-full min-w-[9rem] items-center justify-center gap-2 px-4 text-[12px] uppercase tracking-[3px] text-app transition hover:bg-surface sm:w-[160px] sm:px-6"
      >
        <span>Sort By</span>

        <ChevronUp
          size={14}
          className={`transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}

      <div
        className={`absolute right-0 top-full z-50 mt-px w-[min(230px,calc(100vw-2rem))] origin-top overflow-hidden rounded-md bg-[#111111] shadow-[0_10px_40px_rgba(0,0,0,.45)] transition-all duration-300
        ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0"
        }`}
      >
        {SORT_OPTIONS.map((item) => (
          <button
            key={item.value}
            onClick={() => handleSelect(item)}
            className={`block w-full px-5 py-[11px] text-left text-[15px] transition
              ${
                value === item.value
                  ? "bg-[#1a1a1a] text-white"
                  : "text-gray-300 hover:bg-[#1a1a1a] hover:text-white"
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
