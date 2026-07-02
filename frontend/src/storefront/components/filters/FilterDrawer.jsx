import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronDown } from "lucide-react";

const MIN = 0;
const MAX = 5000;
const MIN_GAP = 100;

export default function FilterDrawer({
  open,
  onClose,
  filters,
  setFilters,
}) {
  // -----------------------------
  // Accordion States
  // -----------------------------

  const [availabilityOpen, setAvailabilityOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);

  // -----------------------------
  // Temporary Filter State
  // -----------------------------

  const [tempFilters, setTempFilters] = useState({
    min_price: "",
    max_price: "",
    in_stock_only: false,
  });

  // -----------------------------
  // Sync Parent -> Drawer
  // -----------------------------

  useEffect(() => {
    if (!open) return;

    setTempFilters({
      min_price: filters.min_price ?? "",
      max_price: filters.max_price ?? "",
      in_stock_only: filters.in_stock_only ?? false,
    });
  }, [open, filters]);

  // -----------------------------
  // Escape + Body Scroll
  // -----------------------------

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // -----------------------------
  // Values
  // -----------------------------

  const minValue = Number(tempFilters.min_price || MIN);
  const maxValue = Number(tempFilters.max_price || MAX);

  const left = (minValue / MAX) * 100;
  const right = (maxValue / MAX) * 100;

  const progressStyle = useMemo(() => {
    return {
      left: `${left}%`,
      width: `${right - left}%`,
    };
  }, [left, right]);

  // -----------------------------
  // Slider Handlers
  // -----------------------------

  const handleMinSlider = (e) => {
    const value = Math.min(
      Number(e.target.value),
      maxValue - MIN_GAP
    );

    setTempFilters((prev) => ({
      ...prev,
      min_price: value,
    }));
  };

  const handleMaxSlider = (e) => {
    const value = Math.max(
      Number(e.target.value),
      minValue + MIN_GAP
    );

    setTempFilters((prev) => ({
      ...prev,
      max_price: value,
    }));
  };

  // -----------------------------
  // Input Handlers
  // -----------------------------

  const handleMinInput = (e) => {
    let value = Number(e.target.value);

    if (Number.isNaN(value)) value = 0;

    value = Math.max(MIN, Math.min(value, maxValue - MIN_GAP));

    setTempFilters((prev) => ({
      ...prev,
      min_price: value,
    }));
  };

  const handleMaxInput = (e) => {
    let value = Number(e.target.value);

    if (Number.isNaN(value)) value = MAX;

    value = Math.min(MAX, Math.max(value, minValue + MIN_GAP));

    setTempFilters((prev) => ({
      ...prev,
      max_price: value,
    }));
  };

  // -----------------------------
  // Apply Filters
  // -----------------------------

  const applyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      ...tempFilters,
    }));

    onClose();
  };

  // -----------------------------
  // Clear Filters
  // -----------------------------

  const clearFilters = () => {
    setTempFilters({
      min_price: "",
      max_price: "",
      in_stock_only: false,
    });
  };

  
  return (
  <>

    {/* Overlay */}

    <div
      onClick={onClose}
      className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-all duration-300 ${
        open ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
    />

    {/* Drawer */}

    <div
      className={`fixed right-0 top-0 z-50 flex h-screen w-[420px] flex-col bg-[#111111] text-white shadow-2xl transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
        {/* Header */}

        <div className="flex items-center justify-between border-b border-[#2a2a2a] px-7 py-7">
          <h2 className="text-[34px] font-light uppercase tracking-[4px]">
            Filters
          </h2>

          <button
            onClick={onClose}
            className="transition hover:rotate-90"
          >
            <X
              size={28}
              strokeWidth={1.4}
            />
          </button>
        </div>

        {/* Body */}

        <div className="flex-1 overflow-y-auto">

          {/* Availability */}

          <div className="border-b border-[#2b2b2b]">

            <button
              onClick={() => setAvailabilityOpen(!availabilityOpen)}
              className="flex w-full items-center justify-between px-7 py-7"
            >
              <span className="text-[13px] uppercase tracking-[3px]">
                Availability
              </span>

              <ChevronDown
                size={18}
                className={`transition-transform duration-300 ${
                  availabilityOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                availabilityOpen ? "max-h-40 pb-8" : "max-h-0"
              }`}
            >
              <div className="px-7">

                <label className="flex cursor-pointer items-center gap-4">

                  <input
                    type="checkbox"
                    checked={tempFilters.in_stock_only}
                    onChange={(e) =>
                      setTempFilters((prev) => ({
                        ...prev,
                        in_stock_only: e.target.checked,
                      }))
                    }
                    className="h-5 w-5 accent-white"
                  />

                  <span className="text-[15px] text-gray-300">
                    In Stock Only
                  </span>

                </label>

              </div>
            </div>

          </div>

          {/* Price */}

          <div className="border-b border-[#2b2b2b]">

            <button
              onClick={() => setPriceOpen(!priceOpen)}
              className="flex w-full items-center justify-between px-7 py-7"
            >
              <span className="text-[13px] uppercase tracking-[3px]">
                Price
              </span>

              <ChevronDown
                size={18}
                className={`transition-transform duration-300 ${
                  priceOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                priceOpen ? "max-h-[500px]" : "max-h-0"
              }`}
            >
              <div className="px-7 pb-10">

                {/* Slider */}

                <div className="relative mt-6 h-10">

                  <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[#2d2d2d]" />

                  <div
                    style={progressStyle}
                    className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white"
                  />

                  {/* Min */}

                  <input
                    type="range"
                    min={MIN}
                    max={MAX}
                    value={minValue}
                    onChange={handleMinSlider}
                    className="slider absolute w-full"
                  />

                  {/* Max */}

                  <input
                    type="range"
                    min={MIN}
                    max={MAX}
                    value={maxValue}
                    onChange={handleMaxSlider}
                    className="slider absolute w-full"
                  />

                </div>

                {/* From / To */}

                <div className="mt-8 grid grid-cols-2 gap-4">

                  {/* From */}

                  <div>

                    <p className="mb-2 text-xs uppercase tracking-[2px] text-gray-400">
                      From
                    </p>

                    <div className="flex h-[52px] items-center rounded-md border border-[#343434] px-4">

                      <span className="mr-2 text-gray-400">
                        ₹
                      </span>

                      <input
                        type="number"
                        value={minValue}
                        onChange={handleMinInput}
                        className="w-full bg-transparent outline-none"
                      />

                    </div>

                  </div>

                  {/* To */}

                  <div>

                    <p className="mb-2 text-xs uppercase tracking-[2px] text-gray-400">
                      To
                    </p>

                    <div className="flex h-[52px] items-center rounded-md border border-[#343434] px-4">

                      <span className="mr-2 text-gray-400">
                        ₹
                      </span>

                      <input
                        type="number"
                        value={maxValue}
                        onChange={handleMaxInput}
                        className="w-full bg-transparent outline-none"
                      />

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>
                {/* Footer */}

        <div className="border-t border-[#2b2b2b] bg-[#111111] p-6">

          {/* Clear */}

          <button
            onClick={clearFilters}
            className="mb-4 w-full text-center text-[12px] uppercase tracking-[3px] text-gray-400 transition hover:text-white"
          >
            Clear Filters
          </button>

          {/* View Results */}

          <button
            onClick={applyFilters}
            className="
              flex
              h-[58px]
              w-full
              items-center
              justify-center
              rounded-md
              border
              border-white
              bg-white
              text-[13px]
              font-medium
              uppercase
              tracking-[3px]
              text-black
              transition-all
              duration-300
              hover:bg-[#111111]
              hover:text-white
            "
          >
            View Results
          </button>

        </div>

      </div>

    </>
  );
}