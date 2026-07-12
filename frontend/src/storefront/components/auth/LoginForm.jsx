import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  clearCustomerError,
  setCustomerSession,
  setCredentials,
} from "@/storefront/store/customerSlice";
import { googleLogin, login, logout } from "@/firebase/auth";
import {
  syncCustomerCollectionsThunk,
} from "@/storefront/store/customerCollectionThunks";

const FIREBASE_BACKEND_URL = "/api/v1/auth/firebase/login";

const CUSTOMER_PROFILE_URL = "/api/v1/auth/customer/profile";

export default function LoginForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  // =========================================================
  // Form State
  // =========================================================

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loadingType, setLoadingType] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================
  // Save Customer Login Session
  // =========================================================

  const saveCustomerSession = (responseData) => {
    const accessToken = responseData.access_token;

    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    dispatch(
      setCustomerSession({
        customer: responseData.customer,
        token: accessToken,
      }),
    );

    window.dispatchEvent(new Event("customer-auth-changed"));
  };

  // =========================================================
  // Firebase → FastAPI Login
  // =========================================================

  const connectFirebaseToBackend = async (firebaseUser) => {
    // Get latest Firebase ID token

    const idToken = await firebaseUser.getIdToken(true);

    // Send Firebase token to backend

    const response = await axios.post(FIREBASE_BACKEND_URL, {
      id_token: idToken,
    });

    // Save the backend customer JWT and backend-synchronized profile.

    saveCustomerSession(response.data);

    // Get pending signup profile
    const pendingProfile = localStorage.getItem("pending_customer_profile");

    // No signup details available

    if (!pendingProfile) {
      return response.data;
    }

    try {
      // Convert saved JSON to object

      const profile = JSON.parse(pendingProfile);

      // Save customer details
      // in Supabase database

      const profileResponse = await axios.put(
        CUSTOMER_PROFILE_URL,

        profile,

        {
          headers: {
            Authorization: `Bearer ${response.data.access_token}`,
          },
        },
      );

      // Update local customer details

      if (profileResponse.data.customer) {
        const updatedSession = {
          ...response.data,
          customer: profileResponse.data.customer,
        };

        saveCustomerSession(updatedSession);

        localStorage.removeItem("pending_customer_profile");

        return updatedSession;
      }

      // Remove temporary details
      // only after database success

      localStorage.removeItem("pending_customer_profile");

      console.log("Customer profile saved successfully");
    } catch (profileError) {
      console.error(
        "Customer profile save failed:",

        profileError.response?.data || profileError,
      );

      // Keep pending profile
      // to retry during next login

      toast.error("Login successful, but profile details could not be saved.");
    }

    return response.data;
  };

  // =========================================================
  // Redirect After Login
  // =========================================================

  const redirectAfterLogin = () => {
    const redirectPath = location.state?.from?.pathname || "/";

    navigate(
      redirectPath,

      {
        replace: true,
      },
    );
  };

  // =========================================================
  // Email and Password Login
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting || loadingType) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setIsSubmitting(true);
    setLoadingType("email");

    try {
      // 1. Dispatch backend login check (Admin flow)
      const { loginThunk } = await import("@/admin/store/authSlice");
      const resultAction = await dispatch(loginThunk({ email: normalizedEmail, password }));

      if (loginThunk.fulfilled.match(resultAction)) {
        const data = resultAction.payload;
        if (data.auth_type === "admin") {
          // Clear customer session to prevent cross-session contamination
          localStorage.removeItem("customer_token");
          localStorage.removeItem("customer");
          dispatch(customerLogout());

          toast.success("Welcome back, Admin!");
          navigate("/admin/dashboard", { replace: true });
          return;
        }
        // If data.auth_type === "customer", proceed with Firebase Authentication
      } else {
        const errorMsg = resultAction.payload || "Invalid email or password.";
        toast.error(errorMsg);
        return;
      }

      // Clear admin session before logging in as customer
      const { logout: adminLogout } = await import("@/admin/store/authSlice");
      dispatch(adminLogout());

      // 2. Firebase email login (Customer flow)
      const userCredential = await login(
        normalizedEmail,

        password,
      );

      const firebaseUser = userCredential.user;

      // Block login until email verification, except for test accounts ending in @example.com
      if (!normalizedEmail.endsWith("@example.com") && !firebaseUser.emailVerified) {
        await logout();
        toast.error("Please verify your email before signing in.");
        return;
      }

      // Connect Firebase account to backend
      await connectFirebaseToBackend(firebaseUser);
      await dispatch(syncCustomerCollectionsThunk()).unwrap();

      toast.success("Welcome back!");

      redirectAfterLogin();
    } catch (err) {
      console.error("Login failed:", err);

      let errorMessage = "Invalid email or password.";

      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        errorMessage = "Invalid email or password.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoadingType(null);
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // Google Login
  // =========================================================

  const handleGoogleLogin = async () => {
    if (loadingType) {
      return;
    }

    try {
      setLoadingType("google");

      // Firebase Google login

      const userCredential = await googleLogin();

      // Connect Firebase
      // account to backend

      await connectFirebaseToBackend(userCredential.user);
      await dispatch(syncCustomerCollectionsThunk(),).unwrap();

      toast.success("Welcome!");

      redirectAfterLogin();
    } catch (error) {
      console.error("Google login failed:", error);

      if (error.code === "auth/popup-closed-by-user") {
        return;
      }

      if (error.code === "auth/cancelled-popup-request") {
        return;
      }

      if (error.code === "auth/popup-blocked") {
        toast.error("Google popup was blocked. Please allow popups.");
        return;
      }

      showLoginError(error);
    } finally {
      setLoadingType(null);
    }
  };

  // =========================================================
  // Login Error Messages
  // =========================================================

  const showLoginError = (error) => {
    const backendMessage = error.response?.data?.detail;

    if (backendMessage) {
      toast.error(backendMessage);

      return;
    }

    switch (error.code) {
      case "auth/invalid-credential":
        toast.error("Invalid email or password.");

        break;

      case "auth/invalid-email":
        toast.error("Please enter a valid email address.");

        break;

      case "auth/user-disabled":
        toast.error("This account has been disabled.");

        break;

      case "auth/too-many-requests":
        toast.error("Too many login attempts. Please try again later.");

        break;

      case "auth/network-request-failed":
        toast.error("Network error. Please check your internet connection.");

        break;

      case "auth/popup-blocked":
        toast.error("Google login popup was blocked. Please allow popups.");

        break;

      default:
        toast.error("Login failed. Please try again.");
    }
  };

  const isLoading = loadingType !== null || isSubmitting;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      className="
        min-h-[70vh]
        flex
        items-center
        justify-center
        px-4
        py-16
      "
    >
      <div
        className="
          w-full
          max-w-md
          bg-app
          border
          border-app
          rounded-2xl
          p-8
          shadow-card
          dark:shadow-card-dark
        "
      >
        {/* Title */}

        <h1
          className="
            font-display
            font-bold
            text-2xl
            text-app
            text-center
            mb-1
          "
        >
          Welcome Back
        </h1>

        <p
          className="
            text-sm
            text-muted
            text-center
            mb-6
          "
        >
          Sign in to continue shopping
        </p>

        {/* Login Form */}

        <form
          onSubmit={handleSubmit}
          className="
            flex
            flex-col
            gap-4
          "
        >
          {/* Email */}

          <div
            className="
              relative
            "
          >
            <Mail
              size={16}
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-muted
              "
            />

            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              disabled={isLoading}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              aria-label="Email address"
              className="
                w-full
                bg-surface
                border
                border-app
                rounded-xl
                py-3
                pl-11
                pr-4
                text-sm
                text-app
                focus:outline-none
                focus:ring-2
                focus:ring-brand-500/20
                focus:border-brand-500
                transition-all
                placeholder:text-muted
                disabled:opacity-60
              "
            />
          </div>

          {/* Password */}

          <div
            className="
              relative
            "
          >
            <Lock
              size={16}
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-muted
              "
            />

            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              disabled={isLoading}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              aria-label="Password"
              className="
                w-full
                bg-surface
                border
                border-app
                rounded-xl
                py-3
                pl-11
                pr-11
                text-sm
                text-app
                focus:outline-none
                focus:ring-2
                focus:ring-brand-500/20
                focus:border-brand-500
                transition-all
                placeholder:text-muted
                disabled:opacity-60
              "
            />

            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-muted hover:text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-full transition-colors disabled:opacity-50"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Forgot Password */}

          <div
            className="
              flex
              justify-end
            "
          >
            <Link
              to="/auth/forgot-password"
              className="inline-block py-2 text-xs text-brand-500 hover:text-brand-600 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md"
            >
              Forgot password?
            </Link>
          </div>

          {/* Login Button */}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 text-white font-semibold text-sm rounded-full shadow-glow-sm transition-colors mt-2"
          >
            {loadingType === "email" ? (
              <Loader2
                size={16}
                className="
                      animate-spin
                    "
              />
            ) : (
              <LogIn size={16} />
            )}

            {loadingType === "email" ? "Signing in..." : "Sign In"}
          </button>

          {/* OR */}

          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                h-px
                flex-1
                border-t
                border-app
              "
            />

            <span
              className="
                text-xs
                text-muted
              "
            >
              OR
            </span>

            <div
              className="
                h-px
                flex-1
                border-t
                border-app
              "
            />
          </div>

          {/* Google Login */}

          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full h-12 inline-flex items-center justify-center gap-2 border border-app rounded-full font-medium hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 transition text-sm text-app"
          >
            {loadingType === "google" ? (
              <>
                <Loader2
                  size={16}
                  className="
                        animate-spin
                      "
                />
                Connecting...
              </>
            ) : (
              "Continue with Google"
            )}
          </button>
        </form>

        {/* Register */}

        <p
          className="
            text-center
            text-sm
            text-muted
            mt-6
          "
        >
          New here?{" "}
          <Link
            to="/auth/register"
            className="inline-block py-2 text-brand-500 font-semibold hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}