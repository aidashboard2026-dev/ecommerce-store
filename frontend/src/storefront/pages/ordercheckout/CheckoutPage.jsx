import React, { useMemo, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShoppingBag } from "lucide-react";
import BillingAddress from "@/storefront/components/checkout/BillingAddress";
import ContactSection from "@/storefront/components/checkout/ContactSection";
import DeliveryAddress from "@/storefront/components/checkout/DeliveryAddress";
import PaymentSection from "@/storefront/components/checkout/PaymentSection";
import { getImageUrl, formatPrice } from "@/shared/utils/productUtils";
import { removeCustomerCartItemThunk } from "@/storefront/store/customerCartThunks";
import {
  selectSelectedAddress,
  setLastOrder,
  setOrderError,
  setPlacingOrder,
  setPaymentMethod,
} from "@/storefront/store/checkoutStore";
import { clearCart, selectCartTotals } from "@/storefront/store/cartSlice";
import {
  useCreateOrder,
  useCreateRazorpayOrder,
  useVerifyRazorpayPayment,
} from "@/storefront/hooks/useOrders";
import { storefrontAPI } from "@/shared/services/api";
import GuestAuthModal from "@/storefront/components/checkout/GuestAuthModal";

// ============================================================================
// LOGGING HELPERS
// ============================================================================

const debugLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const debugError = (...args) => {
  // Unexpected runtime failures are allowed to use console.error in production
  console.error(...args);
};

const debugApi = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const logStep = (step, details = {}) => {
  debugLog(`[Checkout STEP] ${step}`, details);
};

const logApiCall = (apiName, { sessionId, ordersCount, paymentMethod }) => {
  // Suppressed to avoid scattered logs in DEV and production; see logGroupedApi
};

const logApiResult = (apiName, result, elapsedMs, details = {}) => {
  // Suppressed to avoid scattered logs, since we use logGroupedApi
};

const logExit = ({
  step,
  reason,
  sessionId,
  ordersCount,
  paymentMethod,
  nextApi,
}) => {
  debugLog("EXIT");
  debugLog("Current Step:", step);
  debugLog("Reason:", reason);
  debugLog("Session ID:", sessionId);
  debugLog("Orders Created:", ordersCount);
  debugLog("Payment Method:", paymentMethod);
  debugLog("Next API That Will NOT Execute:", nextApi);
};

const logFailure = ({
  step,
  error,
  sessionId,
  ordersCount,
  nextApiSkipped,
}) => {
  debugError("CHECKOUT FAILURE");
  debugError("Current Step:", step);
  debugError("HTTP Status:", error?.response?.status ?? "N/A");
  debugError(
    "Backend Code:",
    error?.response?.data?.code ?? error?.code ?? "N/A",
  );
  debugError(
    "Backend Message:",
    error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      "N/A",
  );
  debugError("Stack Trace:", error?.stack);
  debugError("Session ID:", sessionId);
  debugError("Current Orders:", ordersCount);
  debugError("Next API Skipped:", nextApiSkipped);
};

// Centralized grouped API logger for DEV environment
const apiMeta = {
  createOrderMutation: {
    method: "POST",
    path: "/orders/customer",
    successStatus: 201,
  },
  createRazorpayOrderMutation: {
    method: "POST",
    path: "/orders/customer/razorpay/create",
    successStatus: 200,
  },
  verifyRazorpayPaymentMutation: {
    method: "POST",
    path: "/orders/customer/razorpay/verify",
    successStatus: 200,
  },
  "getOrders (recovery)": {
    method: "GET",
    path: "/orders/customer/all",
    successStatus: 200,
  },
  "getOrders (mount)": {
    method: "GET",
    path: "/orders/customer/all",
    successStatus: 200,
  },
  "getOrders (dedupe check)": {
    method: "GET",
    path: "/orders/customer/all",
    successStatus: 200,
  },
};

const logGroupedApi = (apiName, isSuccess, elapsedMs, error = null) => {
  if (!import.meta.env.DEV) return;
  const meta = apiMeta[apiName];
  if (!meta) return;

  const status = isSuccess
    ? meta.successStatus
    : error?.response?.status || 500;

  console.group("Checkout API");
  console.log(`${meta.method} ${meta.path}`);
  console.log(`Status ${status}`);
  console.log(`Duration ${elapsedMs} ms`);
  console.groupEnd();
};

// ============================================================================
// SDK & ERROR HELPERS
// ============================================================================

let rzpScriptPromise = null;

const loadRazorpayScript = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }
  if (rzpScriptPromise) {
    return rzpScriptPromise;
  }
  rzpScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.Razorpay) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts >= 50) {
          // 5 seconds max wait
          clearInterval(interval);
          rzpScriptPromise = null; // Allow retry
          resolve(false);
        }
      }, 100);
    };
    script.onerror = () => {
      rzpScriptPromise = null; // Allow retry on failure
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return rzpScriptPromise;
};

const getPaymentErrorMessage = (error) => {
  debugError("[Checkout Error]:", error);
  if (error?.response) {
    debugError("[Checkout Error] response:", error.response);
    debugError("[Checkout Error] response.data:", error.response?.data);
  }

  if (
    error instanceof TypeError &&
    /circular structure/i.test(error.message || "")
  ) {
    debugError(
      "[Checkout Error] Non-serializable payload was sent to the API (circular structure). " +
        "This is almost always caused by passing a DOM/React event where session/order data was expected.",
    );
    return {
      code: "CLIENT_SERIALIZATION_ERROR",
      message:
        "Something went wrong preparing your payment request. Please refresh and try again.",
    };
  }

  if (!error?.response) {
    if (
      error?.code === "ECONNABORTED" ||
      error?.message?.toLowerCase().includes("timeout")
    ) {
      return {
        code: "TIMEOUT",
        message: "Payment request timed out. Please retry.",
      };
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return {
        code: "NETWORK_ERROR",
        message: "Please check your internet connection and try again.",
      };
    }
    if (error?.request) {
      return {
        code: "NETWORK_ERROR",
        message: "Please check your internet connection and try again.",
      };
    }
    return {
      code: "CLIENT_ERROR",
      message: error?.message || "Something went wrong. Please try again.",
    };
  }

  const status = error.response.status;
  const data = error.response.data || {};
  const backendCode = data.code || "";
  const backendMessage = data.message || data.detail || "";

  const fallbackByCode = {
    NETWORK_ERROR: "Please check your internet connection and try again.",
    TIMEOUT: "Payment request timed out. Please retry.",
    UNAUTHORIZED: "Your session has expired. Please sign in again.",
    FORBIDDEN: "You are not authorized to perform this action.",
    VALIDATION_ERROR:
      "Some checkout information is invalid. Please review your details.",
  };

  if (backendCode) {
    return {
      code: backendCode,
      message: backendMessage || fallbackByCode[backendCode] || backendCode,
    };
  }

  if (status === 401)
    return {
      code: "UNAUTHORIZED",
      message: backendMessage || fallbackByCode.UNAUTHORIZED,
    };
  if (status === 403)
    return {
      code: "FORBIDDEN",
      message: backendMessage || fallbackByCode.FORBIDDEN,
    };
  if (status === 422)
    return {
      code: "VALIDATION_ERROR",
      message: backendMessage || fallbackByCode.VALIDATION_ERROR,
    };
  if (status >= 500)
    return {
      code: `HTTP_${status}`,
      message:
        backendMessage ||
        "The server ran into a problem processing your payment. Please try again.",
    };

  return {
    code: `HTTP_${status}`,
    message:
      backendMessage ||
      "Something went wrong while processing your payment. Please try again.",
  };
};

// ============================================================================
// STATE MACHINE CONFIG
// ============================================================================

const CHECKOUT_PHASE = {
  IDLE: "IDLE",
  RECOVERING: "RECOVERING",
  CREATING_ORDERS: "CREATING_ORDERS",
  CREATING_RAZORPAY_ORDER: "CREATING_RAZORPAY_ORDER",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  VERIFYING: "VERIFYING",
  VERIFY_SUCCESS: "VERIFY_SUCCESS",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
};

const LOADING_PHASES = new Set([
  CHECKOUT_PHASE.RECOVERING,
  CHECKOUT_PHASE.CREATING_ORDERS,
  CHECKOUT_PHASE.CREATING_RAZORPAY_ORDER,
  CHECKOUT_PHASE.AWAITING_PAYMENT,
  CHECKOUT_PHASE.VERIFYING,
  CHECKOUT_PHASE.VERIFY_SUCCESS,
]);

const EMPTY_CHECKOUT_FORM = {
  email: "",
  full_name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  billingType: "same",
  billing_full_name: "",
  billing_phone: "",
  billing_address: "",
  billing_city: "",
  billing_state: "",
  billing_pincode: "",
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const cartMatchesOrders = (orderList, items) =>
  orderList.length === items.length &&
  orderList.every((pending) =>
    items.some(
      (item) =>
        item.productId === pending.product_id &&
        item.quantity === pending.quantity &&
        item.size === pending.size &&
        item.color === pending.color,
    ),
  );

const validateRazorpayPrerequisites = ({ sessionId, orders, rzpOrder }) => {
  const checks = {
    "window.Razorpay exists": typeof window.Razorpay !== "undefined",
    "currentSessionId exists": !!sessionId,
    "orders exist": orders.length > 0,
    "Razorpay order exists": !!rzpOrder,
    "amount exists": !!rzpOrder?.amount,
    "key exists": !!rzpOrder?.key,
  };
  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  return { passed: failed.length === 0, failed, checks };
};

const isActivePendingOrder = (order) =>
  order.payment_status === "PENDING" &&
  order.payment_method === "ONLINE" &&
  order.tracking_status !== "CANCELLED";

// ============================================================================
// PAYLOAD HELPERS
// ============================================================================

const buildOrderPayload = ({
  item,
  customer,
  selectedAddress,
  paymentMethod,
  form,
  sessionId,
  shippingFee = 0,
}) => ({
  customer_name: selectedAddress.full_name,
  customer_email: customer?.email || form.email || null,
  customer_phone: selectedAddress.phone,
  address_line1: selectedAddress.address_line1 || selectedAddress.address,
  address_line2: selectedAddress.address_line2 || null,
  city: selectedAddress.city,
  state: selectedAddress.state,
  country: "India",
  pincode: selectedAddress.pincode,
  product_id: item.productId,
  product_name: item.title,
  product_image: item.thumbnail,
  size: item.size,
  color: item.color,
  quantity: item.quantity,
  price: item.sellingPrice,
  shipping_fee: shippingFee,
  total_amount: item.sellingPrice * item.quantity + shippingFee,
  payment_method: paymentMethod,
  payment_status: "PENDING",
  tracking_status: "PLACED",
  cart_session_id: sessionId,
});

// ============================================================================
// API & TIMING HELPERS
// ============================================================================

const measureApi = async (
  apiName,
  apiCall,
  getSuccessDetails = () => ({}),
  getFailureDetails = () => ({}),
) => {
  const start = Date.now();
  try {
    const result = await apiCall();
    const elapsed = Date.now() - start;
    logApiResult(apiName, "SUCCESS", elapsed, getSuccessDetails(result));
    logGroupedApi(apiName, true, elapsed);
    return result;
  } catch (error) {
    const elapsed = Date.now() - start;
    logApiResult(apiName, "FAILED", elapsed, getFailureDetails(error));
    logGroupedApi(apiName, false, elapsed, error);
    throw error;
  }
};

// ============================================================================
// RECOVERY HELPERS
// ============================================================================

const groupOrdersBySession = (orderList) => {
  const sessions = {};
  orderList.forEach((o) => {
    if (!sessions[o.cart_session_id]) sessions[o.cart_session_id] = [];
    sessions[o.cart_session_id].push(o);
  });
  return sessions;
};

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.cart.items);
  const cartTotals = useSelector(selectCartTotals);
  const selectedAddress = useSelector(selectSelectedAddress);
  const paymentMethod = useSelector((state) => state.checkout.paymentMethod);
  const placingOrder = useSelector((state) => state.checkout.placingOrder);
  const { customer, token } = useSelector((state) => state.customer);

  const { data: paymentMethodsList = [] } = useQuery({
    queryKey: ["publicPayments"],
    queryFn: async () => {
      const res = await storefrontAPI.getPublicPayments();
      return res.data || [];
    },
  });

  useEffect(() => {
    if (paymentMethodsList.length > 0) {
      const activeValues = paymentMethodsList.map((m) =>
        m.name.toLowerCase() === "online payment" ? "ONLINE" : "COD",
      );
      if (!activeValues.includes(paymentMethod)) {
        dispatch(setPaymentMethod(activeValues[0]));
      }
    }
  }, [paymentMethodsList, paymentMethod, dispatch]);

  const clearCompletedCustomerCart = async () => {
    const databaseCartItems = items.filter(
      (item) => item.cartItemId !== null && item.cartItemId !== undefined,
    );

    if (databaseCartItems.length > 0) {
      const results = await Promise.allSettled(
        databaseCartItems.map((item) =>
          dispatch(removeCustomerCartItemThunk(item.cartItemId)).unwrap(),
        ),
      );

      const failedDeletes = results.filter(
        (result) => result.status === "rejected",
      );

      if (failedDeletes.length > 0) {
        debugError(
          "[Checkout] Some customer DB cart items could not be removed:",
          failedDeletes,
        );
      }
    }

    // Clear Redux cart and save [] in guest localStorage.
    dispatch(clearCart());

    // Extra cleanup for old guest cart data.
    localStorage.removeItem("aurastore_guest_cart");

    // Remove completed checkout session.
    sessionStorage.removeItem("aurastore_active_cart_session_id");
  };

  const totals = useMemo(() => {
    const nameToFind =
      paymentMethod === "ONLINE" ? "Online Payment" : "Cash On Delivery";
    const selectedMethod = paymentMethodsList.find(
      (m) => m.name.toLowerCase() === nameToFind.toLowerCase(),
    );
    const shipping = selectedMethod ? parseFloat(selectedMethod.fee || 0) : 0;
    const subtotal = cartTotals.subtotal;
    const discountAmount = cartTotals.discountAmount;
    const discountedSubtotal = subtotal - discountAmount;
    /*
    =========================================================
    Future Feature

    GST / Tax Module

    When Tax Settings module is implemented:

    const tax = discountedSubtotal * GST_RATE;

    const total =
        discountedSubtotal +
        shipping +
        tax;

    return {
        subtotal,
        discountAmount,
        discountedSubtotal,
        shipping,
        tax,
        total,
    };

    =========================================================
    */
    const total = discountedSubtotal + shipping;

    return {
      subtotal,
      discountAmount,
      discountedSubtotal,
      shipping,
      total,
    };
  }, [
    paymentMethod,
    paymentMethodsList,
    cartTotals.subtotal,
    cartTotals.discountAmount,
  ]);

  const createOrderMutation = useCreateOrder();
  const createRazorpayOrderMutation = useCreateRazorpayOrder();
  const verifyRazorpayPaymentMutation = useVerifyRazorpayPayment();

  const [checkoutState, setCheckoutState] = useState({
    cartSessionId: null,
    orders: [],
  });

  const [recoveryState, setRecoveryState] = useState({
    isRecovering: false,
    message: "",
    error: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [checkoutPhase, setCheckoutPhase] = useState(CHECKOUT_PHASE.IDLE);

  const [form, setForm] = useState({
    ...EMPTY_CHECKOUT_FORM,
    email: customer?.email || "",
  });

  useEffect(() => {
    const isOverlayActive =
      paymentMethod === "ONLINE" &&
      (checkoutPhase === CHECKOUT_PHASE.CREATING_ORDERS ||
        checkoutPhase === CHECKOUT_PHASE.CREATING_RAZORPAY_ORDER ||
        checkoutPhase === CHECKOUT_PHASE.VERIFYING ||
        checkoutPhase === CHECKOUT_PHASE.VERIFY_SUCCESS);
    if (isOverlayActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [checkoutPhase, paymentMethod]);

  const getButtonText = () => {
    if (paymentMethodsList.length === 0) {
      return "No Payment Methods Available";
    }

    if (paymentMethod === "COD") {
      if (checkoutPhase === CHECKOUT_PHASE.CREATING_ORDERS) {
        return "Creating Order...";
      }
      return "Place Order";
    }

    switch (checkoutPhase) {
      case CHECKOUT_PHASE.CREATING_ORDERS:
        return "Creating Order...";
      case CHECKOUT_PHASE.CREATING_RAZORPAY_ORDER:
        return "Preparing Payment...";
      case CHECKOUT_PHASE.AWAITING_PAYMENT:
        return "Opening Secure Payment...";
      case CHECKOUT_PHASE.VERIFYING:
      case CHECKOUT_PHASE.VERIFY_SUCCESS:
        return "Verifying Payment...";
      default:
        return "Continue to Payment";
    }
  };

  // Single point of truth for loading state.
  const setPhase = (phase, meta = {}) => {
    setCheckoutPhase(phase);
    const isLoading = LOADING_PHASES.has(phase);
    setSubmitting(isLoading);
    dispatch(setPlacingOrder(isLoading));
    debugLog(`[Checkout PHASE] -> ${phase}`, meta);
  };

  // ============================================================================
  // API & STATE HELPERS (COMPONENT BOUND)
  // ============================================================================

  const persistOrderItem = async (item, sessionId, itemShippingFee = 0) => {
    const payload = buildOrderPayload({
      item,
      customer,
      selectedAddress,
      paymentMethod,
      form,
      sessionId,
      shippingFee: itemShippingFee,
    });
    logApiCall("createOrderMutation", {
      sessionId,
      ordersCount: undefined,
      paymentMethod,
    });
    return measureApi(
      "createOrderMutation",
      () => createOrderMutation.mutateAsync(payload),
      (created) => ({ orderId: created?.id, item: item.title }),
      () => ({ item: item.title }),
    );
  };

  const commitCheckoutSession = (sessionId, orders) => {
    setCheckoutState({ cartSessionId: sessionId, orders });
    sessionStorage.setItem("aurastore_active_cart_session_id", sessionId);
  };

  const cleanupStaleSession = async (ordersList) => {
    logStep("Cleaning up confirmed-stale session", {
      orderIds: ordersList.map((o) => o.id),
    });
    try {
      await Promise.all(
        ordersList.map((order) => storefrontAPI.cancelOrder(order.id)),
      );
    } catch (err) {
      logFailure({
        step: "cleanupStaleSession",
        error: err,
        sessionId: null,
        ordersCount: ordersList.length,
        nextApiSkipped: "none — cleanup is best-effort",
      });
    }
  };

  // ============================================================================
  // MOUNT RECOVERY & SESSION MANAGEMENT
  // ============================================================================

  const isPaidSession = (sessionOrders) => {
    return (
      sessionOrders.length > 0 &&
      sessionOrders.every((o) => o.payment_status === "PAID")
    );
  };

  const findMatchingSession = (customerOrders, activeSessionId) => {
    if (activeSessionId) {
      const sessionOrders = customerOrders.filter(
        (o) =>
          o.cart_session_id === activeSessionId &&
          o.tracking_status !== "CANCELLED",
      );
      if (sessionOrders.length > 0 && cartMatchesOrders(sessionOrders, items)) {
        return {
          sessionId: activeSessionId,
          orders: sessionOrders,
          type: "active",
        };
      }
    }

    const otherPendingOrders = customerOrders.filter(
      (o) => isActivePendingOrder(o) && o.cart_session_id,
    );
    if (otherPendingOrders.length > 0) {
      const sessions = groupOrdersBySession(otherPendingOrders);
      const recoveredSessionId = Object.keys(sessions)[0];
      const sessionOrders = sessions[recoveredSessionId];
      if (cartMatchesOrders(sessionOrders, items)) {
        return {
          sessionId: recoveredSessionId,
          orders: sessionOrders,
          type: "other",
        };
      }
    }
    return null;
  };

  const resumeExistingCheckout = async (customerOrders, activeSessionId) => {
    if (activeSessionId) {
      const sessionOrders = customerOrders.filter(
        (o) =>
          o.cart_session_id === activeSessionId &&
          o.tracking_status !== "CANCELLED",
      );
      if (isPaidSession(sessionOrders)) {
        dispatch(
          setLastOrder({
            orders: sessionOrders,
            totals,
            paymentMethod: "ONLINE",
          }),
        );
        await clearCompletedCustomerCart();
        navigate("/order-success", {
          state: { orders: sessionOrders, totals, paymentMethod: "ONLINE" },
          replace: true,
        });
        logStep(
          "Mount recovery: existing session already PAID, navigated to order-success",
        );
        return true;
      }
    }

    const match = findMatchingSession(customerOrders, activeSessionId);
    if (match) {
      if (match.type === "active") {
        setCheckoutState({
          cartSessionId: match.sessionId,
          orders: match.orders,
        });
        logStep("Mount recovery: resumed matching pending session", {
          sessionId: match.sessionId,
        });
      } else {
        sessionStorage.setItem(
          "aurastore_active_cart_session_id",
          match.sessionId,
        );
        setCheckoutState({
          cartSessionId: match.sessionId,
          orders: match.orders,
        });
        toast.success("Resumed your previous pending checkout session.");
        logStep("Mount recovery: resumed other-tab pending session", {
          sessionId: match.sessionId,
        });
      }
      return true;
    }

    if (activeSessionId) {
      const sessionOrders = customerOrders.filter(
        (o) =>
          o.cart_session_id === activeSessionId &&
          o.tracking_status !== "CANCELLED",
      );
      if (sessionOrders.length > 0) {
        setCheckoutState({ cartSessionId: null, orders: [] });
        sessionStorage.removeItem("aurastore_active_cart_session_id");
        logStep(
          "Mount recovery: local session cleared (cart no longer matches); no backend mutation performed",
        );
      }
    }

    const otherPendingOrders = customerOrders.filter(
      (o) => isActivePendingOrder(o) && o.cart_session_id,
    );
    if (otherPendingOrders.length > 0) {
      const sessions = groupOrdersBySession(otherPendingOrders);
      logStep(
        "Mount recovery: other pending sessions found but do not match cart — leaving untouched (no cleanup on mount)",
        {
          sessionIds: Object.keys(sessions),
        },
      );
    }
    return false;
  };

  const recoverActiveSession = async () => {
    setRecoveryState({
      isRecovering: true,
      message: "Reconnecting to your previous checkout. Please wait...",
      error: null,
    });
    try {
      const res = await measureApi("getOrders (recovery)", () =>
        storefrontAPI.getOrders(),
      );
      const customerOrders = res.data?.items || [];
      const otherPendingOrders = customerOrders.filter(
        (o) => isActivePendingOrder(o) && o.cart_session_id,
      );

      if (otherPendingOrders.length === 0) {
        setRecoveryState((prev) => ({ ...prev, isRecovering: false }));
        return { status: "none" };
      }

      const sessions = groupOrdersBySession(otherPendingOrders);
      const recoveredSessionId = Object.keys(sessions)[0];
      const sessionOrders = sessions[recoveredSessionId];

      if (cartMatchesOrders(sessionOrders, items)) {
        commitCheckoutSession(recoveredSessionId, sessionOrders);
        setRecoveryState((prev) => ({ ...prev, isRecovering: false }));
        return {
          status: "resumed",
          sessionId: recoveredSessionId,
          orders: sessionOrders,
        };
      }

      setRecoveryState((prev) => ({ ...prev, isRecovering: false }));
      return { status: "mismatch", staleSessions: sessions };
    } catch (recoveryErr) {
      const recErrInfo = getPaymentErrorMessage(recoveryErr);
      setRecoveryState({
        isRecovering: true,
        message: "",
        error: recErrInfo.message,
      });
      throw Object.assign(new Error(recErrInfo.message), {
        code: recErrInfo.code,
      });
    }
  };

  // ============================================================================
  // CHECKSUM & SIGNATURE GENERATION
  // ============================================================================

  const buildInputsSignature = () => {
    const itemsPart = items
      .map((i) => `${i.productId}:${i.size}:${i.color}:${i.quantity}`)
      .join("|");
    const addressPart = selectedAddress
      ? `${selectedAddress.id || ""}:${selectedAddress.address_line1 || selectedAddress.address || ""}:${selectedAddress.pincode || ""}`
      : "null";
    const paymentPart = paymentMethod || "";
    return `${itemsPart}#${addressPart}#${paymentPart}`;
  };

  const inputsSignatureRef = useRef(buildInputsSignature());
  const isFirstInputsCheckRef = useRef(true);

  useEffect(() => {
    const newSignature = buildInputsSignature();
    if (isFirstInputsCheckRef.current) {
      isFirstInputsCheckRef.current = false;
      inputsSignatureRef.current = newSignature;
      return;
    }
    if (newSignature !== inputsSignatureRef.current) {
      inputsSignatureRef.current = newSignature;
      logStep(
        "Checkout inputs changed — invalidating LOCAL session reference only (no backend mutation)",
        {},
      );
      setCheckoutState({ cartSessionId: null, orders: [] });
      sessionStorage.removeItem("aurastore_active_cart_session_id");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedAddress, paymentMethod]);

  useEffect(() => {
    debugLog("STEP 1: CheckoutPage mounted", {
      customer,
      token: localStorage.getItem("customer_token"),
      checkoutState,
      cartItems: items,
      selectedAddress,
      paymentMethod,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // MOUNT ORCHESTRATION
  // ============================================================================
  const itemsRef = useRef(items);
  const totalsRef = useRef(totals);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    totalsRef.current = totals;
  }, [totals]);

  useEffect(() => {
    if (!customer || !token) return;

    let cancelled = false;

    setPhase(CHECKOUT_PHASE.RECOVERING, {
      source: "mount",
    });

    const activeSessionId = sessionStorage.getItem(
      "aurastore_active_cart_session_id",
    );

    const recoverCheckoutOnMount = async () => {
      try {
        const res = await measureApi("getOrders (mount)", () =>
          storefrontAPI.getOrders(),
        );

        if (cancelled) {
          return;
        }

        const customerOrders = res.data?.items || [];

        await resumeExistingCheckout(customerOrders, activeSessionId);
      } catch (err) {
        if (cancelled) {
          return;
        }

        logFailure({
          step: "Mount session recovery",
          error: err,
          sessionId: activeSessionId,
          ordersCount: 0,
          nextApiSkipped: "none — this is a background reconciliation read",
        });
      } finally {
        if (!cancelled) {
          setPhase(CHECKOUT_PHASE.IDLE, {
            source: "mount",
          });
        }
      }
    };

    recoverCheckoutOnMount();

    return () => {
      cancelled = true;
    };

    // Run only when customer authentication changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, token]);

  useEffect(() => {
    if (!customer?.email) return;

    setForm((current) => ({
      ...current,
      email: customer.email,
    }));
  }, [customer?.email]);

  const update = (key) => (event) => {
    const { type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [key]: type === "checkbox" ? checked : value,
    }));
  };

  // ============================================================================
  // ORDER CREATION ENGINE & PLACE ORDER
  // ============================================================================

  const createOrderSession = async () => {
    const currentSessionId = crypto.randomUUID();
    const currentOrders = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Shipping fee is only added to the first order item in the session
      const itemShippingFee = i === 0 ? totals.shipping : 0;

      try {
        const created = await persistOrderItem(
          item,
          currentSessionId,
          itemShippingFee,
        );

        currentOrders.push(created);
      } catch (itemErr) {
        const errInfo = getPaymentErrorMessage(itemErr);

        if (errInfo.code === "ACTIVE_CHECKOUT_EXISTS") {
          logExit({
            step: "createOrderSession",
            reason: "ACTIVE_CHECKOUT_EXISTS",
            sessionId: currentSessionId,
            ordersCount: currentOrders.length,
            paymentMethod,
            nextApi:
              "createRazorpayOrderMutation / verifyRazorpayPaymentMutation",
          });

          const recovery = await recoverActiveSession();

          if (recovery.status === "resumed") {
            return {
              retry: true,
              sessionId: recovery.sessionId,
              orders: recovery.orders,
            };
          }

          if (recovery.status === "mismatch") {
            for (const sid of Object.keys(recovery.staleSessions)) {
              await cleanupStaleSession(recovery.staleSessions[sid]);
            }

            return {
              retry: true,
              sessionId: null,
              orders: [],
            };
          }

          return {
            retry: true,
            sessionId: null,
            orders: [],
          };
        }

        if (errInfo.code === "ORDER_NOT_FOUND") {
          setCheckoutState({
            cartSessionId: null,
            orders: [],
          });

          sessionStorage.removeItem("aurastore_active_cart_session_id");
        }

        if (currentOrders.length > 0) {
          dispatch(
            setLastOrder({
              orders: currentOrders,
              totals,
              paymentMethod,
            }),
          );
        }

        logFailure({
          step: "createOrderSession",
          error: itemErr,
          sessionId: currentSessionId,
          ordersCount: currentOrders.length,
          nextApiSkipped:
            "createRazorpayOrderMutation, verifyRazorpayPaymentMutation",
        });

        throw Object.assign(new Error(errInfo.message), {
          partialSuccessCount: currentOrders.length,
          failedItemTitle: item.title,
          code: errInfo.code,
        });
      }
    }

    // All cart products successfully created
    commitCheckoutSession(currentSessionId, currentOrders);

    return {
      retry: false,
      sessionId: currentSessionId,
      orders: currentOrders,
      justCreated: true,
    };
  };

  const handlePlaceOrder = async () => {
    logStep("STEP 1: Entered handlePlaceOrder()");

    if (paymentMethodsList.length === 0) {
      logExit({
        step: "STEP 1.5 (payment method availability check)",
        reason: "No payment methods available",
        sessionId: checkoutState.cartSessionId,
        ordersCount: checkoutState.orders.length,
        paymentMethod,
        nextApi:
          "createOrderMutation, createRazorpayOrderMutation, verifyRazorpayPaymentMutation",
      });
      toast.error(
        "No payment methods are currently available. Please contact the store administrator.",
      );
      return;
    }

    if (!selectedAddress) {
      logExit({
        step: "STEP 2 (address check)",
        reason: "No delivery address selected",
        sessionId: checkoutState.cartSessionId,
        ordersCount: checkoutState.orders.length,
        paymentMethod,
        nextApi:
          "createOrderMutation, createRazorpayOrderMutation, verifyRazorpayPaymentMutation",
      });
      toast.error("Please select or add a delivery address");
      return;
    }
    logStep("STEP 2: Address validated");

    if (!customer) {
      logExit({
        step: "STEP 3 (customer check)",
        reason: "Customer session not found",
        sessionId: checkoutState.cartSessionId,
        ordersCount: checkoutState.orders.length,
        paymentMethod,
        nextApi:
          "createOrderMutation, createRazorpayOrderMutation, verifyRazorpayPaymentMutation",
      });
      toast.error("Customer session not found. Please log in.");
      return;
    }
    logStep("STEP 3: Customer validated");

    if (paymentMethod === "ONLINE") {
      logStep("STEP 4: Loading Razorpay SDK");
      const loaded = await loadRazorpayScript();
      logStep("STEP 5: SDK Ready", {
        loaded,
        razorpayType: typeof window.Razorpay,
      });
      if (!loaded) {
        logExit({
          step: "STEP 4-5 (SDK load)",
          reason: "loadRazorpayScript() failed to resolve window.Razorpay",
          sessionId: checkoutState.cartSessionId,
          ordersCount: checkoutState.orders.length,
          paymentMethod,
          nextApi:
            "createOrderMutation, createRazorpayOrderMutation, verifyRazorpayPaymentMutation",
        });
        toast.error(
          "Failed to load Razorpay Checkout SDK. Please check your internet connection.",
        );
        return;
      }
    } else if (paymentMethod !== "COD") {
      logExit({
        step: "STEP 4 (payment method check)",
        reason: `Invalid payment method: ${paymentMethod}`,
        sessionId: checkoutState.cartSessionId,
        ordersCount: checkoutState.orders.length,
        paymentMethod,
        nextApi:
          "createOrderMutation, createRazorpayOrderMutation, verifyRazorpayPaymentMutation",
      });
      toast.error("Invalid payment method.");
      return;
    }

    logStep("STEP 5: Checkout state before submit", {
      checkoutState,
      currentSessionId: checkoutState.cartSessionId,
      currentOrdersLength: checkoutState.orders.length,
      paymentMethod,
      selectedAddress,
      customerEmail: customer?.email,
      razorpayExists: typeof window.Razorpay !== "undefined",
    });

    dispatch(setOrderError(null));

    let currentSessionId = checkoutState.cartSessionId;
    let currentOrders = [...checkoutState.orders];
    let sessionFreshlyVerified = false;
    let rzpOrder = null;

    let currentLifecyclePhase = CHECKOUT_PHASE.IDLE;
    const updatePhase = (phase, meta = {}) => {
      currentLifecyclePhase = phase;
      setPhase(phase, meta);
    };

    try {
      if (!currentSessionId) {
        updatePhase(CHECKOUT_PHASE.CREATING_ORDERS);
        const MAX_SESSION_ATTEMPTS = 3;
        let sessionResolved = false;

        for (
          let attempt = 1;
          attempt <= MAX_SESSION_ATTEMPTS && !sessionResolved;
          attempt++
        ) {
          logStep(
            `STEP 6: createOrderSession attempt ${attempt}/${MAX_SESSION_ATTEMPTS}`,
          );
          const result = await createOrderSession();

          if (!result.retry) {
            currentSessionId = result.sessionId;
            currentOrders = result.orders;
            sessionFreshlyVerified = true;
            sessionResolved = true;
            break;
          }

          if (result.sessionId) {
            currentSessionId = result.sessionId;
            currentOrders = result.orders;
            sessionFreshlyVerified = true;
            sessionResolved = true;
            break;
          }
        }

        if (!sessionResolved) {
          throw Object.assign(
            new Error(
              "Could not establish a checkout session after multiple attempts. Please try again.",
            ),
            {
              code: "SESSION_RESOLUTION_FAILED",
            },
          );
        }
      } else {
        logStep(
          "STEP 6: Reusing existing checkout session, createOrderMutation skipped",
          { sessionId: currentSessionId },
        );
      }

      if (paymentMethod === "COD") {
        dispatch(
          setLastOrder({
            orders: currentOrders,
            totals,
            paymentMethod,
          }),
        );

        await clearCompletedCustomerCart();

        toast.success("Order placed successfully!");
        updatePhase(CHECKOUT_PHASE.SUCCESS);
        logExit({
          step: "STEP 7 (COD complete)",
          reason: "COD order placed, no online payment needed",
          sessionId: currentSessionId,
          ordersCount: currentOrders.length,
          paymentMethod,
          nextApi: "createRazorpayOrderMutation, verifyRazorpayPaymentMutation",
        });
        navigate("/order-success", {
          state: {
            orders: currentOrders,
            totals,
            paymentMethod,
          },
          replace: true,
        });
        return;
      }

      if (!sessionFreshlyVerified) {
        try {
          const res = await measureApi("getOrders (dedupe check)", () =>
            storefrontAPI.getOrders(),
          );
          const customerOrders = res.data?.items || [];
          const sessionOrders = customerOrders.filter(
            (o) => o.cart_session_id === currentSessionId,
          );
          if (
            sessionOrders.length > 0 &&
            sessionOrders.every((o) => o.payment_status === "PAID")
          ) {
            dispatch(
              setLastOrder({
                orders: sessionOrders,
                totals,
                paymentMethod: "ONLINE",
              }),
            );
            await clearCompletedCustomerCart();
            toast.success("Payment already completed!");
            updatePhase(CHECKOUT_PHASE.SUCCESS);
            logExit({
              step: "STEP 7 (dedupe check)",
              reason: "Session already PAID",
              sessionId: currentSessionId,
              ordersCount: sessionOrders.length,
              paymentMethod,
              nextApi:
                "createRazorpayOrderMutation, verifyRazorpayPaymentMutation",
            });
            navigate("/order-success", {
              state: { orders: sessionOrders, totals, paymentMethod: "ONLINE" },
              replace: true,
            });
            return;
          }
        } catch (checkErr) {
          logFailure({
            step: "STEP 7 (dedupe check)",
            error: checkErr,
            sessionId: currentSessionId,
            ordersCount: currentOrders.length,
            nextApiSkipped: "none — non-fatal, continuing to Razorpay create",
          });
        }
      } else {
        logStep(
          "STEP 7: Skipping dedupe getOrders() call — session was freshly created/recovered this run",
          { sessionId: currentSessionId },
        );
      }

      updatePhase(CHECKOUT_PHASE.CREATING_RAZORPAY_ORDER);
      logStep("STEP 8: Validating state before Razorpay Create call", {
        checkoutState,
        currentSessionId,
        currentOrdersLength: currentOrders.length,
        paymentMethod,
        selectedAddress,
        customerEmail: customer?.email,
        razorpayExists: typeof window.Razorpay !== "undefined",
      });
      logApiCall("createRazorpayOrderMutation", {
        sessionId: currentSessionId,
        ordersCount: currentOrders.length,
        paymentMethod,
      });

      try {
        rzpOrder = await measureApi(
          "createRazorpayOrderMutation",
          () =>
            createRazorpayOrderMutation.mutateAsync({
              cart_session_id: currentSessionId,
            }),
          (order) => ({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
          }),
        );
        logStep("STEP 9: Received Razorpay Order", {
          order_id: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
        });
      } catch (rzpErr) {
        const errInfo = getPaymentErrorMessage(rzpErr);
        logFailure({
          step: "STEP 8 (Razorpay create)",
          error: rzpErr,
          sessionId: currentSessionId,
          ordersCount: currentOrders.length,
          nextApiSkipped: "verifyRazorpayPaymentMutation",
        });
        logExit({
          step: "STEP 8 (Razorpay create)",
          reason: `${errInfo.code}: ${errInfo.message}`,
          sessionId: currentSessionId,
          ordersCount: currentOrders.length,
          paymentMethod,
          nextApi: "verifyRazorpayPaymentMutation",
        });

        if (errInfo.code === "UNAUTHORIZED") {
          toast.error(errInfo.message);
          setTimeout(
            () => navigate("/login", { state: { from: "/checkout" } }),
            3000,
          );
          return;
        }

        if (errInfo.code === "ORDER_ALREADY_PAID") {
          toast.success("Order already paid!");
          updatePhase(CHECKOUT_PHASE.SUCCESS);
          // for (const item of items) {
          //   dispatch(
          //     removeFromCart({
          //       productId: item.productId,
          //       size: item.size,
          //       color: item.color,
          //     }),
          //   );
          // }
          await clearCompletedCustomerCart();
          try {
            const res = await storefrontAPI.getOrders();
            const customerOrders = res.data?.items || [];
            const sessionOrders = customerOrders.filter(
              (o) => o.cart_session_id === currentSessionId,
            );
            dispatch(
              setLastOrder({
                orders: sessionOrders,
                totals,
                paymentMethod: "ONLINE",
              }),
            );
            navigate("/order-success", {
              state: { orders: sessionOrders, totals, paymentMethod: "ONLINE" },
              replace: true,
            });
          } catch (e) {
            dispatch(
              setLastOrder({
                orders: currentOrders,
                totals,
                paymentMethod: "ONLINE",
              }),
            );
            navigate("/order-success", {
              state: { orders: currentOrders, totals, paymentMethod: "ONLINE" },
              replace: true,
            });
          }
          return;
        }
        if (errInfo.code === "ORDER_NOT_FOUND") {
          setCheckoutState({ cartSessionId: null, orders: [] });
          sessionStorage.removeItem("aurastore_active_cart_session_id");
        }

        throw Object.assign(new Error(errInfo.message), { code: errInfo.code });
      }

      if (!window.Razorpay) {
        let attempts = 0;
        await new Promise((resolve) => {
          const interval = setInterval(() => {
            attempts++;
            if (window.Razorpay || attempts >= 20) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        });
      }

      const prereqCheck = validateRazorpayPrerequisites({
        sessionId: currentSessionId,
        orders: currentOrders,
        rzpOrder,
      });
      if (!prereqCheck.passed) {
        logExit({
          step: "STEP 10 (Razorpay instance)",
          reason: `Prerequisites failed: ${prereqCheck.failed.join(", ")}`,
          sessionId: currentSessionId,
          ordersCount: currentOrders.length,
          paymentMethod,
          nextApi: "rzp.open(), verifyRazorpayPaymentMutation",
        });
        throw new Error("Razorpay SDK is not initialized. Please try again.");
      }

      logStep("STEP 10: Creating Razorpay instance", {
        prereqChecks: prereqCheck.checks,
      });
      const options = {
        key: rzpOrder.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: import.meta.env.VITE_STORE_NAME || "My Designers",
        description: "Order Checkout Payment",
        order_id: rzpOrder.id,
        handler: async (response) => {
          logStep("STEP 12: Payment Success Callback", response);
          setPhase(CHECKOUT_PHASE.VERIFYING);
          try {
            logStep("STEP 13: Calling Verify API");
            logApiCall("verifyRazorpayPaymentMutation", {
              sessionId: currentSessionId,
              ordersCount: currentOrders.length,
              paymentMethod,
            });

            const verifiedOrders = await measureApi(
              "verifyRazorpayPaymentMutation",
              () =>
                verifyRazorpayPaymentMutation.mutateAsync({
                  cart_session_id: currentSessionId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
            );

            logStep("STEP 14: Verification Success", verifiedOrders);

            dispatch(
              setLastOrder({
                orders: verifiedOrders,
                totals,
                paymentMethod,
              }),
            );

            await clearCompletedCustomerCart();

            toast.success("Payment verified and order confirmed!");

            setPhase(CHECKOUT_PHASE.VERIFY_SUCCESS);

            await new Promise((resolve) => setTimeout(resolve, 600));

            setPhase(CHECKOUT_PHASE.SUCCESS);

            navigate("/order-success", {
              state: {
                orders: verifiedOrders,
                totals,
                paymentMethod,
              },
              replace: true,
            });
          } catch (verifyErr) {
            const errInfo = getPaymentErrorMessage(verifyErr);
            logFailure({
              step: "STEP 13 (verify)",
              error: verifyErr,
              sessionId: currentSessionId,
              ordersCount: currentOrders.length,
              nextApiSkipped: "none — verification was the last step",
            });
            logExit({
              step: "STEP 13 (verify)",
              reason: `${errInfo.code}: ${errInfo.message}`,
              sessionId: currentSessionId,
              ordersCount: currentOrders.length,
              paymentMethod,
              nextApi: "none — verification was the last step",
            });

            if (errInfo.code === "UNAUTHORIZED") {
              toast.error(errInfo.message);
              setPhase(CHECKOUT_PHASE.FAILED);
              setTimeout(
                () => navigate("/login", { state: { from: "/checkout" } }),
                3000,
              );
              return;
            }

            if (errInfo.code === "ORDER_NOT_FOUND") {
              setCheckoutState({ cartSessionId: null, orders: [] });
              sessionStorage.removeItem("aurastore_active_cart_session_id");
            }

            dispatch(setOrderError(errInfo.message));
            toast.error(errInfo.message);
            setPhase(CHECKOUT_PHASE.FAILED);
          }
        },
        prefill: {
          name: selectedAddress.full_name,
          email: customer?.email || form.email || null,
          contact: selectedAddress.phone,
        },
        theme: { color: "#000000" },
        modal: {
          ondismiss: () => {
            logExit({
              step: "STEP 11 (popup dismissed)",
              reason: "User closed the Razorpay popup",
              sessionId: currentSessionId,
              ordersCount: currentOrders.length,
              paymentMethod,
              nextApi: "verifyRazorpayPaymentMutation",
            });
            toast.error("Payment cancelled by user.");
            setPhase(CHECKOUT_PHASE.FAILED);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        logFailure({
          step: "Razorpay payment.failed event",
          error: response.error,
          sessionId: currentSessionId,
          ordersCount: currentOrders.length,
        });
        toast.error(
          response.error.description || "Payment failed. Please try again.",
        );
        setPhase(CHECKOUT_PHASE.FAILED);
      });
      updatePhase(CHECKOUT_PHASE.AWAITING_PAYMENT);
      logStep("STEP 11: Opening Razorpay popup");
      rzp.open();
    } catch (err) {
      if (err.code === "UNAUTHORIZED") {
        return;
      }

      const errInfo = getPaymentErrorMessage(err);
      const finalCode = err.code || errInfo.code;
      const finalMessage = err.message || errInfo.message;

      logFailure({
        step: "handlePlaceOrder (outer catch)",
        error: err,
        sessionId: currentSessionId,
        ordersCount: currentOrders.length,
        nextApiSkipped: "remaining checkout steps",
      });

      const detail =
        err?.partialSuccessCount > 0
          ? `${finalMessage} The other ${err.partialSuccessCount} item(s) were ordered successfully and have been removed from your cart.`
          : finalMessage ||
            "Something went wrong while processing your payment. Please try again.";
      dispatch(setOrderError(detail));
      toast.error(detail);
      updatePhase(CHECKOUT_PHASE.FAILED);
    } finally {
      if (paymentMethod === "COD" || !rzpOrder) {
        if (
          currentLifecyclePhase !== CHECKOUT_PHASE.SUCCESS &&
          currentLifecyclePhase !== CHECKOUT_PHASE.AWAITING_PAYMENT &&
          currentLifecyclePhase !== CHECKOUT_PHASE.VERIFYING
        ) {
          updatePhase(CHECKOUT_PHASE.IDLE);
        }
      }
    }
  };

  if (!customer || !token) {
    return (
      <GuestAuthModal
        onContinueShopping={() => {
          if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
          } else {
            navigate("/cart");
          }
        }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center">
          <ShoppingBag size={28} className="text-muted" />
        </div>
        <h1 className="font-display font-bold text-xl text-app">
          Nothing to checkout
        </h1>
        <p className="text-sm text-muted max-w-sm">
          Your cart is empty. Add items before proceeding to checkout.
        </p>
        <Link
          to="/products"
          className="h-12 w-full max-w-xs flex items-center justify-center bg-brand-500 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 text-white font-semibold text-sm px-6 rounded-full shadow-glow-sm transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Screen Reader Live Announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {checkoutPhase === CHECKOUT_PHASE.CREATING_ORDERS ||
        checkoutPhase === CHECKOUT_PHASE.CREATING_RAZORPAY_ORDER
          ? "Preparing payment"
          : checkoutPhase === CHECKOUT_PHASE.VERIFYING
            ? "Verifying payment"
            : checkoutPhase === CHECKOUT_PHASE.VERIFY_SUCCESS
              ? "Order confirmed"
              : ""}
      </div>

      {/* Subtle Awaiting Payment Banner */}
      {checkoutPhase === CHECKOUT_PHASE.AWAITING_PAYMENT && (
        <div className="mb-6 p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 flex items-start gap-3 animate-fade-in">
          <div className="p-1.5 bg-brand-500/10 rounded-lg text-brand-500 shrink-0">
            <svg
              className="w-5 h-5 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-app">
              Secure payment window is open.
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Complete your payment in the Razorpay window.
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay Before Razorpay Opens */}
      {paymentMethod === "ONLINE" &&
        (checkoutPhase === CHECKOUT_PHASE.CREATING_ORDERS ||
          checkoutPhase === CHECKOUT_PHASE.CREATING_RAZORPAY_ORDER) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Preparing secure payment"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
            <div className="relative w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center gap-4 animate-slide-up">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <h3 className="font-display font-bold text-lg text-app mt-2">
                Preparing Secure Payment...
              </h3>
              <p className="text-sm text-muted">
                Please wait while we connect to our payment partner.
              </p>
            </div>
          </div>
        )}

      {/* Loading Overlay During/After Payment Success Verification */}
      {paymentMethod === "ONLINE" &&
        (checkoutPhase === CHECKOUT_PHASE.VERIFYING ||
          checkoutPhase === CHECKOUT_PHASE.VERIFY_SUCCESS) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={
              checkoutPhase === CHECKOUT_PHASE.VERIFYING
                ? "Verifying payment"
                : "Order confirmed"
            }
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
            <div className="relative w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center gap-4 animate-slide-up">
              {checkoutPhase === CHECKOUT_PHASE.VERIFYING ? (
                <>
                  <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <h3 className="font-display font-bold text-lg text-app mt-2">
                    Payment Successful
                  </h3>
                  <p className="text-sm text-muted">
                    Verifying your payment securely...
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                    <svg
                      className="w-6 h-6 animate-pulse"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="font-display font-bold text-lg text-app mt-2">
                    Order Confirmed
                  </h3>
                  <p className="text-sm text-muted">Redirecting...</p>
                </>
              )}
            </div>
          </div>
        )}
      {recoveryState.isRecovering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-md bg-app border border-app rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-slide-up">
            {!recoveryState.error ? (
              <>
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <h3 className="font-display font-bold text-lg text-app mt-2">
                  Reconnecting to your existing payment session...
                </h3>
                <p className="text-sm text-muted">
                  {recoveryState.message || "Please wait..."}
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="font-display font-bold text-lg text-app">
                  Recovery Failed
                </h3>
                <p className="text-sm text-muted">{recoveryState.error}</p>
                <button
                  type="button"
                  onClick={() =>
                    setRecoveryState({
                      isRecovering: false,
                      message: "",
                      error: null,
                    })
                  }
                  className="mt-2 h-10 px-6 bg-brand-500 hover:bg-brand-600 focus-visible:outline-none text-white font-semibold text-sm rounded-full transition-colors"
                >
                  Close & Try Again
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[50%_45%] gap-8">
        <div className=" flex flex-col gap-8 ">
          <div className="">
            <h2 className="font-display font-bold text-lg text-app mb-4">
              Review Items
            </h2>
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.size}-${item.color}`}
                  className="flex gap-4"
                >
                  <div className="w-16 h-20 rounded-xl bg-surface overflow-hidden border border-app shrink-0">
                    {item.thumbnail ? (
                      <img
                        src={getImageUrl(item.thumbnail)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-[10px]">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-app line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted">
                      {item.size && `Size: ${item.size}`}{" "}
                      {item.color && `Color: ${item.color}`} Qty:{" "}
                      {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-app">
                    {formatPrice(item.sellingPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="">
            <div className="flex flex-col gap-4 ">
              <h3 className="font-display font-bold text-lg text-app">
                Order Total
              </h3>

              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span className="text-app font-medium">
                    {formatPrice(totals.subtotal)}
                  </span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(totals.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted">
                  <span>Shipping</span>
                  <span className="text-app font-medium">
                    {totals.shipping === 0
                      ? "Free"
                      : formatPrice(totals.shipping)}
                  </span>
                </div>
                {/* <div className="flex justify-between text-muted">
                  <span>Tax (5% GST)</span>
                  <span className="text-app font-medium">
                    {formatPrice(totals.tax)}
                  </span>
                </div> */}
              </div>

              <div className="flex justify-between items-baseline pt-4 border-t border-app">
                <span className="text-sm font-semibold text-app">Total</span>
                <span className="text-xl font-bold text-app">
                  {formatPrice(totals.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <ContactSection form={form} update={update} />
          <DeliveryAddress form={form} setForm={setForm} update={update} />
          <PaymentSection />
          <BillingAddress form={form} update={update} />
          <button
            type="button"
            onClick={() => handlePlaceOrder()}
            disabled={
              submitting || placingOrder || paymentMethodsList.length === 0
            }
            aria-disabled={
              submitting || placingOrder || paymentMethodsList.length === 0
            }
            className="w-full h-12 flex items-center justify-center bg-brand-500 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 text-white font-semibold text-sm rounded-full shadow-glow-sm transition-colors"
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
}