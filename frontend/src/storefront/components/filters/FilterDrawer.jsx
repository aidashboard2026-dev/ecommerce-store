import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronDown } from "lucide-react";

const MIN = 0;
const MAX = 5000;
const MIN_GAP = 100;

export default function FilterDrawer({ open, onClose, filters, setFilters }) {
  const [availabilityOpen, setAvailabilityOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);

  const [tempFilters, setTempFilters] = useState({
    min_price: "",
    max_price: "",
    in_stock_only: false,
  });

  useEffect(() => {
    if (!open) return;

    setTempFilters({
      min_price: filters.min_price ?? "",
      max_price: filters.max_price ?? "",
      in_stock_only: filters.in_stock_only ?? false,
    });
  }, [open, filters]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const minValue = Number(tempFilters.min_price || MIN);
  const maxValue = Number(tempFilters.max_price || MAX);

  const left = (minValue / MAX) * 100;
  const right = (maxValue / MAX) * 100;

  const progressStyle = useMemo(
    () => ({
      left: `${left}%`,
      width: `${right - left}%`,
    }),
    [left, right],
  );

  const handleMinSlider = (e) => {
    const value = Math.min(Number(e.target.value), maxValue - MIN_GAP);

    setTempFilters((prev) => ({
      ...prev,
      min_price: value,
    }));
  };

  const handleMaxSlider = (e) => {
    const value = Math.max(Number(e.target.value), minValue + MIN_GAP);

    setTempFilters((prev) => ({
      ...prev,
      max_price: value,
    }));
  };

  const handleMinInput = (e) => {
    let value = Number(e.target.value);

    if (Number.isNaN(value)) value = MIN;

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

  const applyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      ...tempFilters,
    }));

    onClose();
  };

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
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-[420px] flex-col bg-surface text-app border-l border-border shadow-elevated transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-6 bg-surface">
          <div>
            <h2 className="text-2xl font-semibold text-app">Filters</h2>
            <p className="mt-1 text-sm text-muted">
              Refine your product results
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Availability */}
          <div className="border-b border-border">
            <button
              onClick={() => setAvailabilityOpen(!availabilityOpen)}
              className="flex w-full items-center justify-between px-6 py-5 transition-colors hover:bg-surface-hover"
            >
              <span className="text-sm font-medium uppercase tracking-wider text-app">
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
                availabilityOpen ? "max-h-32" : "max-h-0"
              }`}
            >
              <div className="px-6 pb-6">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-app px-4 py-3 hover:bg-surface-hover">
                  <input
                    type="checkbox"
                    checked={tempFilters.in_stock_only}
                    onChange={(e) =>
                      setTempFilters((prev) => ({
                        ...prev,
                        in_stock_only: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-brand-500"
                  />

                  <span className="text-sm text-app">
                    Show only products in stock
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="border-b border-border">
            <button
              onClick={() => setPriceOpen(!priceOpen)}
              className="flex w-full items-center justify-between px-6 py-5 transition-colors hover:bg-surface-hover"
            >
              <span className="text-sm font-medium uppercase tracking-wider text-app">
                Price Range
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
                priceOpen ? "max-h-[520px]" : "max-h-0"
              }`}
            >
              <div className="px-6 pb-8">
                {/* Range Slider */}
                <div className="relative mt-6 h-10">
                  <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-border" />

                  <div
                    style={progressStyle}
                    className="absolute top-1/2 h-1 -translate-y-1/2 bg-orange-300 rounded-full"
                  />

                  <input
                    type="range"
                    min={MIN}
                    max={MAX}
                    value={minValue}
                    onChange={handleMinSlider}
                    className="slider absolute w-full"
                  />

                  <input
                    type="range"
                    min={MIN}
                    max={MAX}
                    value={maxValue}
                    onChange={handleMaxSlider}
                    className="slider absolute w-full"
                  />
                </div>
                {/* Price Inputs */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {/* Minimum Price */}
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider">
                      Minimum
                    </label>

                    <div className="flex h-12 items-center rounded-xl border border-border bg-app px-4 transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                      <span className="mr-2 text-muted">₹</span>

                      <input
                        type="number"
                        value={minValue}
                        onChange={handleMinInput}
                        className="w-full bg-transparent text-app outline-none placeholder:text-muted"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Maximum Price */}
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider">
                      Maximum
                    </label>

                    <div className="flex h-12 items-center rounded-xl border border-border bg-app px-4 transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                      <span className="mr-2 text-muted">₹</span>

                      <input
                        type="number"
                        value={maxValue}
                        onChange={handleMaxInput}
                        className="w-full bg-transparent text-app outline-none placeholder:text-muted"
                        placeholder="5000"
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Price */}
                <div className="mt-6 rounded-xl border border-border bg-app p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Selected Range</span>

                    <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-semibold">
                      ₹{minValue} - ₹{maxValue}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-surface p-6">
          <button
            onClick={clearFilters}
            className="mb-4 w-full rounded-xl border border-border py-3 text-sm font-medium text-muted transition-all duration-200 hover:bg-surface-hover hover:text-app"
          >
            Clear Filters
          </button>

          <button
            onClick={applyFilters}
          className="flex h-14 w-full items-center justify-center rounded-xl bg-black text-sm font-semibold text-white transition-all duration-300 hover:bg-neutral-800 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            Apply Filters
          </button>
        </div>
      </aside>
    </>
  );
}
