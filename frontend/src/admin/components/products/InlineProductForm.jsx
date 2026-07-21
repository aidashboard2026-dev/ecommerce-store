import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  Camera,
  Layers,
  ImageIcon,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  productsAPI as productsApi,
  categoriesAPI,
  collectionsAPI,
} from "@/shared/services/api";
import {
  formatPrice,
  getImageUrl,
  revokeObjectURLs,
  genLocalId,
  isDuplicateFile,
} from "@/shared/utils/productUtils";
import useBusinessLimits from "@/shared/hooks/useBusinessLimits";
import ImageUploadModal from "./ImageUploadModal";

import Select from "@/shared/components/ui/Select";
import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/shared/components/ui/Table";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_OPTIONS = ["draft", "published", "archived"];
const MAX_IMAGES = 7;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
// COLLECTION_OPTIONS kept from branch â€” used as fallback display labels only;
// the actual dropdown is driven by the collections API (FK-based).
const COLLECTION_OPTIONS = [
  "Oversized",
  "Essentials",
  "Streetwear",
  "Bottoms",
  "Summer",
  "Hoodies",
  "Joggers",
  "Limited Edition",
];

// â”€â”€â”€ Blank variant form (module-level â€” stable ref, no hook needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BLANK_VARIANT_FORM = {
  size: "M",
  color: "",
  color_hex: "",
  sku: "",
  original_price: "",
  selling_price: "",
  discount_percentage: "",
  stock_quantity: "",
  low_stock_threshold: 5,
};

const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error) return fallback;

  // Axios error â†’ backend response data
  const data = error?.response?.data ?? error;

  // Normal string error
  if (typeof data === "string") {
    return data;
  }

  // Handle FastAPI detail
  if (data?.detail !== undefined) {
    return getErrorMessage(data.detail, fallback);
  }

  // Handle backend: { errors: ... }
  if (data?.errors !== undefined) {
    return getErrorMessage(data.errors, fallback);
  }

  // Handle arrays such as FastAPI validation errors
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        const field = Array.isArray(item?.loc)
          ? item.loc.filter((part) => part !== "body").join(" â†’ ")
          : "";

        const message =
          item?.msg || item?.message || getErrorMessage(item, "Invalid value");

        return field ? `${field}: ${message}` : message;
      })
      .filter(Boolean)
      .join(", ");
  }

  // Handle normal JavaScript/Axios error
  if (typeof data?.message === "string") {
    return data.message;
  }

  // Handle object such as:
  // { selling_price: "Invalid price" }
  if (typeof data === "object") {
    const messages = Object.entries(data)
      .map(([field, value]) => {
        const message = getErrorMessage(value, "");

        return message ? `${field}: ${message}` : "";
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  return fallback;
};

// â”€â”€â”€ Shared primitives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FormField({ label, required, hint, htmlFor, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="block text-[11px] font-medium text-muted"
        >
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted italic">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// Branch versions: properly use clsx + component props (HEAD had broken duplicate
// StyledInput definition and referenced undefined `inputCls`).
function StyledInput({ className, ...props }) {
  return <Input className={`py-1.5 text-sm ${className || ""}`} {...props} />;
}

function StyledSelect({ children, className, ...props }) {
  return (
    <Select className={`py-1.5 text-sm ${className || ""}`} {...props}>
      {children}
    </Select>
  );
}

// â”€â”€â”€ Stock badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StockBadge({ stock }) {
  if (stock === 0) return <Badge label="Out" variant="danger" dot />;
  if (stock <= 5) return <Badge label={`${stock} Low`} variant="warning" dot />;
  return <Badge label={`${stock} stock`} variant="success" />;
}

// â”€â”€â”€ Creatable size selector with suggestions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CreatableSizeSelect({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value || '')
  const containerRef = useRef(null)

  useEffect(() => {
    setSearch(value || '')
  }, [value])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        const trimmed = search.trim()
        if (trimmed && trimmed !== value) {
          onChange(trimmed)
        } else {
          setSearch(value || '')
        }
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [search, value, onChange])

  const SUGGESTED_SIZES = [
    'XS', 'S', 'M', 'L', 'XL', 'XXL',
    '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42', '44',
    'Free Size', '3XL'
  ]

  const filteredSuggestions = SUGGESTED_SIZES.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  )

  const showCreateOption = search.trim() !== '' && !SUGGESTED_SIZES.some(s => s.toLowerCase() === search.trim().toLowerCase())

  const handleSelect = (val) => {
    onChange(val)
    setSearch(val)
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const trimmed = search.trim()
      if (trimmed) {
        handleSelect(trimmed)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch(value || '')
    }
  }

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Select or type size..."
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className="w-full py-1.5 pl-3 pr-8 text-sm bg-surface border border-app rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-muted disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => { if (!disabled) setIsOpen(prev => !prev) }}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-app p-0.5 focus:outline-none disabled:opacity-50"
        >
          <ChevronDown size={14} className="transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-app rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-brand-500/10 hover:text-brand-500 transition-colors focus:outline-none"
              >
                {s}
              </button>
            ))
          ) : !showCreateOption ? (
            <div className="px-3 py-2 text-xs text-muted">No suggestions</div>
          ) : null}

          {showCreateOption && (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="w-full text-left px-3 py-1.5 text-xs text-brand-500 font-semibold border-t border-app hover:bg-brand-500/10 transition-colors focus:outline-none"
            >
              Create "{search.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CreatableColorSelect({ value, onChange, onHexChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value || '')
  const [resolving, setResolving] = useState(false)
  const containerRef = useRef(null)

  const { data: backendColors = [] } = useQuery({
    queryKey: ['backend-colors'],
    queryFn: async () => {
      const res = await productsApi.getColors()
      return res.data || []
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  useEffect(() => {
    setSearch(value || '')
  }, [value])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        const trimmed = search.trim()
        if (trimmed && trimmed !== value) {
          handleSelect(trimmed)
        } else {
          setSearch(value || '')
        }
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [search, value, onChange, backendColors])

  const filteredSuggestions = backendColors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const showCreateOption = search.trim() !== '' && !backendColors.some(c => c.name.toLowerCase() === search.trim().toLowerCase())

  const handleSelect = async (val) => {
    const matched = backendColors.find(c => c.name.toLowerCase() === val.toLowerCase())
    onChange(val)
    setSearch(val)
    if (matched) {
      onHexChange(matched.hex)
    } else {
      setResolving(true)
      try {
        const res = await productsApi.resolveColor(val)
        if (res.data?.found && res.data.hex) {
          onHexChange(res.data.hex)
        }
      } catch {
        // resolve failed â€” leave hex editable
      } finally {
        setResolving(false)
      }
    }
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const trimmed = search.trim()
      if (trimmed) {
        handleSelect(trimmed)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch(value || '')
    }
  }

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Select or type color..."
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className="w-full py-1.5 pl-3 pr-8 text-sm bg-surface border border-app rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-muted disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => { if (!disabled) setIsOpen(prev => !prev) }}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-app p-0.5 focus:outline-none disabled:opacity-50"
        >
          <ChevronDown size={14} className="transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-app rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map(c => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleSelect(c.name)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-brand-500/10 hover:text-brand-500 transition-colors focus:outline-none flex items-center justify-between"
              >
                <span>{c.name}</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted font-mono">{c.hex}</span>
                  <span className="w-2.5 h-2.5 rounded-full border border-app" style={{ backgroundColor: c.hex }} />
                </span>
              </button>
            ))
          ) : !showCreateOption ? (
            <div className="px-3 py-2 text-xs text-muted">No suggestions</div>
          ) : null}

          {showCreateOption && (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="w-full text-left px-3 py-1.5 text-xs text-brand-500 font-semibold border-t border-app hover:bg-brand-500/10 transition-colors focus:outline-none"
            >
              Create "{search.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ Save Progress Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SaveProgressOverlay({ steps, onClose }) {
  const hasError = steps.some((s) => s.status === "error");
  const allDone = steps.every(
    (s) => s.status === "done" || s.status === "error",
  );
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Save progress"
    >
      <div className="bg-app border border-app rounded-2xl p-6 w-80 shadow-2xl space-y-4">
        <p className="text-sm font-semibold text-app">
          {hasError && allDone ? "Completed with issues" : "Saving productâ€¦"}
        </p>
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center mt-0.5">
                {step.status === "done" && (
                  <CheckCircle size={18} className="text-green-500" />
                )}
                {step.status === "loading" && (
                  <Loader2 size={18} className="text-brand-500 animate-spin" />
                )}
                {step.status === "error" && (
                  <AlertTriangle size={18} className="text-red-400" />
                )}
                {step.status === "pending" && (
                  <div className="w-4 h-4 rounded-full border-2 border-app" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-xs ${
                    step.status === "done"
                      ? "text-green-500 line-through"
                      : step.status === "loading"
                        ? "text-app font-semibold"
                        : step.status === "error"
                          ? "text-red-400"
                          : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
                {step.details && (
                  <p
                    className={`text-[10px] mt-0.5 ${
                      step.status === "error" ? "text-red-400/80" : "text-muted"
                    }`}
                  >
                    {getErrorMessage(step.details, "Operation failed")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Branch: <Button> component; HEAD had raw <button> â€” Button is correct here */}
        {hasError && allDone && onClose && (
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="w-full"
          >
            Close
          </Button>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Local Variant Form (new product only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LocalVariantForm({ onAdd, existingVariants = [], limits }) {
  const [form, setForm] = useState(BLANK_VARIANT_FORM);
  const [open, setOpen] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const orig = parseFloat(form.original_price);
    const sell = parseFloat(form.selling_price);
    if (orig > 0 && sell > 0 && sell <= orig) {
      set("discount_percentage", (((orig - sell) / orig) * 100).toFixed(2));
    }
  }, [form.original_price, form.selling_price]);

  const sellNum = parseFloat(form.selling_price || 0);
  const origNum = parseFloat(form.original_price || 0);
  // HEAD named this `priceErr` â€” branch renamed to `priceError` but forgot to
  // update the JSX references, causing a ReferenceError. Keeping `priceErr`.
  const priceErr =
    !isNaN(sellNum) &&
    !isNaN(origNum) &&
    sellNum > origNum &&
    form.selling_price !== "";

  const handleAdd = () => {
    if (!limits) {
      toast.error("Store limits not loaded yet. Please wait.");
      return;
    }
    const trimmedSize = form.size ? form.size.trim() : "";
    const trimmedColor = form.color ? form.color.trim() : "";
    if (!trimmedSize) {
      toast.error("Size is required");
      return;
    }
    if (!form.original_price || !form.selling_price) {
      toast.error("Price fields required");
      return;
    }
    if (priceErr) {
      toast.error("Selling price cannot exceed original price");
      return;
    }
    const stockQty = parseInt(form.stock_quantity || 0, 10);
    if (stockQty < 0) {
      toast.error("Stock cannot be negative");
      return;
    }
    const dupExists = existingVariants.some(
      (v) => (v.size || "").trim().toLowerCase() === trimmedSize.toLowerCase() && (v.color || "").trim().toLowerCase() === trimmedColor.toLowerCase(),
    );
    if (dupExists) {
      toast.error(
        `Variant with size "${trimmedSize}" and color "${trimmedColor || "none"}" already exists`,
      );
      return;
    }
    const newColorNormalized = trimmedColor.toLowerCase();
    const uniqueColorsNormalized = new Set(
      existingVariants
        .map((v) => (v.color ? v.color.trim().toLowerCase() : ""))
        .filter(Boolean),
    );
    const newSizeNormalized = trimmedSize.toUpperCase();
    const uniqueSizesNormalized = new Set(
      existingVariants
        .map((v) => (v.size ? v.size.trim().toUpperCase() : ""))
        .filter(Boolean),
    );

    if (existingVariants.length >= limits.max_product_variants) {
      toast.error(
        `Maximum of ${limits.max_product_variants} variants allowed for a product. Please delete an existing variant before adding another.`,
      );
      return;
    }
    if (
      newSizeNormalized &&
      !uniqueSizesNormalized.has(newSizeNormalized) &&
      uniqueSizesNormalized.size >= limits.max_sizes
    ) {
      toast.error(
        `Maximum of ${limits.max_sizes} sizes allowed for a product. Please delete an existing size before adding another.`,
      );
      return;
    }
    if (
      newColorNormalized &&
      !uniqueColorsNormalized.has(newColorNormalized) &&
      uniqueColorsNormalized.size >= limits.max_colors
    ) {
      toast.error(
        `Maximum of ${limits.max_colors} colors allowed for a product. Please delete an existing color before adding another.`,
      );
      return;
    }
    onAdd({
      _localId: genLocalId(),
      size: trimmedSize,
      color: trimmedColor || undefined,
      color_hex: form.color_hex || undefined,
      sku: form.sku.trim() || undefined,
      original_price: parseFloat(form.original_price),
      selling_price: parseFloat(form.selling_price),
      discount_percentage: parseFloat(form.discount_percentage) || 0,
      stock_quantity: stockQty,
      low_stock_threshold: parseInt(form.low_stock_threshold || 5, 10),
    });
    setForm(BLANK_VARIANT_FORM);
    setOpen(false);
  };

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        size="sm"
        icon={Plus}
        variant="addvariant"
        className="min-w-[100px] whitespace-nowrap hover:bg-sky-400 hover:border-sky-600"
      >
        Add Variant
      </Button>
    );
  }

  return (
    <div className="w-full border border-app rounded-xl p-4 space-y-4 mt-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
        New Variant
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center text-center">
        <FormField label="Size" required>
          <CreatableSizeSelect
            value={form.size}
            onChange={(val) => set("size", val)}
          />
        </FormField>
        <FormField label="Color">
          <CreatableColorSelect
            value={form.color}
            onChange={(val) => set("color", val)}
            onHexChange={(hex) => set("color_hex", hex)}
          />
        </FormField>
        <FormField label="Color Hex">
          <div className="relative">
            <StyledInput
              value={form.color_hex}
              onChange={(e) => set("color_hex", e.target.value)}
              placeholder="#1A1A1A"
            />
            {/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.color_hex) && (
              <span
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-app"
                style={{ background: form.color_hex }}
              />
            )}
          </div>
        </FormField>
        <FormField label="SKU" hint="auto if blank">
          <StyledInput
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="auto"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <FormField label="Original Price" required>
          {/* Branch: added number spinner suppression classes */}
          <StyledInput
            type="number"
            min="0.01"
            step="0.01"
            value={form.original_price}
            onChange={(e) => set("original_price", e.target.value)}
            placeholder="999"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </FormField>
        <FormField label="Selling Price" required>
          <StyledInput
            type="number"
            min="0.01"
            step="0.01"
            value={form.selling_price}
            onChange={(e) => set("selling_price", e.target.value)}
            placeholder="799"
            className={`${priceErr ? "border-red-400 focus:ring-red-400/30" : ""} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
        </FormField>
        <FormField label="Discount %">
          <StyledInput
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.discount_percentage}
            onChange={(e) => set("discount_percentage", e.target.value)}
            placeholder="0"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            readOnly={!!(form.original_price && form.selling_price)}
          />
        </FormField>
        <FormField label="Stock">
          <StyledInput
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={(e) => set("stock_quantity", e.target.value)}
            placeholder="Enter Stock Quantity"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </FormField>
        <FormField label="Low Stock Alert">
          <StyledInput
            type="number" min="0"
            value={form.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)}
            placeholder="5"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </FormField>
      </div>

      {priceErr && (
        <p className="text-xs text-red-500 flex items-center gap-1.5">
          <AlertTriangle size={12} /> Selling price cannot exceed original price
        </p>
      )}

      <div className="flex items-center gap-2 w-full pt-1">
        <Button
          type="button"
          onClick={handleAdd}
          disabled={priceErr}
          variant="addvariant"
          className="min-w-[100px] whitespace-nowrap hover:bg-sky-400 hover:border-sky-600"
        >
          Add Variant
        </Button>
        <Button
          type="button"
          onClick={() => {
            setOpen(false);
            setForm(BLANK_VARIANT_FORM);
          }}
          variant="delete"
          className="whitespace-nowrap hover:bg-red-500 hover:border hover:border-red-500"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function VariantInlineForm({ productId, product, editingVariantId, onClose, limits }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(BLANK_VARIANT_FORM)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const isEditMode = editingVariantId !== null && editingVariantId !== undefined
  const containerRef = useRef(null)

  // Scroll smoothly when opened
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [editingVariantId])

  useEffect(() => {
    if (isEditMode) {
      const variant = product?.variants?.find(v => v.id === editingVariantId)
      if (variant) {
        setForm({
          size: variant.size,
          color: variant.color || '',
          color_hex: variant.color_hex || '',
          sku: variant.sku || '',
          original_price: String(variant.original_price),
          selling_price: String(variant.selling_price),
          discount_percentage: String(variant.discount_percentage || '0'),
          stock_quantity: String(variant.stock_quantity ?? ''),
          low_stock_threshold: variant.low_stock_threshold || 5,
          barcode: variant.barcode || '',
          status: variant.status || 'active',
          image_url: variant.image_url || '',
        })
      }
    } else {
      setForm(BLANK_VARIANT_FORM)
    }
  }, [editingVariantId, product, isEditMode])

  useEffect(() => {
    const orig = parseFloat(form.original_price)
    const sell = parseFloat(form.selling_price)
    if (orig > 0 && sell > 0 && sell <= orig) {
      set('discount_percentage', (((orig - sell) / orig) * 100).toFixed(2))
    }
  }, [form.original_price, form.selling_price])

  const mutation = useMutation({
    mutationFn: data => {
      if (import.meta.env.DEV) console.log('[DEBUG] Variant API request start', { productId, editingVariantId, data })
      if (isEditMode) {
        return productsApi.updateVariant(productId, editingVariantId, data)
      } else {
        return productsApi.createVariant(productId, data)
      }
    },
    onSuccess: (response) => {
      if (import.meta.env.DEV) console.log('[DEBUG] Variant API success response', response)
      toast.success(isEditMode ? 'Variant updated successfully.' : 'Variant added successfully.')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', productId] })
      qc.invalidateQueries({ queryKey: ['product'] })
      onClose()
    },
    onError: e => {
      console.error('[DEBUG] Variant API error', e)
      toast.error(getErrorMessage(e, 'SKU may already exist'))
    },
  })

  const existingVariants = product?.variants || []
  const newColorNormalized = form.color ? form.color.trim().toLowerCase() : ""
  const uniqueColorsNormalized = new Set(existingVariants.map(v => v.color ? v.color.trim().toLowerCase() : "").filter(Boolean))
  const newSizeNormalized = form.size ? form.size.trim().toUpperCase() : ""
  const uniqueSizesNormalized = new Set(existingVariants.map(v => v.size ? v.size.trim().toUpperCase() : "").filter(Boolean))

  const isVariantsLimitReached = limits ? existingVariants.length >= limits.max_product_variants : false
  const isSizesLimitReached = (limits && newSizeNormalized && !uniqueSizesNormalized.has(newSizeNormalized)) ? uniqueSizesNormalized.size >= limits.max_sizes : false
  const isColorsLimitReached = (limits && newColorNormalized && !uniqueColorsNormalized.has(newColorNormalized)) ? uniqueColorsNormalized.size >= limits.max_colors : false
  
  const showLimits = !isEditMode
  const anyLimitReached = showLimits && (!limits || isVariantsLimitReached || isSizesLimitReached || isColorsLimitReached)
  const disabledTitle = !limits ? "Loading store configuration..." : anyLimitReached ? `Maximum limit reached.\nDelete an existing item to continue.` : ""

  const handleSubmit = e => {
    if (e && e.preventDefault) e.preventDefault()
    if (e && e.stopPropagation) e.stopPropagation()
    if (import.meta.env.DEV) console.log('[DEBUG] Variant form submission triggered', { isEditMode, editingVariantId, form })
    if (!limits) {
      toast.error("Store limits not loaded yet. Please wait.")
      return
    }
    const trimmedSize = form.size ? form.size.trim() : "";
    const trimmedColor = form.color ? form.color.trim() : "";
    if (!trimmedSize) {
      toast.error("Size is required");
      return;
    }
    const orig = parseFloat(form.original_price)
    const sell = parseFloat(form.selling_price)
    if (sell > orig) {
      toast.error('Selling price cannot exceed original price')
      return
    }

    // Prevent duplicate size and color combination
    const dupExists = existingVariants.some(
      (v) => v.id !== editingVariantId && (v.size || "").trim().toLowerCase() === trimmedSize.toLowerCase() && (v.color || "").trim().toLowerCase() === trimmedColor.toLowerCase(),
    );
    if (dupExists) {
      toast.error(
        `Variant with size "${trimmedSize}" and color "${trimmedColor || "none"}" already exists`,
      );
      return;
    }

    if (!isEditMode) {
      if (isVariantsLimitReached) {
        toast.error(
          <div>
            <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
            <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
              You have reached the maximum allowed limit of {limits.max_product_variants} variants for this product.{"\n"}Please delete an existing variant before adding a new one.
            </div>
          </div>
        );
        return
      }
      if (isSizesLimitReached) {
        toast.error(
          <div>
            <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
            <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
              You have reached the maximum allowed limit of {limits.max_sizes} sizes for this product.{"\n"}Please delete an existing size before adding a new one.
            </div>
          </div>
        );
        return
      }
      if (isColorsLimitReached) {
        toast.error(
          <div>
            <strong style={{ display: "block", marginBottom: "4px" }}>Maximum Limit Reached</strong>
            <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: "1.4" }}>
              You have reached the maximum allowed limit of {limits.max_colors} colors for this product.{"\n"}Please delete an existing color before adding a new one.
            </div>
          </div>
        );
        return
      }
    }

    mutation.mutate({
      size: trimmedSize,
      color: trimmedColor || null,
      color_hex: form.color_hex ? form.color_hex.trim() : null,
      sku: form.sku.trim() || undefined,
      original_price: orig,
      selling_price: sell,
      discount_percentage: parseFloat(form.discount_percentage) || 0,
      stock_quantity: parseInt(form.stock_quantity || 0, 10),
      low_stock_threshold: parseInt(form.low_stock_threshold || 5, 10),
      barcode: form.barcode ? form.barcode.trim() : null,
      status: form.status,
      image_url: form.image_url || null,
    })
  }

  const sellNum = parseFloat(form.selling_price || 0)
  const origNum = parseFloat(form.original_price || 0)
  const priceError = !isNaN(sellNum) && !isNaN(origNum) && sellNum > origNum && form.selling_price !== ""

  return (
    <div ref={containerRef} className="w-full border border-app rounded-xl p-4 space-y-4 mt-3 bg-surface/50 scroll-mt-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {isEditMode ? "Edit Variant" : "New Variant"}
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center text-center">
          <FormField label="Size" required>
            <CreatableSizeSelect
              value={form.size}
              onChange={val => set('size', val)}
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
            />
          </FormField>
          <FormField label="Color">
            <CreatableColorSelect
              value={form.color}
              onChange={val => set('color', val)}
              onHexChange={hex => set('color_hex', hex)}
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
            />
          </FormField>
          <FormField label="Color Hex">
            <div className="relative">
              <StyledInput
                value={form.color_hex}
                onChange={e => set('color_hex', e.target.value)}
                placeholder="#1A1A1A"
                disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              />
              {/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.color_hex) && (
                <span
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-app"
                  style={{ background: form.color_hex }}
                />
              )}
            </div>
          </FormField>
          <FormField label="SKU" hint="auto if blank">
            <StyledInput
              value={form.sku}
              onChange={e => set('sku', e.target.value)}
              placeholder="auto"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <FormField label="Original Price" required>
            <StyledInput
              type="number"
              min="0.01"
              step="0.01"
              value={form.original_price}
              onChange={e => set('original_price', e.target.value)}
              placeholder="999"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </FormField>
          <FormField label="Selling Price" required>
            <StyledInput
              type="number"
              min="0.01"
              step="0.01"
              value={form.selling_price}
              onChange={e => set('selling_price', e.target.value)}
              placeholder="799"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              className={`${priceError ? 'border-red-400 focus:ring-red-400/30' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
          </FormField>
          <FormField label="Discount %">
            <StyledInput
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.discount_percentage}
              onChange={e => set('discount_percentage', e.target.value)}
              placeholder="0"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              readOnly={!!(form.original_price && form.selling_price)}
            />
          </FormField>
          <FormField label="Stock">
            <StyledInput
              type="number"
              min="0"
              value={form.stock_quantity}
              onChange={e => set('stock_quantity', e.target.value)}
              placeholder="Enter Stock Quantity"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </FormField>
          <FormField label="Low Stock Alert">
            <StyledInput
              type="number"
              min="0"
              value={form.low_stock_threshold}
              onChange={e => set('low_stock_threshold', e.target.value)}
              placeholder="5"
              disabled={!limits || (!isEditMode && isVariantsLimitReached)}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </FormField>
        </div>

        {priceError && (
          <p className="text-xs text-red-500 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Selling price cannot exceed original price
          </p>
        )}

        <div className="flex items-center gap-2 w-full pt-1">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending || priceError || (!isEditMode && anyLimitReached)}
            title={disabledTitle}
            variant="addvariant"
            className="min-w-[100px] whitespace-nowrap hover:bg-sky-400 hover:border-sky-600"
          >
            {mutation.isPending && (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            )}
            {isEditMode ? "Save Changes" : "Add Variant"}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="delete"
            className="whitespace-nowrap hover:bg-red-500 hover:border hover:border-red-500"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

function getNormalizedCollectionName(name) {
  if (!name) return null;
  const val = name
    .trim()
    .toLowerCase()
    .replace(/[\s_\-'"]+/g, "");
  if (
    val.includes("women") ||
    val.includes("female") ||
    val.includes("girl") ||
    val.includes("lady") ||
    val.includes("ladies")
  ) {
    return "Women";
  }
  if (val.includes("men") || val.includes("male") || val.includes("boy")) {
    return "Men";
  }
  if (val.includes("kid") || val.includes("child")) {
    return "Kids";
  }
  return null;
}

export default function InlineProductForm({
  product,
  onClose,
  onOpenVariant,
  onOpenImage,
}) {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlVariantId = searchParams.get("variant");
  const [activeVariantForm, setActiveVariantForm] = useState(null);

  useEffect(() => {
    if (urlVariantId) {
      if (urlVariantId === "new") {
        setActiveVariantForm("add");
      } else {
        setActiveVariantForm(Number(urlVariantId) || urlVariantId);
      }
    } else {
      setActiveVariantForm(null);
    }
  }, [urlVariantId]);

  const handleEditClick = (vId) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('variant', String(vId));
    setSearchParams(newParams);
  };

  const handleAddClick = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('variant', 'new');
    setSearchParams(newParams);
  };

  const handleCloseVariantForm = () => {
    setActiveVariantForm(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('variant');
    setSearchParams(newParams);
  };

  const {
    limits,
    isLoading: limitsLoading,
    error: limitsError,
    refetch: refetchLimits,
  } = useBusinessLimits();
  const isEdit = !!product;

  // â”€â”€â”€ Blank form ref â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const blankForm = useRef({
    title: "",
    description: "",
    short_description: "",
    category_id: "",
    collection_id: "",
    genders: [],
    material: "",
    tags: "",
    status: "draft",
    is_featured: false,
    is_trending: false,
    is_best_seller: false,
    is_new_arrival: false,
    seo_title: "",
    seo_description: "",
  });

  // â”€â”€â”€ Form state â€” must be declared BEFORE any hook that reads `form` â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [form, setForm] = useState(blankForm.current);

  // â”€â”€â”€ BUG-1 FIX: useQuery calls moved here, after `form` is declared â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "admin"],
    queryFn: () => categoriesAPI.list().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["collections", "admin"],
    queryFn: () => collectionsAPI.list().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const filteredCollections = useMemo(() => {
    if (!form.category_id) return [];
    const selectedCat = categories.find(
      (c) => String(c.id) === String(form.category_id),
    );
    const isMainProduct =
      selectedCat &&
      [
        "T-Shirt",
        "T Shirt",
        "Track Pant",
        "Track-Pant",
        "Jersey",
        "Shirt",
        "Trouser",
      ].includes(selectedCat.name);
    if (isMainProduct) {
      return collections.filter((c) => {
        const norm = getNormalizedCollectionName(c.name);
        return ["Men", "Women", "Kids"].includes(norm);
      });
    }
    return collections.filter(
      (c) => String(c.category_id) === String(form.category_id),
    );
  }, [collections, form.category_id, categories]);

  // â”€â”€â”€ Other state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [localImages, setLocalImages] = useState({
    thumbnail: null,
    gallery_images: [],
  });
  const [localVariants, setLocalVariants] = useState([]);
  const [saveSteps, setSaveSteps] = useState(null);
  const [deletingVariantIds, setDeletingVariantIds] = useState(() => new Set());
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const isSavingRef = useRef(false);
  const isCriticalFailureRef = useRef(false);
  const localImagesRef = useRef(localImages);
  const productRef = useRef(product);
  const localFileRef = useRef(null);

  useEffect(() => {
    localImagesRef.current = localImages;
  }, [localImages]);
  useEffect(() => {
    productRef.current = product;
  }, [product]);

  const revokeLocalImages = (imgs) => {
    if (!imgs) return;
    ["thumbnail"].forEach(
      (k) => {
        if (imgs[k]?.previewUrl) {
          try {
            URL.revokeObjectURL(imgs[k].previewUrl);
          } catch (_) {}
        }
      },
    );
    (imgs.gallery_images || []).forEach((img) => {
      if (img?.previewUrl) {
        try {
          URL.revokeObjectURL(img.previewUrl);
        } catch (_) {}
      }
    });
  };

  // Revoke blob URLs on unmount
  useEffect(() => () => revokeLocalImages(localImagesRef.current), []);

  // Populate form when product prop changes (edit mode)
  useEffect(() => {
    revokeLocalImages(localImagesRef.current);
    const p = productRef.current;
    setForm(
      p
        ? {
            title: p.title,
            description: p.description || "",
            short_description: p.short_description || "",
            category_id: p.category_id || "",
            collection_id: p.collection_id || "",
            genders: p.genders || [],
            material: p.material || "",
            tags: (p.tags || []).join(", "),
            status: p.status,
            is_featured: p.is_featured || false,
            is_trending: p.is_trending || false,
            is_best_seller: p.is_best_seller || false,
            is_new_arrival: p.is_new_arrival || false,
            seo_title: p.seo_title || "",
            seo_description: p.seo_description || "",
          }
        : blankForm.current,
    );
    setLocalImages({
      thumbnail: null,
      gallery_images: [],
    });
    setLocalVariants([]);
  }, [product?.id]);

  // â”€â”€â”€ Unsaved-changes guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const localImagesCount = useMemo(() => {
    let count = 0;
    if (localImages.thumbnail) count++;
    count += (localImages.gallery_images || []).length;
    return count;
  }, [localImages]);

  const hasUnsavedChanges = useMemo(() => {
    if (isEdit) return false;
    return (
      localImagesCount > 0 ||
      localVariants.length > 0 ||
      form.title.trim() !== "" ||
      form.description.trim() !== ""
    );
  }, [
    isEdit,
    localImagesCount,
    localVariants.length,
    form.title,
    form.description,
  ]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleClose = useCallback(() => {
    if (
      hasUnsavedChanges &&
      !window.confirm("You have unsaved changes. Discard?")
    )
      return;
    revokeLocalImages(localImages);
    onClose();
  }, [hasUnsavedChanges, localImages, onClose]);

  // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const payload = () => {
    const { collection, ...rest } = form;
    return {
      ...rest,
      title: form.title.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      collection_id: form.collection_id ? Number(form.collection_id) : null,
      genders: form.genders || [],
      material: form.material ? form.material.trim() : null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
  };

  const validateForm = (data) => {
    if (data.title.length < 2) {
      toast.error("Product title must be at least 2 characters");
      return false;
    }
    const selectedCat = categories.find(
      (c) => String(c.id) === String(data.category_id),
    );
    const isMainProduct =
      selectedCat &&
      [
        "T-Shirt",
        "T Shirt",
        "Track Pant",
        "Track-Pant",
        "Jersey",
        "Shirt",
        "Trouser",
      ].includes(selectedCat.name);
    if (isMainProduct) {
      if (!data.collection_id) {
        toast.error("Collection is required for Main Products.");
        return false;
      }
      const selectedCol = collections.find(
        (c) => String(c.id) === String(data.collection_id),
      );
      const normCol = selectedCol
        ? getNormalizedCollectionName(selectedCol.name)
        : null;
      if (!selectedCol || !["Men", "Women", "Kids"].includes(normCol)) {
        toast.error(
          "Invalid collection. Collection must be Men, Women, or Kids.",
        );
        return false;
      }
    }
    return true;
  };

  // â”€â”€â”€ Edit mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const editMutation = useMutation({
    mutationFn: (data) => productsApi.update(product.id, data),
    onSuccess: () => {
      toast.success("Product updated successfully.");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      onClose();
    },
    onError: (e) => {
      toast.error(getErrorMessage(e, "Something went wrong"));
    },
  });

  const editPubMutation = useMutation({
    mutationFn: (data) =>
      productsApi.update(product.id, { ...data, status: "published" }),
    onSuccess: () => {
      toast.success("Product published successfully.");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      onClose();
    },
    onError: (e) => {
      toast.error(getErrorMessage(e, "Something went wrong"));
    },
  });

  // â”€â”€â”€ Variant delete mutation (edit mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId) => productsApi.deleteVariant(product.id, variantId),
    onMutate: (variantId) =>
      setDeletingVariantIds((prev) => new Set([...prev, variantId])),
    onSettled: (_, __, variantId) =>
      setDeletingVariantIds((prev) => {
        const s = new Set(prev);
        s.delete(variantId);
        return s;
      }),
    onSuccess: () => {
      toast.success("Variant deleted successfully.");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (e) => {
      toast.error(getErrorMessage(e, "Failed to delete variant"));
    },
  });

  // â”€â”€â”€ New product: batch save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const batchSave = async (overrideStatus) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    isCriticalFailureRef.current = false;

    const data = payload();
    if (overrideStatus) data.status = overrideStatus;

    if (!validateForm(data)) {
      isSavingRef.current = false;
      return;
    }
    if (overrideStatus === "published" && localVariants.length === 0) {
      toast.error("Add at least one variant before publishing");
      isSavingRef.current = false;
      return;
    }

    const imagesToUpload = [];
    if (localImages.thumbnail) {
      imagesToUpload.push({
        file: localImages.thumbnail.file,
        type: "thumbnail",
        setAsPrimary: true,
      });
    }
    (localImages.gallery_images || []).forEach((img) => {
      imagesToUpload.push({
        file: img.file,
        type: "gallery",
        setAsPrimary: false,
      });
    });

    const imgCount = imagesToUpload.length;
    const varCount = localVariants.length;

    const steps = [
      {
        id: "create-product",
        label: "Create product",
        status: "pending",
        details: null,
      },
      ...(imgCount > 0
        ? [
            {
              id: "upload-images",
              label: `Upload ${imgCount} image${imgCount > 1 ? "s" : ""}`,
              status: "pending",
              details: null,
            },
          ]
        : []),
      ...(varCount > 0
        ? [
            {
              id: "create-variants",
              label: `Create ${varCount} variant${varCount > 1 ? "s" : ""}`,
              status: "pending",
              details: null,
            },
          ]
        : []),
    ];

    const updateStep = (id, updates) =>
      setSaveSteps((prev) =>
        prev ? prev.map((s) => (s.id === id ? { ...s, ...updates } : s)) : prev,
      );

    setSaveSteps(steps);
    let createdProduct = null;
    let hadPartialFailure = false;

    // â”€â”€ Step 1: Create product â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    try {
      updateStep("create-product", { status: "loading" });
      const res = await productsApi.create(data);
      createdProduct = res.data;
      updateStep("create-product", { status: "done" });
    } catch (e) {
      isCriticalFailureRef.current = true;

      console.error("Product creation failed:", e.response?.data || e);

      const errorMessage = getErrorMessage(e, "Failed to create product");

      updateStep("create-product", {
        status: "error",
        details: errorMessage,
      });

      toast.error(errorMessage);

      isSavingRef.current = false;
      return;
    }

    // â”€â”€ Step 2: Upload images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (imgCount > 0) {
      updateStep("upload-images", { status: "loading" });
      let imgSucceeded = 0;
      let imgFailed = 0;

      for (let i = 0; i < imagesToUpload.length; i++) {
        const { file, type, setAsPrimary } = imagesToUpload[i];
        try {
          // BUG-2 FIX: pass file (raw File) â€” api.js builds FormData internally
          await productsApi.uploadImage(
            createdProduct.id,
            file,
            type,
            setAsPrimary,
          );
          imgSucceeded++;
        } catch (_) {
          imgFailed++;
        }
      }

      if (imgFailed === 0) {
        updateStep("upload-images", {
          status: "done",
          details: `${imgSucceeded} uploaded`,
        });
      } else {
        hadPartialFailure = true;
        updateStep("upload-images", {
          status: imgSucceeded > 0 ? "done" : "error",
          details: `${imgSucceeded} uploaded, ${imgFailed} failed`,
        });
        toast.error(
          imgSucceeded > 0
            ? `${imgFailed} image${imgFailed > 1 ? "s" : ""} failed â€” add them later`
            : "Image upload failed â€” add images later via Edit",
        );
      }
    }

    // â”€â”€ Step 3: Create variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (varCount > 0) {
      updateStep("create-variants", { status: "loading" });
      try {
        // BUG-3 FIX: wrap array in { variants: [...] } â€” matches BulkVariantCreate schema
        const variantsPayload = localVariants.map(({ _localId, ...v }) => v);
        const bulkRes = await productsApi.bulkCreateVariants(
          createdProduct.id,
          { variants: variantsPayload },
        );

        // Derive success count from returned product's variants array or request count
        const returnedProduct = bulkRes.data;
        const returnedVariants = returnedProduct?.variants;
        const varSucceeded = Array.isArray(returnedVariants) && returnedVariants.length > 0
          ? returnedVariants.length
          : varCount;
        const varFailed = Math.max(0, varCount - varSucceeded);

        if (varFailed <= 0) {
          updateStep("create-variants", {
            status: "done",
            details: `${varSucceeded} created`,
          });
        } else {
          hadPartialFailure = true;
          updateStep("create-variants", {
            status: varSucceeded > 0 ? "done" : "error",
            details: `${varSucceeded} created, ${varFailed} failed`,
          });
          toast.error(
            `${varFailed} variant${varFailed > 1 ? "s" : ""} failed ” add them later via Edit`,
          );
        }
      } catch (e) {
        hadPartialFailure = true;

        console.error("Bulk variant creation failed:", e.response?.data || e);

        const errorMessage = getErrorMessage(e, "Variant creation failed");

        updateStep("create-variants", {
          status: "error",
          details: errorMessage,
        });

        toast.error(errorMessage);
      }
    }

    // â”€â”€ Finish â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    revokeLocalImages(localImages);
    await new Promise((r) => setTimeout(r, hadPartialFailure ? 1500 : 800));

    if (!hadPartialFailure) {
      toast.success(
        overrideStatus === "published"
          ? "Product published successfully."
          : "Product created successfully.",
      );
      qc.invalidateQueries({ queryKey: ["products"] });
      setSaveSteps(null);
      isSavingRef.current = false;
      onClose();
    } else {
      qc.invalidateQueries({ queryKey: ["products"] });
      isSavingRef.current = false;
    }
  };

  const handleOverlayClose = useCallback(() => {
    setSaveSteps(null);
    if (!isCriticalFailureRef.current) {
      onClose();
    }
    isCriticalFailureRef.current = false;
  }, [onClose]);

  // â”€â”€â”€ Local image handlers (new product only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleUploadLocal = useCallback((type, files) => {
    if (type === "gallery") {
      setLocalImages((prev) => {
        const newGallery = [...(prev.gallery_images || [])];
        files.forEach((f) => {
          if (!isDuplicateFile(f, newGallery)) {
            newGallery.push({
              id: genLocalId(),
              file: f,
              previewUrl: URL.createObjectURL(f),
            });
          }
        });
        return { ...prev, gallery_images: newGallery };
      });
    } else {
      setLocalImages((prev) => {
        const old = prev[type];
        if (old?.previewUrl) {
          try {
            URL.revokeObjectURL(old.previewUrl);
          } catch (_) {}
        }
        return {
          ...prev,
          [type]: {
            file: files,
            previewUrl: URL.createObjectURL(files),
          },
        };
      });
    }
  }, []);

  const handleDeleteLocal = useCallback((type, index) => {
    setLocalImages((prev) => {
      if (type === "gallery") {
        const newGallery = [...(prev.gallery_images || [])];
        if (index >= 0 && index < newGallery.length) {
          const removed = newGallery.splice(index, 1)[0];
          if (removed?.previewUrl) {
            try {
              URL.revokeObjectURL(removed.previewUrl);
            } catch (_) {}
          }
        }
        return { ...prev, gallery_images: newGallery };
      } else {
        const old = prev[type];
        if (old?.previewUrl) {
          try {
            URL.revokeObjectURL(old.previewUrl);
          } catch (_) {}
        }
        return { ...prev, [type]: null };
      }
    });
  }, []);

  const addLocalVariant = useCallback(
    (v) => setLocalVariants((prev) => [...prev, v]),
    [],
  );
  const removeLocalVariant = useCallback(
    (id) => setLocalVariants((prev) => prev.filter((v) => v._localId !== id)),
    [],
  );

  // â”€â”€â”€ Derived values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const thumbnailUrl = isEdit
    ? getImageUrl(product?.thumbnail)
    : localImages.thumbnail?.previewUrl ||
      null;
  const hasThumbnail = isEdit
    ? !!product?.thumbnail
    : !!localImages.thumbnail;
  const variants = isEdit ? product?.variants || [] : localVariants;
  const isBatchSaving = saveSteps !== null;

  const handleOpenImageModal = () => {
    if (isEdit) {
      onOpenImage(product);
    } else {
      setIsImageModalOpen(true);
    }
  };

  const mockProductForModal = useMemo(() => {
    return {
      id: null,
      thumbnail: localImages.thumbnail?.previewUrl || null,
      gallery_images:
        localImages.gallery_images?.map((img) => img.previewUrl) || [],
    };
  }, [localImages]);

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <>
      {isBatchSaving && (
        <SaveProgressOverlay steps={saveSteps} onClose={handleOverlayClose} />
      )}

      {/* HEAD: card wrapper + shadow; branch: bg-app â€” merged both */}
      <div className="card overflow-hidden mt-6 shadow-md bg-app">
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              isSavingRef.current ||
              editMutation.isPending ||
              editPubMutation.isPending
            )
              return;
            const data = payload();
            if (!validateForm(data)) return;
            if (isEdit) editMutation.mutate(data);
            else batchSave();
          }}
        >
          {/* Branch: sticky header */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-1 bg-app border-b border-app backdrop-blur-sm">
            <h3 className="text-sm font-bold text-app p-4 uppercase tracking-tight">
              {isEdit ? `Editing: ${product.title}` : "Add New Product"}
            </h3>
            <Button
              type="button"
              onClick={handleClose}
              disabled={isBatchSaving}
              aria-label="Close form"
              variant="delete"
              size="sm"
              className="h-8 w-8 p-0 rounded-md text-muted hover:text-app hover:bg-red-500 hover:border hover:border-red-500"
            >
              <X size={16} />
            </Button>
          </div>

          {limitsError && (
            <div className="mx-6 mt-4 flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>
                  Unable to load store configuration. Please try again.
                </span>
              </div>
              <button
                type="button"
                onClick={() => refetchLimits()}
                className="px-3 py-1 rounded bg-red-500 text-white font-bold text-[11px]"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 p-4 sm:p-6">
            {/* â”€â”€ LEFT: image panel â”€â”€ */}
            <div className="flex flex-col items-center gap-3.5">
              <div
                className="w-full max-w-[180px] sm:max-w-[220px] md:max-w-none h-40 sm:h-52 md:aspect-square border-2 border-dashed border-brand-500/50 hover:border-brand-500 rounded-2xl bg-app overflow-hidden cursor-pointer flex items-center justify-center transition-all hover:scale-[1.01] mx-auto"
                onClick={handleOpenImageModal}
                title="Click to manage images"
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={form.title || "Product"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-muted">
                    <Camera size={32} className="text-muted opacity-40" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">
                      Add Image
                    </span>
                  </div>
                )}
              </div>
              <Button
                type="button"
                onClick={handleOpenImageModal}
                variant="secondary"
                icon={Plus}
                className="w-full"
              >
                {hasThumbnail ? "Change Image" : "Add Image"}
              </Button>
            </div>

            {/* â”€â”€ RIGHT: fields â”€â”€ */}
            <div className="flex flex-col gap-4">
              {/* Product Name */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label
                  htmlFor="product-title"
                  className="text-xs font-bold text-muted"
                >
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="product-title"
                  className="input-field py-2.5 text-xs"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                  minLength={2}
                  placeholder="e.g. Classic Black Tee"
                />
              </div>

              {/* Code / SKU (read-only) */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label className="text-xs font-bold text-muted">
                  Code / SKU
                </label>
                <input
                  className="input-field py-2.5 text-xs opacity-60 cursor-not-allowed bg-app"
                  readOnly
                  value={isEdit && variants.length > 0 ? variants[0].sku : ""}
                  placeholder={
                    isEdit
                      ? "auto-generated on first variant"
                      : "set via variant"
                  }
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label className="text-xs font-bold text-muted">Category</label>
                <select
                  className="input-field py-2.5 text-xs"
                  value={form.category_id}
                  onChange={(e) => {
                    set("category_id", e.target.value);
                    set("collection_id", "");
                  }}
                >
                  <option value="">â€” None â€”</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Collection â€” HEAD: FK-based select driven by API (correct); branch had
                  hardcoded COLLECTION_OPTIONS string dropdown which ignores the DB. */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label className="text-xs font-bold text-muted">
                  Collection
                </label>
                <select
                  className="input-field py-2.5 text-xs"
                  value={form.collection_id}
                  onChange={(e) => set("collection_id", e.target.value)}
                >
                  <option value="">â€” None â€”</option>
                  {filteredCollections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label className="text-xs font-bold text-muted">Gender</label>
                <div className="flex flex-wrap gap-4 items-center">
                  {["Men", "Women", "Kids"].map((g) => (
                    <label
                      key={g}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(form.genders || []).includes(g)}
                        onChange={(e) => {
                          const current = form.genders || [];
                          if (e.target.checked) {
                            set("genders", [...current, g]);
                          } else {
                            set(
                              "genders",
                              current.filter((item) => item !== g),
                            );
                          }
                        }}
                        className="w-3.5 h-3.5 accent-brand-500"
                      />
                      <span className="text-xs font-medium text-muted">
                        {g}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Material */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label
                  htmlFor="product-material"
                  className="text-xs font-bold text-muted"
                >
                  Material
                </label>
                <input
                  id="product-material"
                  className="input-field py-2.5 text-xs"
                  value={form.material}
                  onChange={(e) => set("material", e.target.value)}
                  placeholder="e.g. Cotton, Polyester, Denim"
                  maxLength={255}
                />
              </div>

              {/* Status + Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                  <label className="text-xs font-bold text-muted">Status</label>
                  <select
                    className="input-field py-2.5 text-xs"
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                  <label className="text-xs font-bold text-muted">Tags</label>
                  <input
                    className="input-field py-2.5 text-xs"
                    value={form.tags}
                    onChange={(e) => set("tags", e.target.value)}
                    placeholder="Black, Whiteâ€¦"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-start">
                <label className="text-xs font-bold text-muted pt-2">
                  Short Desc
                </label>
                <textarea
                  rows={2}
                  className="input-field py-2.5 text-xs resize-none"
                  value={form.short_description}
                  onChange={(e) => set("short_description", e.target.value)}
                  placeholder="One-liner for product cardsâ€¦"
                  maxLength={500}
                />
              </div>

              {/* Merchandising flags */}
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
                <label className="text-xs font-bold text-muted">Flags</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: "is_featured", label: "â­ Featured" },
                    { key: "is_trending", label: "ðŸ”¥ Trending" },
                    { key: "is_best_seller", label: "âš¡ Best Seller" },
                    { key: "is_new_arrival", label: "ðŸ†• New Arrival" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!!form[f.key]}
                        onChange={(e) => set(f.key, e.target.checked)}
                        className="w-3.5 h-3.5 accent-brand-500"
                      />
                      <span className="text-xs font-medium text-muted">
                        {f.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* â”€â”€ Variants section â”€â”€ */}
          <div className="px-6 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">
              Variants
            </p>
            {variants.length > 0 ? (
              <div className="card overflow-hidden bg-surface text-xs">
                <Table>
                  <TableHeader>
                    <TableRow hover={false}>
                      <TableHead>Size</TableHead>
                      <TableHead>Actual Price</TableHead>
                      <TableHead>Discount Price</TableHead>
                      <TableHead>% off</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v) => (
                      <TableRow 
                        key={isEdit ? v.id : v._localId}
                        className={isEdit && activeVariantForm === v.id ? "bg-brand-500/10 dark:bg-brand-500/20 border-l-2 border-brand-500 transition-colors" : ""}
                      >
                        {/* HEAD: Badge component â€” cleaner than branch's oversized text-xl cell */}
                        <TableCell>
                          <Badge label={v.size} variant="info" />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(v.original_price)}
                        </TableCell>
                        <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatPrice(v.selling_price)}
                        </TableCell>
                        <TableCell className="font-medium text-amber-600">
                          {v.discount_percentage
                            ? `${parseFloat(v.discount_percentage).toFixed(0)}%`
                            : "â€”"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {isEdit ? (
                            <StockBadge stock={v.stock_quantity} />
                          ) : (
                            <span>{v.stock_quantity}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEdit ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="rounded-md flex items-center justify-center border-brand-500/20 bg-brand-500/5 text-brand-500 hover:bg-brand-500 hover:text-white transition-colors"
                                style={{ width: 24, height: 24 }}
                                onClick={() => handleEditClick(v.id)}
                                aria-label="Edit variant"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                type="button"
                                className="rounded-md flex items-center justify-center border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white"
                                style={{ width: 24, height: 24 }}
                                disabled={deletingVariantIds.has(v.id)}
                                onClick={() =>
                                  deleteVariantMutation.mutate(v.id)
                                }
                                aria-label="Delete variant"
                              >
                                {deletingVariantIds.has(v.id) ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn-secondary rounded-lg flex items-center justify-center border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white"
                              style={{ width: 24, height: 24 }}
                              onClick={() => removeLocalVariant(v._localId)}
                              aria-label="Remove variant"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-xs border p-2 rounded-md text-muted py-1.5 mb-2">
                No variants yet.
              </p>
            )}

            {isEdit ? (
              <div className="mt-2 space-y-3 text-left">
                <Button
                  type="button"
                  onClick={handleAddClick}
                  variant="addvariant"
                  className="min-w-[100px] whitespace-nowrap hover:bg-sky-400 hover:border-sky-600"
                >
                  Add Variant
                </Button>

                {activeVariantForm && (
                  <VariantInlineForm
                    productId={product.id}
                    product={product}
                    editingVariantId={activeVariantForm === 'add' ? null : activeVariantForm}
                    onClose={handleCloseVariantForm}
                    limits={limits}
                  />
                )}
              </div>
            ) : (
              <LocalVariantForm
                onAdd={addLocalVariant}
                existingVariants={localVariants}
                limits={limits}
              />
            )}
          </div>

          {/* â”€â”€ Description â”€â”€ */}
          <div className="px-6 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">
              Description
            </p>
            <textarea
              className="input-field text-xs py-2.5 resize-none h-28 w-full"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Product descriptionâ€¦"
            />
          </div>

          {/* Ready badges */}
          {!isEdit && (localImagesCount > 0 || localVariants.length > 0) && (
            <div className="mx-6 mt-3 flex flex-wrap gap-2">
              {localImagesCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full px-2.5 py-1 font-semibold">
                  <ImageIcon size={10} /> {localImagesCount} image
                  {localImagesCount > 1 ? "s" : ""} ready
                </span>
              )}
              {localVariants.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-2.5 py-1 font-semibold">
                  <Layers size={10} /> {localVariants.length} variant
                  {localVariants.length > 1 ? "s" : ""} ready
                </span>
              )}
            </div>
          )}

          {/* â”€â”€ Action buttons â€” branch color scheme (emerald Save, sky Publish) +
                HEAD's border-t border-app mt-6 container â”€â”€ */}
          <div className="grid gap-3 p-6 border-t border-app mt-6">
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 btn-primary rounded-lg bg-emerald-500 hover:bg-emerald-600 border-emerald-500 hover:border-emerald-600 py-2.5 text-xs font-bold"
                disabled={isBatchSaving || editMutation.isPending}
              >
                {isBatchSaving || editMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  "Save"
                )}
              </button>
              <button
                type="button"
                className="flex-1 btn-primary rounded-lg bg-sky-400 hover:bg-sky-500 border-sky-500 hover:border-sky-600 py-2.5 text-xs font-bold"
                disabled={isBatchSaving || editPubMutation.isPending}
                onClick={() => {
                  if (isSavingRef.current || editPubMutation.isPending) return;
                  const data = payload();
                  if (!validateForm(data)) return;
                  if (isEdit) editPubMutation.mutate(data);
                  else batchSave("published");
                }}
              >
                {isBatchSaving || editPubMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  "Publish"
                )}
              </button>
            </div>
            <button
              type="button"
              className="w-full px-4 py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white font-bold text-xs transition-colors"
              onClick={handleClose}
              disabled={isBatchSaving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {!isEdit && (
        <ImageUploadModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          product={mockProductForModal}
          onUploadLocal={handleUploadLocal}
          onDeleteLocal={handleDeleteLocal}
        />
      )}
    </>
  );
}

