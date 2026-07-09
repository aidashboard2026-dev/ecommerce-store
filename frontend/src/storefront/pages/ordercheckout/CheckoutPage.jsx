import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ShoppingBag } from "lucide-react";
import BillingAddress from "@/storefront/components/checkout/BillingAddress";
import ContactSection from "@/storefront/components/checkout/ContactSection";
import DeliveryAddress from "@/storefront/components/checkout/DeliveryAddress";
import PaymentSection from "@/storefront/components/checkout/PaymentSection";
import { getImageUrl, formatPrice } from "@/shared/utils/productUtils";
import {
  selectSelectedAddress,
  setLastOrder,
  setOrderError,
  setPlacingOrder,
} from "@/storefront/store/checkoutStore";
import { clearCart, removeFromCart, selectCartTotals } from "@/storefront/store/cartSlice";
import { useCreateOrder, useCreateRazorpayOrder, useVerifyRazorpayPayment } from "@/storefront/hooks/useOrders";
import { storefrontAPI } from "@/shared/services/api";

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
      resolve(true);
    };
    script.onerror = () => {
      rzpScriptPromise = null; // Allow retry on failure
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return rzpScriptPromise;
};

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

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.cart.items);
  const totals = useSelector(selectCartTotals);
  const selectedAddress = useSelector(selectSelectedAddress);
  const paymentMethod = useSelector((state) => state.checkout.paymentMethod);
  const placingOrder = useSelector((state) => state.checkout.placingOrder);
  const customer = useSelector((state) => state.customer.customer);

  const createOrderMutation = useCreateOrder();
  const createRazorpayOrderMutation = useCreateRazorpayOrder();
  const verifyRazorpayPaymentMutation = useVerifyRazorpayPayment();

  const [checkoutState, setCheckoutState] = useState({
    cartSessionId: null,
    orders: [],
  });

  useEffect(() => {
    // Reset order session if items, address, or payment method changes
    setCheckoutState({ cartSessionId: null, orders: [] });
    sessionStorage.removeItem("aurastore_active_cart_session_id");
  }, [items, selectedAddress, paymentMethod]);

  useEffect(() => {
    let isMounted = true;
    setSubmitting(true);
    dispatch(setPlacingOrder(true));

    const cancelActiveOrders = async (ordersList) => {
      try {
        for (const order of ordersList) {
          await storefrontAPI.cancelOrder(order.id);
        }
      } catch (err) {
        console.error("Failed to cancel previous pending orders:", err);
      }
    };

    const activeSessionId = sessionStorage.getItem("aurastore_active_cart_session_id");

    storefrontAPI.getOrders()
      .then(async (res) => {
        if (!isMounted) return;
        const customerOrders = res.data?.items || [];

        // 1. If an active session is in sessionStorage, handle it
        if (activeSessionId) {
          const sessionOrders = customerOrders.filter(
            (o) => o.cart_session_id === activeSessionId
          );

          if (sessionOrders.length > 0) {
            const allPaid = sessionOrders.every((o) => o.payment_status === "PAID");
            if (allPaid) {
              dispatch(setLastOrder({ orders: sessionOrders, totals, paymentMethod: "ONLINE" }));
              dispatch(clearCart());
              sessionStorage.removeItem("aurastore_active_cart_session_id");
              navigate("/order-success", {
                state: {
                  orders: sessionOrders,
                  totals,
                  paymentMethod: "ONLINE",
                },
                replace: true,
              });
              return;
            } else {
              // Still pending: check if it matches current cart items
              const matchesCart = sessionOrders.length === items.length &&
                sessionOrders.every((pending) =>
                  items.some(
                    (item) =>
                      item.productId === pending.product_id &&
                      item.quantity === pending.quantity &&
                      item.size === pending.size &&
                      item.color === pending.color
                  )
                );

              if (matchesCart) {
                setCheckoutState({
                  cartSessionId: activeSessionId,
                  orders: sessionOrders,
                });
                return;
              } else {
                // Cart changed, cancel the pending session to restore inventory
                await cancelActiveOrders(sessionOrders);
                setCheckoutState({ cartSessionId: null, orders: [] });
                sessionStorage.removeItem("aurastore_active_cart_session_id");
              }
            }
          }
        }

        // 2. Discover any other pending online checkout sessions (e.g. from another tab/browser/device)
        const otherPendingOrders = customerOrders.filter(
          (o) => o.payment_status === "PENDING" && o.payment_method === "ONLINE" && o.cart_session_id
        );

        if (otherPendingOrders.length > 0) {
          const sessions = {};
          otherPendingOrders.forEach((o) => {
            if (!sessions[o.cart_session_id]) sessions[o.cart_session_id] = [];
            sessions[o.cart_session_id].push(o);
          });

          const recoveredSessionId = Object.keys(sessions)[0];
          const sessionOrders = sessions[recoveredSessionId];

          const matchesCart = sessionOrders.length === items.length &&
            sessionOrders.every((pending) =>
              items.some(
                (item) =>
                  item.productId === pending.product_id &&
                  item.quantity === pending.quantity &&
                  item.size === pending.size &&
                  item.color === pending.color
              )
            );

          if (matchesCart) {
            sessionStorage.setItem("aurastore_active_cart_session_id", recoveredSessionId);
            setCheckoutState({
              cartSessionId: recoveredSessionId,
              orders: sessionOrders,
            });
            toast.success("Resumed your previous pending checkout session.");
          } else {
            // Cart changed: cancel stale sessions to free inventory
            for (const sid of Object.keys(sessions)) {
              await cancelActiveOrders(sessions[sid]);
            }
          }
        }
      })
      .catch((err) => {
        console.error("Failed to check active checkout session status:", err);
      })
      .finally(() => {
        if (isMounted) {
          setSubmitting(false);
          dispatch(setPlacingOrder(false));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, navigate, items, totals]);

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ...EMPTY_CHECKOUT_FORM,
    email: customer?.email || "",
  });

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

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please select or add a delivery address");
      return;
    }
  
    if (paymentMethod === "ONLINE") {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load Razorpay Checkout SDK. Please check your internet connection.");
        return;
      }
    }

    setSubmitting(true);
    dispatch(setPlacingOrder(true));
    dispatch(setOrderError(null));

    let currentSessionId = checkoutState.cartSessionId;
    let currentOrders = [...checkoutState.orders];
    let rzpOrder = null;

    try {
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        for (const item of items) {
          const orderPayload = {
            customer_name: selectedAddress.full_name,
            customer_email: customer?.email || form.email,
            customer_phone: selectedAddress.phone,
            address_line1:
              selectedAddress.address_line1 || selectedAddress.address,
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
            total_amount: item.sellingPrice * item.quantity,
            payment_method: paymentMethod,
            payment_status: "PENDING",
            tracking_status: "PLACED",
            cart_session_id: currentSessionId,
          };

          let created;
          try {
            created = await createOrderMutation.mutateAsync(orderPayload);
            

            console.log("Created =", created);
          } catch (itemErr) {
            const errCode = itemErr?.response?.data?.code;
            if (errCode === "ACTIVE_CHECKOUT_EXISTS") {
              toast.error("You have another active unpaid checkout session. Re-aligning checkout...");
              window.location.reload();
              return;
            }
            if (currentOrders.length > 0) {
              dispatch(setLastOrder({ orders: currentOrders, totals, paymentMethod }));
            }
            const detail =
              itemErr?.response?.data?.detail ||
              `Failed to order "${item.title}". Please try again.`;
            throw Object.assign(new Error(detail), {
              partialSuccessCount: currentOrders.length,
              failedItemTitle: item.title,
            });
          }
          currentOrders.push(created);
          if (paymentMethod === "COD") {
            dispatch(removeFromCart({ productId: item.productId, size: item.size, color: item.color }));
          }
        }
        setCheckoutState({ cartSessionId: currentSessionId, orders: currentOrders });
        sessionStorage.setItem("aurastore_active_cart_session_id", currentSessionId);
      }

      if (paymentMethod === "COD") {
        dispatch(setLastOrder({ orders: currentOrders, totals, paymentMethod }));
        dispatch(clearCart());
        toast.success("Order placed successfully!");
        navigate("/order-success", {
          state: {
            orders: currentOrders,
            totals,
            paymentMethod,
          },
        });
      } else {
        // ONLINE Payment Flow
        // Check if the currentSessionId has already been paid (e.g., via another tab or duplicate click)
        try {
          const res = await storefrontAPI.getOrders();
          const customerOrders = res.data?.items || [];
          const sessionOrders = customerOrders.filter(
            (o) => o.cart_session_id === currentSessionId
          );
          if (sessionOrders.length > 0 && sessionOrders.every((o) => o.payment_status === "PAID")) {
            dispatch(setLastOrder({ orders: sessionOrders, totals, paymentMethod: "ONLINE" }));
            dispatch(clearCart());
            toast.success("Payment already completed!");
            navigate("/order-success", {
              state: {
                orders: sessionOrders,
                totals,
                paymentMethod: "ONLINE",
              },
              replace: true,
            });
            return;
          }
        } catch (checkErr) {
          console.error("Pre-payment status check failed:", checkErr);
        }

        try {
          rzpOrder = await createRazorpayOrderMutation.mutateAsync({
            cart_session_id: currentSessionId,
          });
        } catch (rzpErr) {
          const detail =
            rzpErr?.response?.data?.detail ||
            "Failed to initiate online payment. Please try again.";
          throw new Error(detail);
        }

        const options = {
          key: rzpOrder.key,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          name: "AuraStore",
          description: "Order Checkout Payment",
          order_id: rzpOrder.id,
          handler: async (response) => {
            setSubmitting(true);
            dispatch(setPlacingOrder(true));
            try {
              const verifiedOrders = await verifyRazorpayPaymentMutation.mutateAsync({
                cart_session_id: currentSessionId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              // Clear cart only after backend verification success
              for (const item of items) {
                dispatch(removeFromCart({ productId: item.productId, size: item.size, color: item.color }));
              }
              dispatch(setLastOrder({ orders: verifiedOrders, totals, paymentMethod }));
              dispatch(clearCart());
              toast.success("Payment verified and order confirmed!");

              navigate("/order-success", {
                state: {
                  orders: verifiedOrders,
                  totals,
                  paymentMethod,
                },
              });
            } catch (verifyErr) {
              const detail =
                verifyErr?.response?.data?.detail ||
                "Payment verification failed. Please check with your bank or contact support.";
              dispatch(setOrderError(detail));
              toast.error(detail);
            } finally {
              setSubmitting(false);
              dispatch(setPlacingOrder(false));
            }
          },
          prefill: {
            name: selectedAddress.full_name,
            email: customer?.email || form.email,
            contact: selectedAddress.phone,
          },
          theme: {
            color: "#000000",
          },
          modal: {
            ondismiss: () => {
              toast.error("Payment cancelled by user.");
              setSubmitting(false);
              dispatch(setPlacingOrder(false));
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      const detail =
        err?.partialSuccessCount > 0
          ? `${err.message} The other ${err.partialSuccessCount} item(s) were ordered successfully and have been removed from your cart.`
          : err?.message ||
            err?.response?.data?.detail ||
            "Failed to place order. Please try again.";
      dispatch(setOrderError(detail));
      toast.error(detail);
    } finally {
      if (paymentMethod === "COD" || !rzpOrder) {
        setSubmitting(false);
        dispatch(setPlacingOrder(false));
      }
    }
  };

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
          className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full shadow-glow-sm transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
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
                <div className="flex justify-between text-muted">
                  <span>Tax (5% GST)</span>
                  <span className="text-app font-medium">
                    {formatPrice(totals.tax)}
                  </span>
                </div>
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
            onClick={handlePlaceOrder}
            disabled={submitting || placingOrder}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-full shadow-glow-sm transition-colors"
          >
            {submitting
              ? "Placing Order..."
              : paymentMethod === "COD"
                ? "Place Order"
                : "Continue to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}