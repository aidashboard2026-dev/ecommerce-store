import React, { useEffect } from "react";
import axios from "axios";
import { BrowserRouter } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";


import { fetchMeThunk } from "@/admin/store/authSlice";
import {
  fetchCustomerMeThunk,
  initializeCustomerAuth,
} from "@/storefront/store/customerSlice";
import AppRoutes from "@/shared/routes/AppRoutes";
import ErrorBoundary from "@/shared/components/common/ErrorBoundary";
import useStoreSettings from "@/shared/hooks/useStoreSettings";
import { storefrontAPI } from "@/shared/services/api";
import { resolveShippingFeeFromPayments } from "@/shared/utils/checkoutTotals";
import { setShippingFee } from "@/storefront/store/cartSlice";

import { loadCustomerCollectionsThunk } from "@/storefront/store/customerCollectionThunks";

function App() {
  const dispatch = useDispatch();

  

  // Admin authentication
  const adminToken = useSelector((state) => state.auth.token);
  const adminInitialized = useSelector((state) => state.auth.initialized);

  // Customer authentication
  const customerToken = useSelector((state) => state.customer.token);
  const customerInitialized = useSelector(
    (state) => state.customer.initialized
  );

  const { settings, isLoading: settingsLoading } = useStoreSettings();
  const { data: publicPayments = [] } = useQuery({
    queryKey: ["publicPayments"],
    queryFn: async () => {
      const response = await storefrontAPI.getPublicPayments();
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // useEffect...
  // useEffect...
  // useEffect...

 

 
  // --------------------------------------------------
  // Store settings
  // --------------------------------------------------

  useEffect(() => {
    // Browser title is set statically in index.html — do NOT overwrite document.title here.
    const envStoreName = import.meta.env.VITE_STORE_NAME || "My Designers";
    const envStoreUrl =
      import.meta.env.VITE_STORE_URL || "https://mydesigners.com";

    // Keep localStorage in sync for invoice generator and price formatter utilities.
    localStorage.setItem("store_name", envStoreName);
    localStorage.setItem("store_url", envStoreUrl);

    if (!settings) return;

    if (settings.logo) {
      localStorage.setItem("store_logo", settings.logo);
    } else {
      localStorage.removeItem("store_logo");
    }

    if (settings.support_email) {
      localStorage.setItem("store_email", settings.support_email);
    }

    if (settings.support_phone) {
      localStorage.setItem("store_phone", settings.support_phone);
    }
  }, [settings]);

  useEffect(() => {
    const shippingFee = resolveShippingFeeFromPayments(publicPayments, "ONLINE");
    dispatch(setShippingFee(shippingFee));
  }, [publicPayments, dispatch]);

  // --------------------------------------------------
  // Admin authentication initialization
  // --------------------------------------------------

  useEffect(() => {
    if (adminToken) {
      // console.log("[Auth Isolation: Admin] Admin token detected. Restoring session.");
      dispatch(fetchMeThunk());
    } else {
      // console.log("[Auth Isolation: Admin] No admin token detected.");
    }
  }, [adminToken, dispatch]);

  // --------------------------------------------------
  // Customer authentication + collection initialization
  // --------------------------------------------------

  useEffect(() => {
    const initializeCustomer = async () => {
      if (!customerToken) {
        // console.log("[Auth Isolation: Customer] No customer token detected.");
        delete axios.defaults.headers.common.Authorization;
        dispatch(initializeCustomerAuth());
        return;
      }

      // console.log("[Auth Isolation: Customer] Customer token detected. Restoring session and loading collections.");
      axios.defaults.headers.common.Authorization = `Bearer ${customerToken}`;

      try {
        // Verify JWT and get latest customer profile
        await dispatch(fetchCustomerMeThunk()).unwrap();

        // Restore current account cart and wishlist from DB
        await dispatch(loadCustomerCollectionsThunk()).unwrap();
      } catch (error) {
        console.error("[Auth Isolation: Customer] Customer session initialization failed:", error);
      }
    };

    initializeCustomer();
  }, [customerToken, dispatch]);


  // --------------------------------------------------
  // Application loading
  // --------------------------------------------------\

  if (!adminInitialized || !customerInitialized || settingsLoading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />

          <p className="text-muted text-sm font-medium">
            Loading {import.meta.env.VITE_STORE_NAME || "My Designers"}...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Application
  // --------------------------------------------------

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            fontSize: "12.5px",
            borderRadius: "12px",
            padding: "10px 14px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
