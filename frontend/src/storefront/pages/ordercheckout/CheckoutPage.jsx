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
import { clearCart, selectCartTotals } from "@/storefront/store/cartSlice";
import { useCreateOrder } from "@/storefront/hooks/useOrders";

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

    setSubmitting(true);
    dispatch(setPlacingOrder(true));
    dispatch(setOrderError(null));

    try {
      const cartSessionId = crypto.randomUUID();
      const createdOrders = [];

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
          cart_session_id: cartSessionId,
        };

        const created = await createOrderMutation.mutateAsync(orderPayload);
        createdOrders.push(created);
      }

      dispatch(setLastOrder({ orders: createdOrders, totals, paymentMethod }));
      dispatch(clearCart());

      if (paymentMethod === "COD") {
        toast.success("Order placed successfully!");

        navigate("/order-success", {
          state: {
            orders: createdOrders,
            totals,
            paymentMethod,
          },
        });
      } else {
        navigate("/payment");
      }
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        "Failed to place order. Please try again.";
      dispatch(setOrderError(detail));
      toast.error(detail);
    } finally {
      setSubmitting(false);
      dispatch(setPlacingOrder(false));
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
                        loading="lazy"
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