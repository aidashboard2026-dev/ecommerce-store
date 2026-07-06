import React, { useState, useEffect, useRef } from "react";
import { Search, X, Folder, Home, Loader2 } from "lucide-react";
import { routesAPI } from "@/shared/services/api";
import clsx from "clsx";

export default function RoutePicker({
  value,
  onChange,
  label = "Destination",
  placeholder = "Search category or homepage...",
  error,
  isDark = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Debounced search logic
  useEffect(() => {
    if (!isOpen || value) return;

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await routesAPI.search(searchQuery);
        setOptions(response.data || []);
      } catch (err) {
        console.error("Failed to search routes:", err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen, value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    onChange(opt.route, opt);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("", null);
    setSearchQuery("");
  };

  // Support styling for both dark and light modes, matching the themes of the pages
  const baseInputClass = "input-field w-full pr-10 pl-9.5";
  const darkInputStyle = isDark ? {
    background: "#111827",
    color: "#fff",
    borderColor: "#374151"
  } : {};

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      {label && (
        <label className={clsx(
          "block text-xs font-semibold",
          isDark ? "text-slate-400" : "text-app"
        )}>
          {label}
        </label>
      )}

      {value ? (
        // Read-only selected state
        <div className="relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {value === "/" ? <Home size={14} /> : <Folder size={14} />}
          </span>
          <input
            type="text"
            readOnly
            value={value}
            style={darkInputStyle}
            className={clsx(
              "input-field w-full pl-9.5 pr-10 cursor-not-allowed bg-opacity-50",
              isDark ? "bg-slate-800/50 border-slate-700 text-slate-300" : "bg-gray-50 text-gray-500"
            )}
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted hover:text-red-500 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        // Search input state
        <div className="relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            style={darkInputStyle}
            className={clsx(
              baseInputClass,
              error && "border-red-500/60 focus:border-red-500 focus:ring-red-500/10"
            )}
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              <Loader2 size={14} className="animate-spin" />
            </span>
          )}

          {isOpen && (
            <div className={clsx(
              "absolute z-50 mt-1 w-full rounded-md border shadow-lg max-h-60 overflow-auto",
              isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-surface border-app text-app"
            )}>
              {loading && options.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted flex items-center justify-center gap-2">
                  <Loader2 size={12} className="animate-spin" /> Searching...
                </div>
              ) : options.length > 0 ? (
                <div className="py-1">
                  {options.map((opt) => (
                    <div
                      key={opt.route}
                      onClick={() => handleSelect(opt)}
                      className={clsx(
                        "flex items-center justify-between px-3 py-2 text-xs cursor-pointer select-none",
                        isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-app text-app"
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        {opt.route === "/" ? <Home size={13} className="text-muted" /> : <Folder size={13} className="text-muted" />}
                        <span>{opt.name}</span>
                      </div>
                      <span className="text-[10px] text-muted font-mono">{opt.route}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-xs text-muted font-semibold">
                  No destinations found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[10px] font-semibold text-red-500">{error}</p>}
    </div>
  );
}
