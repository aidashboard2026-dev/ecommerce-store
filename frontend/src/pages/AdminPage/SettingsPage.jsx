import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  BadgeCheck,
  Globe2,
  Upload,
  ImagePlus,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldX,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import { PageLoader } from "../../components/common/Spinner";
import NotificationRow from "../../components/settings/NotificationRow";
import PaymentMethodCard from "../../components/settings/PaymentMethodCard";
import SettingsCard from "../../components/settings/SettingsCard";
import ToggleSwitch from "../../components/settings/ToggleSwitch";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import settingsService from "../../services/settingsService";

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
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) return detail[0]?.msg || fallback;
  return detail || fallback;
}

function FormInput({ label, error, endAdornment, ...props }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
        {label}
      </span>

      <div className="relative">
        <input
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

function FormTextarea({ label, error, ...props }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
        {label}
      </span>
      <textarea
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

function SelectInput({ label, error, options, ...props }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
        {label}
      </span>
      <select
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

function AlertBox({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <p className="font-semibold">{children}</p>
    </div>
  );
}

function SaveButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
      ) : (
        <Save size={16} />
      )}
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
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

  // const [showUserNameForm, setShowUserNameForm] = useState(false)
  // const [showEmailForm, setShowEmailForm] = useState(false)
  // const [showPasswordForm, setShowPasswordForm] = useState(false)

  const profileForm = useForm({
    defaultValues: {
      store_name: "",
      store_url: "",
      support_email: "",
      support_phone: "",
      description: "",
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

  // Small security-only form for two-factor toggle (keeps it separate)
  const securityForm = useForm({
    defaultValues: { two_factor_enabled: false },
  });
  const twoFactorEnabled = securityForm.watch("two_factor_enabled");
  const authenticatorStatus = useMemo(
    () => (twoFactorEnabled ? "Enabled" : "Not configured"),
    [twoFactorEnabled],
  );

  function handleRemoveLogo() {
    setLogoPreview("");
    profileForm.setValue("logo", "", { shouldDirty: true });
    toast.success("Logo removed");
  }
  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const [settingsResponse, paymentsResponse, notificationsResponse] =
          await Promise.all([
            settingsService.getSettings(),
            settingsService.getPayments(),
            settingsService.getNotifications(),
          ]);

        if (!mounted) return;

        const store = settingsResponse.data.settings;
        const adminSecurity = settingsResponse.data.security;

        setSettings(store);
        setSecurity(adminSecurity);
        setPayments(paymentsResponse.data);
        setNotifications(notificationsResponse.data);
        setLogoPreview(store.logo || "");
        profileForm.reset({
          store_name: store.store_name || "",
          store_url: store.store_url || "",
          support_email: store.support_email || "",
          support_phone: store.support_phone || "",
          description: store.description || "",
          logo: store.logo || "",
        });
        regionalForm.reset({
          country: store.country || "India",
          currency: store.currency || "INR",
          timezone: store.timezone || "Asia/ Kolkata",
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
      } catch (error) {
        toast.error(apiError(error, "Failed to load settings"));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  // Refs to focus first input in each modal
  const usernameFirstRef = useRef(null);
  const emailFirstRef = useRef(null);
  const passwordFirstRef = useRef(null);

  // Prevent background scroll while modal open and focus first input
  useEffect(() => {
    if (activeModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

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
    };
  }, [activeModal]);

  async function saveProfile(data) {
    setSaving((state) => ({ ...state, profile: true }));
    try {
      const response = await settingsService.updateProfile(data);
      setSettings(response.data);
      toast.success("Store profile saved");
    } catch (error) {
      toast.error(apiError(error, "Failed to save store profile"));
    } finally {
      setSaving((state) => ({ ...state, profile: false }));
    }
  }

  async function saveRegional(data) {
    setSaving((state) => ({ ...state, regional: true }));
    try {
      const response = await settingsService.updateSettings(data);
      setSettings(response.data);
      toast.success("Regional settings saved");
    } catch (error) {
      toast.error(apiError(error, "Failed to save regional settings"));
    } finally {
      setSaving((state) => ({ ...state, regional: false }));
    }
  }

  async function saveUsername(data) {
    setSaving((state) => ({ ...state, security: true }));
    try {
      const response = await settingsService.updateSecurity({
        username: data.username,
        current_password: data.current_password,
      });
      setSecurity(response.data);
      // update username form and clear password
      usernameForm.reset({
        username: response.data.username || "",
        current_password: "",
      });
      toast.success("Username updated");
      setActiveModal(null);
    } catch (error) {
      toast.error(apiError(error, "Failed to update username"));
    } finally {
      setSaving((state) => ({ ...state, security: false }));
    }
  }

  async function saveEmail(data) {
    setSaving((state) => ({ ...state, security: true }));
    try {
      const response = await settingsService.updateSecurity({
        email: data.email,
        current_password: data.current_password,
      });
      setSecurity(response.data);
      emailForm.reset({
        email: response.data.email || "",
        current_password: "",
      });
      toast.success("Email updated");
      setActiveModal(null);
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
      passwordForm.reset();
      toast.success("Password updated");
      setActiveModal(null);
    } catch (error) {
      toast.error(apiError(error, "Failed to update password"));
    } finally {
      setSaving((state) => ({ ...state, password: false }));
    }
  }

  async function toggleTwoFactor(value) {
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
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
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
        toast.success("Logo uploaded");
      })
      .catch((err) => toast.error(apiError(err, "Logo upload failed")))
      .finally(() => setSaving((s) => ({ ...s, uploadLogo: false })));
  }

  async function togglePayment(method, value) {
    setPaymentLoading((state) => ({
      ...state,
      [method.id]: true,
    }));

    try {
      const response = await settingsService.updatePayment(method.id, {
        is_active: value,
      });

      setPayments((items) =>
        items.map((item) =>
          item.id === method.id ? { ...item, ...response.data } : item,
        ),
      );
      const existing =
        JSON.parse(localStorage.getItem("paymentActivity")) || [];

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
      toast.success(`${method.name} ${value ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error(apiError(error, "Failed to update payment method"));
    } finally {
      setPaymentLoading((state) => ({
        ...state,
        [method.id]: false,
      }));
    }
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
      const existing =
        JSON.parse(localStorage.getItem("notificationActivity")) || [];

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
        console.log("Saving:", updated);
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
  async function handleGlobalSave() {
    // Save profile, regional and security in sequence if dirty
    if (profileForm.formState.isDirty)
      await profileForm.handleSubmit(saveProfile)();
    if (regionalForm.formState.isDirty)
      await regionalForm.handleSubmit(saveRegional)();
    toast.success("All changes saved");
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Setting"
        description={
          <p className="mt-0.5 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
            Store profile, contact details, and preferences
          </p>
        }
        actions={
          <Button
            type="button"
            onClick={handleGlobalSave}
            disabled={saving.global}
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
                  <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100 hover:border-gray-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900">
                    <Upload size={14} />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleLogoUpload}
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
              <FormInput
                label="Store Name"
                error={profileForm.formState.errors.store_name}
                {...profileForm.register("store_name", {
                  required: "Store name is required",
                  minLength: { value: 2, message: "Store name is too short" },
                })}
              />
              <FormInput
                label="Store URL"
                error={profileForm.formState.errors.store_url}
                {...profileForm.register("store_url", {
                  required: "Store URL is required",
                  pattern: {
                    value: /^https?:\/\/.+/i,
                    message: "Use a full URL with http or https",
                  },
                })}
              />
              <FormInput
                label="Support Email"
                type="email"
                error={profileForm.formState.errors.support_email}
                {...profileForm.register("support_email", {
                  required: "Support email is required",
                })}
              />
              <FormInput
                label="Support Phone"
                error={profileForm.formState.errors.support_phone}
                {...profileForm.register("support_phone")}
              />
            </div>

            <FormTextarea
              label="Short Description"
              error={profileForm.formState.errors.description}
              {...profileForm.register("description", {
                maxLength: {
                  value: 1000,
                  message: "Description must be under 1000 characters",
                },
              })}
            />

            <div className="flex justify-end">
              <SaveButton loading={saving.profile}>Save Profile</SaveButton>
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
            className="flex flex-col sm:flex-row w-full gap-2 pb-5"
          >
            <div className="w-full flex flex-col gap-3">
              <SelectInput
                label="Country"
                options={countries}
                error={regionalForm.formState.errors.country}
                {...regionalForm.register("country", {
                  required: "Country is required",
                })}
              />
              <SelectInput
                label="Currency"
                options={currencies}
                error={regionalForm.formState.errors.currency}
                {...regionalForm.register("currency", {
                  required: "Currency is required",
                })}
              />
            </div>
            <div className="w-full flex flex-col gap-3">
              <SelectInput
                label="Timezone"
                options={timezones}
                error={regionalForm.formState.errors.timezone}
                {...regionalForm.register("timezone", {
                  required: "Timezone is required",
                })}
              />
              <SelectInput
                label="Weight Unit"
                options={weightUnits}
                error={regionalForm.formState.errors.weight_unit}
                {...regionalForm.register("weight_unit", {
                  required: "Weight unit is required",
                })}
              />
            </div>

            {/* <div className="flex justify-end pt-1">
              <SaveButton loading={saving.regional}>Save Regional</SaveButton>
            </div> */}
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
                <h2 className="text-sm whitespace-nowrap font-semibold text-zinc-950 dark:text-zinc-50">
                  Authenticator App
                </h2>

                <p className="text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
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
            onClick={() => setActiveModal(null)}
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
                  onClick={() => setActiveModal(null)}
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
                    {...usernameForm.register("username", {
                      required: "Username is required",
                    })}
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
                    {...passwordForm.register("current_password")}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setActiveModal(null)}
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
                    {...emailForm.register("email", {
                      required: "Email is required",
                    })}
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
                    {...passwordForm.register("current_password")}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setActiveModal(null)}
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
                    {...passwordForm.register("current_password")}
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
                    {...passwordForm.register("new_password")}
                  />

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
                    {...passwordForm.register("confirm_password")}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setActiveModal(null)}
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
