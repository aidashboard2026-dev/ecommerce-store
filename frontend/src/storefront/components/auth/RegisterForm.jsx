import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
import {
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { signup, logout } from "@/firebase/auth";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    dob: "",
    password: "",
    confirmPassword: "",
  });

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // ------------------------------------------------------------------
  // Password Policy
  // Must be at least 8 characters, contain at least one letter,
  // and at least one digit or special character.
  // Common/trivial passwords are blocked.
  // ------------------------------------------------------------------
  const COMMON_PASSWORDS = new Set([
    "password", "password1", "password123",
    "12345678", "123456789", "1234567890",
    "abc12345", "abc123456", "abcdefgh",
    "qwerty123", "letmein1", "iloveyou1",
    "admin123", "welcome1", "monkey123",
    "dragon12", "master12", "sunshine1",
  ]);

  const validatePassword = (pwd) => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!/[a-zA-Z]/.test(pwd)) {
      return "Password must contain at least one letter.";
    }
    if (!/[\d!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(pwd)) {
      return "Password must contain at least one number or special character.";
    }
    if (COMMON_PASSWORDS.has(pwd.toLowerCase())) {
      return "This password is too common. Please choose a stronger password.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.first_name.trim().length < 2) {
      toast.error("First name must be at least 2 characters");
      return;
    }

    if (form.last_name.trim().length < 2) {
      toast.error("Last name must be at least 2 characters");
      return;
    }

    const passwordError = validatePassword(form.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      // Firebase Signup
      await signup(form.email, form.password, form.first_name, form.last_name);

      localStorage.setItem(
        "pending_customer_profile",
        JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          dob: form.dob || null,
        }),
      );
      await logout();
      
      toast.success(
        "Account created! Please check your email and verify your account.",
      );

      navigate("/auth/login", {
        replace: true,
        state: {
          verificationEmail: form.email.trim().toLowerCase(),
        },
      });
    } catch (err) {
      console.error(err);

      switch (err.code) {
        case "auth/email-already-in-use":
          toast.error("Email already exists");
          break;

        case "auth/invalid-email":
          toast.error("Invalid email address");
          break;

        case "auth/weak-password":
          toast.error("Password must be at least 8 characters and contain a letter and number or special character.");
          break;

        default:
          toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-card dark:shadow-card-dark">
        <h1 className="font-display font-bold text-2xl text-app text-center mb-1">
          Create Account
        </h1>
        <p className="text-sm text-muted text-center mb-6">
          Join {import.meta.env.VITE_STORE_NAME || "My Designers"} for exclusive perks
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <User
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                required
                minLength={2}
                value={form.first_name}
                onChange={update("first_name")}
                placeholder="First name"
                aria-label="First name"
                className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-3 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                required
                minLength={2}
                value={form.last_name}
                onChange={update("last_name")}
                placeholder="Last name"
                aria-label="Last name"
                className="w-full bg-surface border border-app rounded-xl py-3 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
              />
            </div>
          </div>

          <div className="relative">
            <Mail
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              placeholder="Email address"
              aria-label="Email address"
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
            />
          </div>

          <div className="relative">
            <Phone
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="tel"
              value={form.phone}
              onChange={update("phone")}
              placeholder="Phone number (optional)"
              aria-label="Phone number (optional)"
              minLength={10}
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
            />
          </div>

          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="date"
              required
              value={form.dob}
              onChange={update("dob")}
              aria-label="Date of birth"
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div className="relative">
            <Lock
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
              placeholder="Password (min 8 characters)"
              aria-label="Password (min 8 characters)"
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-11 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="relative">
            <Lock
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type={showConfirm ? "text" : "password"}
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              placeholder="Confirm password"
              aria-label="Confirm password"
              className="w-full bg-surface border border-app rounded-xl py-3 pl-11 pr-11 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={
                showConfirm ? "Hide confirm password" : "Show confirm password"
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-full shadow-glow-sm transition-colors mt-2"
          >
            <UserPlus size={16} />
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="text-brand-500 font-semibold hover:text-brand-600"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
