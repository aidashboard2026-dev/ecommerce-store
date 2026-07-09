import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Globe2,
  Upload,
  ImagePlus,
  Mail,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  ShoppingBag,
  BadgeCheck,
  UserRound,
  LockKeyhole,
  ShieldX,
  CreditCard
} from "lucide-react";
import toast from "react-hot-toast";


import { PageLoader } from "@/shared/components/common/Spinner";
import NotificationRow from "@/admin/components/settings/NotificationRow";
import PaymentMethodCard from "@/admin/components/settings/PaymentMethodCard";
import SettingsCard from "@/admin/components/settings/SettingsCard";
import ToggleSwitch from "@/admin/components/settings/ToggleSwitch";
import Button from "@/shared/components/ui/Button";
import PageHeader from "@/shared/components/ui/PageHeader";
import settingsService from "@/admin/services/settingsService";

const countries = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Singapore",
  "United Arab Emirates",
];
const currencies = ["INR", "USD", "GBP", "CAD", "AUD", "SGD", "AED"];
const timezones = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Singapore",
  "Asia/Dubai",
];
const weightUnits = ["kg", "g", "lb", "oz"];

function apiError(error, fallback) {
  if (!navigator.onLine) {
    return "You are offline. Please check your internet connection.";
  }
  if (error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout")) {
    return "Request timed out. Please try again.";
  }
  if (!error.response) {
    return "Network error. Please check your server connection.";
  }

  const status = error.response.status;
  const data = error.response.data;

  if (status === 401) {
    return "Session expired. Please log in again.";
  }
  if (status === 403) {
    return "Access denied. You do not have permission to perform this action.";
  }
  if (status === 404) {
    return data?.detail || "Requested resource not found.";
  }
  if (status === 409) {
    return data?.detail || "Conflict error occurred. Please refresh and try again.";
  }
  if (status === 422) {
    if (Array.isArray(data?.detail)) {
      return data.detail.map(err => err.msg).join(", ");
    }
    return data?.detail || "Validation error in submitted data.";
  }
  if (status === 500) {
    return "Internal server error. Please contact support.";
  }

  const detail = data?.detail;
  if (Array.isArray(detail)) return detail[0]?.msg || fallback;
  if (typeof detail === "string") return detail;

  return fallback || "An unexpected error occurred.";
}

function safeParseStorage(key, fallback = []) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return fallback;
  }
}

const FormInput = React.forwardRef(
  ({ label, error, endAdornment, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <label htmlFor={inputId} className="block space-y-1.5">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          {label}
        </span>

        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            {...props}
          />

          {endAdornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {endAdornment}
            </div>
          )}
        </div>

        {error && (
          <span className="block text-[11px] font-semibold text-red-600">
            {error.message}
          </span>
        )}
      </label>
    );
  }
);

FormInput.displayName = "FormInput";

const FormTextarea = React.forwardRef(
  ({ label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <label htmlFor={inputId} className="block space-y-1.5">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          {label}
        </span>

        <textarea
          id={inputId}
          ref={ref}
          rows={4}
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          {...props}
        />

        {error && (
          <span className="block text-[11px] font-semibold text-red-600">
            {error.message}
          </span>
        )}
      </label>
    );
  }
);

FormTextarea.displayName = "FormTextarea";

const SelectInput = React.forwardRef(
  ({ label, error, options, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <label htmlFor={inputId} className="block space-y-1.5">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          {label}
        </span>

        <select
          id={inputId}
          ref={ref}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          {...props}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {error && (
          <span className="block text-[11px] font-semibold text-red-600">
            {error.message}
          </span>
        )}
      </label>
    );
  }
);

SelectInput.displayName = "SelectInput";

function AlertBox({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <p className="font-semibold">{children}</p>
    </div>
  );
}

function SaveButton({ loading, disabled, children }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save size={16} />
          {children}
        </>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [settings, setSettings] = useState(null);
  const [security, setSecurity] = useState(null);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState({});
  const [paymentLoading, setPaymentLoading] = useState({});
  const [notificationLoading, setNotificationLoading] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic regional options list loaded from the backend
  const [countriesList, setCountriesList] = useState([]);
  const [currenciesList, setCurrenciesList] = useState([]);
  const [timezonesList, setTimezonesList] = useState([]);
  const [weightUnitsList, setWeightUnitsList] = useState([]);

  const closeModal = () => {
    setActiveModal(null);
    passwordForm.reset({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    passwordForm.clearErrors();
    setSaving((s) => ({ ...s, password: false }));
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    usernameForm.reset({
      username: security?.username || "",
      current_password: "",
    });
    usernameForm.clearErrors();
    emailForm.reset({
      email: security?.email || "",
      current_password: "",
    });
    emailForm.clearErrors();
  };

  const profileForm = useForm({
    defaultValues: {
      store_name: import.meta.env.VITE_STORE_NAME || "",
      store_url: import.meta.env.VITE_STORE_URL || "",
      support_email: "",
      support_phone: "",
      description: "",
      store_location: "",
      logo: "",
    },
  });
  const regionalForm = useForm({
    defaultValues: {
      country: "India",
      currency: "INR",
      timezone: "Asia/Kolkata",
      weight_unit: "kg",
    },
  });

  // Separate forms for username, email and password to avoid shared state
  const usernameForm = useForm({
    defaultValues: { username: "", current_password: "" },
  });
  const emailForm = useForm({
    defaultValues: { email: "", current_password: "" },
  });
  const passwordForm = useForm({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const newPasswordValue = passwordForm.watch("new_password") || "";
  const passwordStrength = useMemo(() => {
    if (!newPasswordValue) return 0;
    let score = 0;
    if (newPasswordValue.length >= 8) score++;
    if (/[a-z]/.test(newPasswordValue) && /[A-Z]/.test(newPasswordValue)) score++;
    if (/\d/.test(newPasswordValue)) score++;
    if (/[^a-zA-Z0-9]/.test(newPasswordValue)) score++;
    return score;
  }, [newPasswordValue]);

  // Small security-only form for two-factor toggle (keeps it separate)
  const securityForm = useForm({
    defaultValues: { two_factor_enabled: false },
  });
  const twoFactorEnabled = securityForm.watch("two_factor_enabled");
  const authenticatorStatus = useMemo(
    () => (twoFactorEnabled ? "Enabled" : "Not configured"),
    [twoFactorEnabled],
  );

  const usernameRegister = usernameForm.register("username", {
    required: "Username is required",
    minLength: { value: 3, message: "Username must be at least 3 characters" },
    maxLength: { value: 100, message: "Username cannot exceed 100 characters" },
    validate: (val) => val.trim().length >= 3 || "Username cannot be empty or whitespace-only",
  });
  const emailRegister = emailForm.register("email", {
    required: "Email is required",
    maxLength: { value: 255, message: "Email cannot exceed 255 characters" },
    pattern: {
      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      message: "Invalid email address",
    },
  });
  const passwordCurrentRegister = passwordForm.register("current_password", {
    required: "Current password is required",
  });

  async function handleRemoveLogo() {
    const confirmed = window.confirm("Are you sure you want to remove the store logo?");
    if (!confirmed) return;

    try {
      const res = await settingsService.deleteLogo();
      setLogoPreview("");
      profileForm.setValue("logo", "", { shouldDirty: false });
      if (res.data) {
        setSettings(res.data);
      }
      queryClient.invalidateQueries({ queryKey: ["storeSettings"] });
      toast.success("Logo removed");
    } catch (err) {
      toast.error(apiError(err, "Failed to remove logo"));
    }
  }
  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        setError(false);
        const [settingsResponse, paymentsResponse, notificationsResponse, regionalOptionsResponse] =
          await Promise.all([
            settingsService.getSettings(),
            settingsService.getPayments(),
            settingsService.getNotifications(),
            settingsService.getRegionalOptions().catch(() => ({ data: {} })),
          ]);

        if (!mounted) return;

        const store = settingsResponse.data.settings;
        const adminSecurity = settingsResponse.data.security;

        setSettings(store);
        setSecurity(adminSecurity);
        setPayments(paymentsResponse.data);
        setNotifications(notificationsResponse.data);
        setLogoPreview(store.logo || "");

        const regionalData = regionalOptionsResponse.data || {};
        setCountriesList(regionalData.countries || []);
        setCurrenciesList(regionalData.currencies || []);
        setTimezonesList(regionalData.timezones || []);
        setWeightUnitsList(regionalData.weight_units || []);

        // Normalize stored phone: strip +91 prefix so the 10-digit input field shows only the local number
        const storedPhone = store.support_phone || "";
        const displayPhone = storedPhone.startsWith("+91")
          ? storedPhone.slice(3)
          : storedPhone.startsWith("91") && storedPhone.length === 12
          ? storedPhone.slice(2)
          : storedPhone;

        profileForm.reset({
          store_name: import.meta.env.VITE_STORE_NAME || "",
          store_url: import.meta.env.VITE_STORE_URL || "",
          support_email: store.support_email || "",
          support_phone: displayPhone,
          description: store.description || "",
          store_location: store.store_location || "",
          logo: store.logo || "",
        });
        regionalForm.reset({
          country: store.country || "India",
          currency: store.currency || "INR",
          timezone: store.timezone || "Asia/Kolkata",
          weight_unit: store.weight_unit || "kg",
        });
        // Reset the distinct forms with the fresh security values
        usernameForm.reset({
          username: adminSecurity.username || "",
          current_password: "",
        });
        emailForm.reset({
          email: adminSecurity.email || "",
          current_password: "",
        });
        passwordForm.reset({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        securityForm.reset({
          two_factor_enabled: adminSecurity.two_factor_enabled || false,
        });
      } catch (err) {
        if (mounted) setError(true);
        toast.error(apiError(err, "Failed to load settings"));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, [retryTrigger]);


  // Refs to focus first input in each modal
  const usernameFirstRef = useRef(null);
  const emailFirstRef = useRef(null);
  const passwordFirstRef = useRef(null);

  // Prevent background scroll while modal open and focus first input
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        closeModal();
      }
    }
    if (activeModal) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }

    // focus first input for the opened modal
    const t = setTimeout(() => {
      if (activeModal === "username" && usernameFirstRef.current)
        usernameFirstRef.current.focus();
      if (activeModal === "email" && emailFirstRef.current)
        emailFirstRef.current.focus();
      if (activeModal === "password" && passwordFirstRef.current)
        passwordFirstRef.current.focus();
    }, 50);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeModal]);

  async function saveProfile(data) {
    // Normalize phone: prepend +91 if not already present
    const rawPhone = (data.support_phone || "").replace(/[^0-9]/g, "");
    const normalizedPhone = rawPhone ? `+91${rawPhone}` : "";

    const cleanData = {
      store_name: import.meta.env.VITE_STORE_NAME || "My Designers",
      store_url: import.meta.env.VITE_STORE_URL || "https://mydesigners.com",
      support_email: data.support_email?.trim() || "",
      support_phone: normalizedPhone,
      description: (data.description || "").trim().slice(0, 200),
      store_location: data.store_location?.trim() || "",
      logo: data.logo || "",
    };
    setSaving((state) => ({ ...state, profile: true }));
    try {
      const response = await settingsService.updateProfile(cleanData);
      const updated = response.data;
      setSettings(updated);
      // Strip +91 prefix again for display in the input
      const updatedPhone = updated.support_phone || normalizedPhone;
      const displayPhone = updatedPhone.startsWith("+91") ? updatedPhone.slice(3) : updatedPhone;
      profileForm.reset({
        store_name: import.meta.env.VITE_STORE_NAME || "My Designers",
        store_url: import.meta.env.VITE_STORE_URL || "https://mydesigners.com",
        support_email: updated.support_email || cleanData.support_email,
        support_phone: displayPhone,
        description: updated.description || cleanData.description,
        store_location: updated.store_location || cleanData.store_location,
        logo: updated.logo || cleanData.logo,
      });
      setLogoPreview(updated.logo || "");
      queryClient.invalidateQueries({ queryKey: ["storeSettings"] });
      toast.success("Store profile updated successfully.");
    } catch (error) {
      toast.error(apiError(error, "Failed to save store profile"));
      // Restore previous state values on failure
      if (settings) {
        const prevPhone = settings.support_phone || "";
        const prevDisplayPhone = prevPhone.startsWith("+91") ? prevPhone.slice(3) : prevPhone;
        profileForm.reset({
          store_name: import.meta.env.VITE_STORE_NAME || "My Designers",
          store_url: import.meta.env.VITE_STORE_URL || "https://mydesigners.com",
          support_email: settings.support_email || "",
          support_phone: prevDisplayPhone,
          description: settings.description || "",
          store_location: settings.store_location || "",
          logo: settings.logo || "",
        });
        setLogoPreview(settings.logo || "");
      }
    } finally {
      setSaving((state) => ({ ...state, profile: false }));
    }
  }

  async function saveRegional(data) {
    const cleanData = {
      country: data.country?.trim() || "India",
      currency: data.currency?.trim() || "INR",
      timezone: data.timezone?.trim() || "Asia/Kolkata",
      weight_unit: data.weight_unit?.trim() || "kg",
    };
    setSaving((state) => ({ ...state, regional: true }));
    try {
      const response = await settingsService.updateSettings(cleanData);
      const updated = response.data;
      setSettings(updated);
      regionalForm.reset({
        country: updated.country || cleanData.country,
        currency: updated.currency || cleanData.currency,
        timezone: updated.timezone || cleanData.timezone,
        weight_unit: updated.weight_unit || cleanData.weight_unit,
      });
      queryClient.invalidateQueries({ queryKey: ["storeSettings"] });
      toast.success("Regional settings saved");
    } catch (error) {
      toast.error(apiError(error, "Failed to save regional settings"));
      // Restore previous state values on failure
      if (settings) {
        regionalForm.reset({
          country: settings.country || "India",
          currency: settings.currency || "INR",
          timezone: settings.timezone || "Asia/Kolkata",
          weight_unit: settings.weight_unit || "kg",
        });
      }
    } finally {
      setSaving((state) => ({ ...state, regional: false }));
    }
  }

  async function saveUsername(data) {
    const cleanData = {
      username: data.username?.trim(),
      current_password: data.current_password,
    };
    setSaving((state) => ({ ...state, security: true }));
    try {
      const response = await settingsService.updateSecurity(cleanData);
      setSecurity(response.data);
      toast.success("Username updated");
      closeModal();
    } catch (error) {
      toast.error(apiError(error, "Failed to update username"));
    } finally {
      setSaving((state) => ({ ...state, security: false }));
    }
  }

  async function saveEmail(data) {
    const cleanData = {
      email: data.email?.trim(),
      current_password: data.current_password,
    };
    setSaving((state) => ({ ...state, security: true }));
    try {
      const response = await settingsService.updateSecurity(cleanData);
      setSecurity(response.data);
      toast.success("Email updated");
      closeModal();
    } catch (error) {
      toast.error(apiError(error, "Failed to update email"));
    } finally {
      setSaving((state) => ({ ...state, security: false }));
    }
  }

  async function savePassword(data) {
    setSaving((state) => ({ ...state, password: true }));
    try {
      await settingsService.updatePassword(data);
      toast.success("Password updated");
      closeModal();
    } catch (error) {
      toast.error(apiError(error, "Failed to update password"));
    } finally {
      setSaving((state) => ({ ...state, password: false }));
    }
  }

  async function toggleTwoFactor(value) {
    const action = value ? "enable" : "disable";
    const confirmed = window.confirm(`Are you sure you want to ${action} Two-Factor Authentication?`);
    if (!confirmed) {
      // rollback UI switch immediately
      securityForm.setValue("two_factor_enabled", !value);
      return;
    }

    securityForm.setValue("two_factor_enabled", value);
    setSaving((state) => ({ ...state, twoFactor: true }));
    try {
      const response = await settingsService.updateSecurity({
        two_factor_enabled: value,
      });
      setSecurity(response.data);
      securityForm.reset({
        two_factor_enabled: response.data.two_factor_enabled || false,
      });
      toast.success(
        value
          ? "Two factor authentication enabled"
          : "Two factor authentication disabled",
      );
    } catch (error) {
      securityForm.setValue("two_factor_enabled", !value);
      toast.error(
        apiError(error, "Failed to update two factor authentication"),
      );
    } finally {
      setSaving((state) => ({ ...state, twoFactor: false }));
    }
  }

  function handleLogoUpload(event) {
    if (saving.uploadLogo) return;

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      event.target.value = "";
      return;
    }

    const form = new FormData();
    form.append("file", file);
    setSaving((s) => ({ ...s, uploadLogo: true }));
    settingsService
      .uploadLogo(form)
      .then((res) => {
        const url = res.data.logo || res.data;
        setLogoPreview(url);
        profileForm.setValue("logo", url, { shouldDirty: true });
        queryClient.invalidateQueries({ queryKey: ["storeSettings"] });
        toast.success("Logo uploaded");
      })
      .catch((err) => {
        toast.error(apiError(err, "Logo upload failed"));
      })
      .finally(() => {
        event.target.value = "";
        setSaving((s) => ({ ...s, uploadLogo: false }));
      });
  }

  async function updatePaymentMethod(method, fields) {
    const previous = payments;
    setPayments((items) =>
      items.map((item) =>
        item.id === method.id ? { ...item, ...fields } : item
      )
    );
    setPaymentLoading((state) => ({
      ...state,
      [method.id]: true,
    }));

    try {
      const response = await settingsService.updatePayment(method.id, fields);
      setPayments((items) =>
        items.map((item) =>
          item.id === method.id ? { ...item, ...response.data } : item
        )
      );

      // Local storage logs for toggles
      if (fields.is_active !== undefined) {
        const value = fields.is_active;
        const existing = safeParseStorage("paymentActivity", []);
        if (!value) {
          const updated = [
            ...existing.filter((item) => item.id !== method.id),
            {
              id: method.id,
              message: `${method.name} disabled`,
            },
          ];
          localStorage.setItem("paymentActivity", JSON.stringify(updated));
        } else {
          const updated = existing.filter((item) => item.id !== method.id);
          localStorage.setItem("paymentActivity", JSON.stringify(updated));
        }
      }

      toast.success(`${method.name} updated successfully.`);
    } catch (error) {
      setPayments(previous);
      toast.error(apiError(error, "Failed to update payment method"));
    } finally {
      setPaymentLoading((state) => ({
        ...state,
        [method.id]: false,
      }));
    }
  }

  function togglePayment(method, value) {
    updatePaymentMethod(method, { is_active: value });
  }

  async function toggleNotification(notification, field, value) {
    const previous = notifications;
    const loadingKey = `${notification.id}:${field}`;
    setNotificationLoading((state) => ({ ...state, [loadingKey]: true }));
    setNotifications((items) =>
      items.map((item) =>
        item.id === notification.id ? { ...item, [field]: value } : item,
      ),
    );

    try {
      const response = await settingsService.updateNotification(
        notification.id,
        { [field]: value },
      );
      const existing = safeParseStorage("notificationActivity", []);

      const key = `${notification.id}-${field}`;

      if (!value) {
        const updated = [
          ...existing.filter((item) => item.id !== key),
          {
            id: key,
            event: notification.event_name,
            channel: field === "email_enabled" ? "Email" : "WhatsApp",
          },
        ];
        localStorage.setItem("notificationActivity", JSON.stringify(updated));
      } else {
        const updated = existing.filter((item) => item.id !== key);

        localStorage.setItem("notificationActivity", JSON.stringify(updated));
      }
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id ? response.data : item,
        ),
      );
      toast.success(`${notification.event_name} updated`);
    } catch (error) {
      setNotifications(previous);
      toast.error(apiError(error, "Failed to update notification"));
    } finally {
      setNotificationLoading((state) => ({ ...state, [loadingKey]: false }));
    }
  }


  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900 min-h-[400px]">
        <AlertTriangle className="h-12 w-12 text-red-500 animate-pulse" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Failed to load settings
        </h3>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          We encountered an error while trying to fetch the store settings. Please verify your connection and try again.
        </p>
        <Button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(false);
            setRetryTrigger((prev) => prev + 1);
          }}
          variant="secondary"
          className="mt-2 border border-zinc-300 dark:border-zinc-700"
        >
          Retry
        </Button>
      </div>
    );
  }
  async function handleGlobalSave() {
    const isProfileDirty = profileForm.formState.isDirty;
    const isRegionalDirty = regionalForm.formState.isDirty;

    if (!isProfileDirty && !isRegionalDirty) {
      toast("No changes to save");
      return;
    }

    if (isProfileDirty) {
      let success = false;
      await profileForm.handleSubmit(async (data) => {
        await saveProfile(data);
        success = true;
      })();
      if (!success) return;
    }

    if (isRegionalDirty) {
      await regionalForm.handleSubmit(saveRegional)();
    }
  }

  const isAnyFormDirty = profileForm.formState.isDirty || regionalForm.formState.isDirty;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Settings"
        description="Store profile, contact details, and preferences"

    
        actions={
          <Button
            type="button"
            onClick={handleGlobalSave}
            disabled={
              !isAnyFormDirty ||
              saving.profile ||
              saving.regional ||
              saving.password ||
              saving.security
            }
            variant="save"
            icon={Save}
            className={
              "bg-green-500/90 border whitespace-nowrap border-green-600 hover:bg-green-600 dark:text-black"
            }
          >
            Save Changes
          </Button>
        }
      />
      {/* <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]"> */}
      <div className="flex flex-col gap-5">
        <SettingsCard
          title="Store Profile"
          subtitle="General storefront identity"
          icon={ShoppingBag}
          accent="indigo"
        >
          <form
            onSubmit={profileForm.handleSubmit(saveProfile)}
            className="space-y-5 pb-5"
          >
            <div className="flex flex-col gap-4 border-b-2 p-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Store logo preview"
                    className="h-full w-full  object-cover"
                  />
                ) : (
                  <ImagePlus size={24} className="text-zinc-400" />
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold tracking-wide">
                  Store logo
                </label>
                <label className="mb-2 text-xs font-medium tracking-wide text-gray-500/50">
                  PNG or JPG. Recommended 256 x 256 px
                </label>

                <div className="flex items-center gap-2">
                  <label className={`inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-sm font-medium text-zinc-800 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 ${saving.uploadLogo ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer hover:bg-zinc-100 hover:border-gray-300 dark:hover:bg-zinc-900"}`}>
                    {saving.uploadLogo ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-800 border-t-transparent animate-spin dark:border-zinc-100" />
                    ) : (
                      <Upload size={14} />
                    )}
                    {saving.uploadLogo ? "Uploading..." : "Upload Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleLogoUpload}
                      disabled={saving.uploadLogo}
                    />
                  </label>

                  {logoPreview && (
                    <Button
                      type="button"
                      onClick={handleRemoveLogo}
                      variant="delete"
                      className="inline-flex items-center !text-sm !font-medium  gap-2 p-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:!bg-red-500/90 dark:hover:!border-red-500/50"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <input type="hidden" {...profileForm.register("logo")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FormInput
                  label="Store Name"
                  readOnly={true}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm text-zinc-500 outline-none transition cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                  error={profileForm.formState.errors.store_name}
                  {...profileForm.register("store_name")}
                />
              </div>
              <div>
                <FormInput
                  label="Store URL"
                  readOnly={true}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm text-zinc-500 outline-none transition cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                  error={profileForm.formState.errors.store_url}
                  {...profileForm.register("store_url")}
                />
              </div>
              <FormInput
                label="Support Email"
                type="email"
                error={profileForm.formState.errors.support_email}
                {...profileForm.register("support_email", {
                  required: "Support email is required",
                  maxLength: { value: 255, message: "Support email cannot exceed 255 characters" },
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: "Invalid email address",
                  },
                })}
              />

              {/* +91 Indian Phone Prefix Input */}
              <div>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Support Phone</span>
                  <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-950">
                    <span className="inline-flex items-center px-3 bg-gray-50 border-r border-gray-200 text-sm text-zinc-500 font-medium shrink-0 select-none dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9876543210"
                      className="flex-1 px-3 py-2 text-sm text-zinc-950 outline-none bg-transparent dark:text-zinc-50"
                      {...profileForm.register("support_phone", {
                        validate: (val) => {
                          if (!val || val.trim() === "") return true;
                          const digits = val.replace(/[^0-9]/g, "");
                          if (digits.length !== 10) return "Enter exactly 10 digits";
                          if (!/^[6-9]/.test(digits)) return "Indian mobile numbers start with 6, 7, 8, or 9";
                          return true;
                        },
                      })}
                    />
                  </div>
                  {profileForm.formState.errors.support_phone && (
                    <span className="block text-[11px] font-semibold text-red-600">
                      {profileForm.formState.errors.support_phone.message}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-400">Enter 10-digit mobile number without country code</span>
                </label>
              </div>
            </div>

            {/* Short Description with live counter */}
            <div>
              <label className="block space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Short Description</span>
                  <span className={`text-[11px] font-mono tabular-nums ${
                    (profileForm.watch("description") || "").length >= 200
                      ? "text-red-500 font-bold"
                      : "text-zinc-400"
                  }`}>
                    {(profileForm.watch("description") || "").length} / 200
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={200}
                  placeholder="A short description of your store…"
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  {...profileForm.register("description", {
                    maxLength: { value: 200, message: "Description must be under 200 characters" },
                  })}
                />
                {profileForm.formState.errors.description && (
                  <span className="block text-[11px] font-semibold text-red-600">
                    {profileForm.formState.errors.description.message}
                  </span>
                )}
              </label>
            </div>

            <FormTextarea
              label="Store Location"
              error={profileForm.formState.errors.store_location}
              {...profileForm.register("store_location", {
                maxLength: {
                  value: 1000,
                  message: "Store Location must be under 1000 characters",
                },
              })}
            />

            <div className="flex justify-end">
              <SaveButton loading={saving.profile} disabled={saving.profile || !profileForm.formState.isDirty}>Save Profile</SaveButton>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard
          title="Regional & Currency"
          subtitle="Market defaults"
          icon={Globe2}
          accent="emerald"
        >
          <form
            onSubmit={regionalForm.handleSubmit(saveRegional)}
            className="flex flex-col w-full gap-5 pb-5"
          >
            <div className="flex flex-col sm:flex-row w-full gap-4">
              <div className="w-full flex flex-col gap-3">
                <SelectInput
                  label="Country"
                  options={countriesList.length > 0 ? countriesList : countries}
                  error={regionalForm.formState.errors.country}
                  {...regionalForm.register("country", {
                    required: "Country is required",
                    minLength: { value: 2, message: "Country name is too short" },
                    maxLength: { value: 100, message: "Country name cannot exceed 100 characters" },
                  })}
                />
                <SelectInput
                  label="Currency"
                  options={currenciesList.length > 0 ? currenciesList : currencies}
                  error={regionalForm.formState.errors.currency}
                  {...regionalForm.register("currency", {
                    required: "Currency is required",
                    minLength: { value: 2, message: "Currency code is too short" },
                    maxLength: { value: 10, message: "Currency code cannot exceed 10 characters" },
                  })}
                />
              </div>
              <div className="w-full flex flex-col gap-3">
                <SelectInput
                  label="Timezone"
                  options={timezonesList.length > 0 ? timezonesList : timezones}
                  error={regionalForm.formState.errors.timezone}
                  {...regionalForm.register("timezone", {
                    required: "Timezone is required",
                    minLength: { value: 2, message: "Timezone is too short" },
                    maxLength: { value: 100, message: "Timezone cannot exceed 100 characters" },
                  })}
                />
                <SelectInput
                  label="Weight Unit"
                  options={weightUnitsList.length > 0 ? weightUnitsList : weightUnits}
                  error={regionalForm.formState.errors.weight_unit}
                  {...regionalForm.register("weight_unit", {
                    required: "Weight unit is required",
                    minLength: { value: 1, message: "Weight unit is too short" },
                    maxLength: { value: 20, message: "Weight unit cannot exceed 20 characters" },
                  })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <SaveButton loading={saving.regional} disabled={saving.regional || !regionalForm.formState.isDirty}>Save Regional</SaveButton>
            </div>
          </form>
        </SettingsCard>
      </div>

      <SettingsCard
        title="Admin Account"
        subtitle="Login, verification, and access security"
        icon={ShieldCheck}
        accent="sky"
      >
        <div className="flex flex-col gap-3 pb-5">
          <div className="flex flex-wrap gap-3 justify-between border-b-2 border-gray-200 p-4 dark:border-zinc-800">
            <span className="flex-1 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <UserRound size={14} />
              Username
            </span>

            <div className="flex-1 flex justify-between gap-4">
              <p className="mt-2 truncate text-sm font-bold text-zinc-950 dark:text-zinc-50">
                {security?.username}
              </p>

              <Button
                type="button"
                variant="download"
                onClick={() => {
                  // per requirements: open modal with empty inputs (do not preload current username)
                  usernameForm.reset({ username: "", current_password: "" });
                  setActiveModal("username");
                }}
              >
                Change
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-between border-b-2 border-gray-200 p-4 dark:border-zinc-800">
            <div className="flex-1 flex gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <Mail size={14} />
                Login Email
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full p-1 px-2 text-xs font-bold ${security?.email_verified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}
              >
                <BadgeCheck size={14} />
                {security?.email_verified
                  ? "Verified"
                  : "Verification Required"}
              </span>
            </div>
            <div className="flex-1 flex justify-between gap-4">
              <p className="mt-2 truncate text-sm font-bold text-zinc-950 dark:text-zinc-50">
                {security?.email}
              </p>
              <Button
                type="button"
                variant="download"
                onClick={() => {
                  // per requirements: open modal with empty inputs (do not preload current email)
                  emailForm.reset({ email: "", current_password: "" });
                  setActiveModal("email");
                }}
              >
                Change
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-between border-b-2 border-gray-200 p-4 dark:border-zinc-800">
            <div className="flex-1 flex">
              <span className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <LockKeyhole size={14} />
                Password
              </span>
            </div>
            <div className="flex-1 flex justify-between gap-4">
              <p className="mt-2 text-sm font-bold text-zinc-950 dark:text-zinc-50">
                **********
              </p>
              <Button
                type="button"
                variant="download"
                onClick={() => {
                  passwordForm.reset({
                    current_password: "",
                    new_password: "",
                    confirm_password: "",
                  });
                  setActiveModal("password");
                }}
              >
                Change
              </Button>
            </div>
          </div>
          <div className="flex flex-col flex-wrap justify-between gap-4">
            <div className="border-b-2 border-gray-200 dark:border-zinc-800">
              <h1 className="uppercase text-xs sm:text-sm md:text-base p-3 pb-2 text-zinc-500 dark:text-zinc-400">
                Two Factor Authentication
              </h1>
            </div>
            <div className="flex flex-wrap items-start gap-3 justify-between px-4 py-3 flex-row">
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Authenticator App
                </h2>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Google Authenticator or Authy
                </p>
              </div>

              <div className="flex flex-1 items-center justify-between gap-4">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    twoFactorEnabled
                      ? "border border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "border border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {twoFactorEnabled ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <ShieldX size={14} />
                  )}

                  {authenticatorStatus}
                </span>

                <ToggleSwitch
                  checked={twoFactorEnabled}
                  loading={saving.twoFactor}
                  label=""
                  onChange={toggleTwoFactor}
                />
              </div>
            </div>
          </div>

          <AlertBox>Changing login email requires verification.</AlertBox>
        </div>

        {activeModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={closeModal}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {activeModal === "username"
                    ? "Update Username"
                    : activeModal === "email"
                      ? "Update Email"
                      : "Change Password"}
                </h3>
                <button
                  type="button"
                  aria-label="Close"
                  className="-mr-2 rounded p-1 text-zinc-600 hover:bg-zinc-100"
                  onClick={closeModal}
                >
                  ✕
                </button>
              </div>

              {activeModal === "username" && (
                <form
                  onSubmit={usernameForm.handleSubmit(saveUsername)}
                  className="mt-4 grid grid-cols-1 gap-4"
                >
                  <FormInput
                    label="Username"
                    placeholder="Enter new username"
                    error={usernameForm.formState.errors.username}
                    autoFocus
                    {...usernameRegister}
                    ref={(node) => {
                      usernameFirstRef.current = node;
                      usernameRegister.ref(node);
                    }}
                  />
                  <FormInput
                    label="Current Password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="********"
                    endAdornment={
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    }
                    error={usernameForm.formState.errors.current_password}
                    {...usernameForm.register("current_password", {
                      required: "Current password is required",
                    })}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>

                    <SaveButton loading={saving.security}>Save</SaveButton>
                  </div>
                </form>
              )}

              {activeModal === "email" && (
                <form
                  onSubmit={emailForm.handleSubmit(saveEmail)}
                  className="mt-4 space-y-4"
                >
                  <FormInput
                    label="Email Address"
                    type="email"
                    placeholder="Enter new email"
                    autoFocus
                    error={emailForm.formState.errors.email}
                    {...emailRegister}
                    ref={(node) => {
                      emailFirstRef.current = node;
                      emailRegister.ref(node);
                    }}
                  />
                  <FormInput
                    label="Current Password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="********"
                    endAdornment={
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    }
                    error={emailForm.formState.errors.current_password}
                    {...emailForm.register("current_password", {
                      required: "Current password is required",
                    })}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>

                    <SaveButton loading={saving.security}>
                      Save Email
                    </SaveButton>
                  </div>
                </form>
              )}

              {activeModal === "password" && (
                <form
                  onSubmit={passwordForm.handleSubmit(savePassword)}
                  className="mt-4 space-y-4 rounded-xl border border-gray-200 p-4 dark:border-zinc-800"
                >
                  <FormInput
                    label="Current Password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="********"
                    endAdornment={
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    }
                    error={passwordForm.formState.errors.current_password}
                    {...passwordCurrentRegister}
                    ref={(node) => {
                      passwordFirstRef.current = node;
                      passwordCurrentRegister.ref(node);
                    }}
                  />

                  <FormInput
                    label="New Password"
                    type={showNewPassword ? "text" : "password"}
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    }
                    error={passwordForm.formState.errors.new_password}
                    {...passwordForm.register("new_password", {
                      required: "New password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                      maxLength: {
                        value: 128,
                        message: "Password cannot exceed 128 characters",
                      },
                      validate: {
                        nonEmpty: (val) => val.trim().length >= 8 || "Password cannot be empty or whitespace-only",
                        uppercase: (val) => /[A-Z]/.test(val) || "Password must contain at least one uppercase letter",
                        lowercase: (val) => /[a-z]/.test(val) || "Password must contain at least one lowercase letter",
                        number: (val) => /\d/.test(val) || "Password must contain at least one number",
                        specialChar: (val) => /[^A-Za-z0-9]/.test(val) || "Password must contain at least one special character",
                        notSame: (val) => val !== passwordForm.watch("current_password") || "New password must be different from current password"
                      }
                    })}
                  />

                  {newPasswordValue && (
                    <div className="space-y-1.5 px-1">
                      <div className="flex justify-between text-[11px] font-bold text-zinc-500">
                        <span>Password Strength:</span>
                        <span className={
                          passwordStrength <= 1 ? "text-red-500" :
                          passwordStrength === 2 ? "text-amber-500" :
                          passwordStrength === 3 ? "text-sky-500" :
                          "text-green-500"
                        }>
                          {passwordStrength <= 1 ? "Weak" :
                           passwordStrength === 2 ? "Fair" :
                           passwordStrength === 3 ? "Good" :
                           "Strong"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            passwordStrength <= 1 ? "w-1/4 bg-red-500" :
                            passwordStrength === 2 ? "w-2/4 bg-amber-500" :
                            passwordStrength === 3 ? "w-3/4 bg-sky-500" :
                            "w-full bg-green-500"
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  <FormInput
                    label="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    endAdornment={
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    }
                    error={passwordForm.formState.errors.confirm_password}
                    {...passwordForm.register("confirm_password", {
                      required: "Confirm password is required",
                      maxLength: {
                        value: 128,
                        message: "Confirm password cannot exceed 128 characters",
                      },
                      validate: {
                        matches: (value) =>
                          value === passwordForm.watch("new_password") ||
                          "Passwords do not match",
                        nonEmpty: (value) =>
                          value.trim().length > 0 ||
                          "Confirm password cannot be empty or whitespace-only",
                      }
                    })}
                  />


                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>

                    <SaveButton loading={saving.password}>
                      Change Password
                    </SaveButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </SettingsCard>

      <SettingsCard
        title="Payment Methods"
        subtitle="Gateway availability and collection modes"
        icon={CreditCardIcon}
        accent="amber"
      >
        <div className="flex flex-col gap-3 py-4">
          {payments.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              loading={paymentLoading[method.id]}
              onToggle={togglePayment}
              onUpdate={updatePaymentMethod}
            />
          ))}
        </div>
      </SettingsCard>
      <SettingsCard
        title="Notification Triggers"
        subtitle="Event channels"
        icon={Mail}
        accent="rose"
      >
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_100px] items-center border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <span>Event</span>
            <span className="text-center">Email</span>
            <span className="text-center">WhatsApp</span>
          </div>

          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              loadingField={
                notificationLoading[`${notification.id}:email_enabled`]
                  ? "email_enabled"
                  : notificationLoading[`${notification.id}:whatsapp_enabled`]
                    ? "whatsapp_enabled"
                    : ""
              }
              onToggle={toggleNotification}
            />
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function CreditCardIcon(props) {
  return <ShoppingBag {...props} />;
}
