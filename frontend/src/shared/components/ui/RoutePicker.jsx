import React, { useState, useEffect, useRef } from "react";
import { Search, X, Folder, Home, Loader2, Link as LinkIcon } from "lucide-react";
import { routesAPI } from "@/shared/services/api";
import clsx from "clsx";

function getRouteDisplayName(route, options = [], fixedOptions = null) {
  if (!route) return "";
  
  // First, check if there's a match in options (in case the option was just loaded or we have it)
  const lookupList = fixedOptions || options;
  const matched = lookupList.find(o => o.route === route);
  if (matched) return matched.name;
  
  // Fallbacks
  if (route === "/") return "Homepage";
  if (route === "/custom-products") return "Custom Product";
  
  // Resolve categories/collections/products by parsing route
  if (route.startsWith("/products?category=")) {
    const slug = route.split("=")[1];
    // capitalize slug words
    const name = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return `Category: ${name}`;
  }
  if (route.startsWith("/products?collection=")) {
    const slug = route.split("=")[1];
    const name = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return `Collection: ${name}`;
  }
  if (route.startsWith("/products/")) {
    const slug = route.substring("/products/".length);
    const name = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return `Product: ${name}`;
  }
  
  return route;
}

export default function RoutePicker({
  value,
  onChange,
  label = "Destination",
  placeholder = "Select a destination...",
  error,
  isDark = false,
  fixedOptions = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);

  // Sync searchQuery with the selected value's display name when value changes
  useEffect(() => {
    if (value) {
      setSearchQuery(getRouteDisplayName(value, options, fixedOptions));
    } else {
      setSearchQuery("");
    }
  }, [value, fixedOptions]);

  // Debounced search logic
  useEffect(() => {
    if (!isOpen) return;

    // If query matches the selected value's display name, query with "" to show all options
    const selectedDisplayName = value ? getRouteDisplayName(value, options, fixedOptions) : "";
    const isShowingSelectedValueName = value && searchQuery === selectedDisplayName;
    const query = isShowingSelectedValueName ? "" : searchQuery;

    if (fixedOptions) {
      // Client-side filtering of fixedOptions
      const q = query.toLowerCase().trim();
      const filtered = fixedOptions.filter(opt => 
        !q || opt.name.toLowerCase().includes(q) || opt.route.toLowerCase().includes(q)
      );
      setOptions(filtered);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await routesAPI.search(query);
        let fetchedOptions = response.data || [];

        // Add Custom Product option
        const customProductOpt = {
          type: "custom-product",
          id: null,
          title: "Custom Product",
          name: "Custom Product",
          slug: "custom-product",
          route: "/custom-products"
        };

        const q = query.toLowerCase().trim();
        if (!q || "custom product".includes(q) || "custom-products".includes(q)) {
          fetchedOptions.push(customProductOpt);
        }

        // Deduplicate options by route to prevent key warnings and visual duplication
        const uniqueOptions = [];
        const seenRoutes = new Set();
        for (const opt of fetchedOptions) {
          if (!seenRoutes.has(opt.route)) {
            seenRoutes.add(opt.route);
            uniqueOptions.push(opt);
          }
        }

        setOptions(uniqueOptions);
      } catch (err) {
        console.error("Failed to search routes:", err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen, value, fixedOptions]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // If clicked outside without choosing a new one, restore the selected value's display name
        if (value) {
          setSearchQuery(getRouteDisplayName(value, options, fixedOptions));
        } else {
          setSearchQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, options, fixedOptions]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [options]);

  const handleSelect = (opt) => {
    onChange(opt.route, opt);
    setSearchQuery(opt.name);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("", null);
    setSearchQuery("");
    setIsOpen(true);
  };

  const darkInputStyle = isDark ? {
    background: "#111827",
    color: "#fff",
    borderColor: "#374151"
  } : {};

  const inputStyle = {
    ...darkInputStyle,
    paddingLeft: "38px",
    paddingRight: "38px"
  };

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

      <div className="relative w-full">
        {/* Left Icon (Home, LinkIcon, or Search) */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none z-10 flex items-center justify-center">
          {value === "/" ? <Home size={14} /> : value ? <LinkIcon size={14} /> : <Search size={14} />}
        </span>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          onClick={() => {
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIsOpen(true);
              setFocusedIndex((prev) => (options.length > 0 ? (prev + 1) % options.length : -1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIsOpen(true);
              setFocusedIndex((prev) => (options.length > 0 ? (prev - 1 + options.length) % options.length : -1));
            } else if (e.key === "Enter") {
              if (isOpen && focusedIndex >= 0 && options[focusedIndex]) {
                e.preventDefault();
                handleSelect(options[focusedIndex]);
              }
            } else if (e.key === "Escape") {
              setIsOpen(false);
              if (value) {
                setSearchQuery(getRouteDisplayName(value, options, fixedOptions));
              }
            }
          }}
          placeholder={placeholder}
          style={inputStyle}
          className={clsx(
            "input-field w-full",
            error && "border-red-500/60 focus:border-red-500 focus:ring-red-500/10"
          )}
        />

        {/* Indicators and buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <span className="text-muted flex items-center justify-center p-1">
              <Loader2 size={14} className="animate-spin" />
            </span>
          )}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center text-muted hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, padding: 0 }}
              aria-label="Clear destination"
            >
              <X size={15} />
            </button>
          )}
        </div>

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
                {options.map((opt, idx) => (
                  <div
                    key={`${opt.type}_${opt.id ?? opt.route}`}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={clsx(
                      "flex items-center justify-between px-3 py-2 text-xs cursor-pointer select-none",
                      isDark ? "text-slate-200" : "text-app",
                      focusedIndex === idx
                        ? (isDark ? "bg-slate-700" : "bg-gray-100")
                        : (isDark ? "hover:bg-slate-700" : "hover:bg-gray-50")
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

      {error && <p className="text-[10px] font-semibold text-red-500">{error}</p>}
    </div>
  );
}
