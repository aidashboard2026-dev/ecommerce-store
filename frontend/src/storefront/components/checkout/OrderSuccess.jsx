import React from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import {
  CheckCircle2,
  Package,
  CreditCard,
  Wallet ,
  MapPin,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

import { formatPrice, getImageUrl } from "@/shared/utils/productUtils";

export default function OrderSuccess() {
  const { state } = useLocation();

  if (!state) {
    return <Navigate to="/" replace />;
  }

  const orders = state?.orders || [
    {
      id: "ORD-1001",
      customer_name: "Bharath",
      customer_phone: "9876543210",
      address_line1: "12, AnnaNagar",
      city: "Chennai",
      state: "TamilNadu",
      pincode: "600001",
      product_name: "Nike Air Max",
      product_image: "",
      quantity: 1,
      total_amount: 2999,
    },
  ];

  const totals = state?.totals || {
    subtotal: 2999,
    shipping: 0,
    tax: 150,
    total: 3149,
  };

  //   const orders = state?.orders || [];
  //   const totals = state?.totals;
  const paymentMethod = state?.paymentMethod || "COD";

  const firstOrder = orders?.[0] || null;

  const paymentLabel =
    paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment";

  if (!orders.length) {
    return <Navigate to="/" replace />;
  }

  const deliveryDate = new Date();

  deliveryDate.setDate(deliveryDate.getDate() + 3);

  return (
    <div className="">
      {/* Success Card */}

      <div className="overflow-hidden">
        <div className="flex flex-col items-center text-center mb-10">
          <div className=" flex items-center justify-center">
            <CheckCircle2 size={62} className="text-green-500" />
          </div>

          <h1 className="mt-6 text-3xl font-bold text-app">Order Confirmed</h1>

          <p className="mt-3 max-w-xl text-xs text-muted">
            Your order has been placed
            successfully and is being processed.
          </p>
        </div>

        <div className="">
          {/* Left */}

          <div className="flex flex-col gap-5 justify-center items-center">
            {/* <h2 className="font-semibold text-lg text-app">Order Details</h2> */}

          <div className="space-y-4 flex flex-col justify-center items-center">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-zinc-500" />

                <p className="text-sm text-muted">Order ID :</p>

                <p className="font-semibold text-app">
                  {firstOrder?.id || "N/A"}
                </p>
              </div>

              {/* <div className="flex items-center gap-3">
                  <CalendarDays size={18} className="text-brand-500" />

                  <div>
                    <p className="text-xs text-muted">Order Date</p>

                    <p className="font-semibold text-app">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div> */}

              <div className="flex items-center gap-3">
                <Wallet size={18} className="text-zinc-500" />
                <span className="text-sm text-muted">Total Amount : </span>

                <span className="font-semibold text-app">
                  {formatPrice(totals?.total || 0)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-zinc-500" />

                <p className="text-sm text-muted">Payment Method :</p>
                <p className="font-semibold text-app">{paymentLabel}</p>
              </div>
            </div>
          </div>

          {/* Delivery */}
          {/* <div className="rounded-2xl border border-app p-5">
              <h2 className="font-semibold text-lg text-app flex items-center gap-2">
                <MapPin size={18} />
                Delivery Address
              </h2>

              <div className="mt-4">
                <p className="font-semibold text-app">
                  {firstOrder?.customer_name}
                </p>

                <p className="text-sm text-muted mt-2 leading-6">
                  {[
                    firstOrder?.address_line1,
                    firstOrder?.address_line2,
                    firstOrder?.city,
                    firstOrder?.state,
                    firstOrder?.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>

                <p className="text-sm text-muted mt-2">
                  Phone : {firstOrder?.customer_phone}
                </p>
              </div>
            </div> */}
          {/* Right */}
          {/* <div>
            <div className="rounded-2xl border border-app p-6">
              <h2 className="text-lg font-semibold text-app">Order Summary</h2>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>

                  <span className="font-medium">
                    {formatPrice(totals?.subtotal || 0)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Shipping</span>

                  <span className="font-medium">
                    {totals?.shipping === 0
                      ? "Free"
                      : formatPrice(totals?.shipping)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Tax</span>

                  <span className="font-medium">
                    {formatPrice(totals?.tax || 0)}
                  </span>
                </div>

                
              </div>

              Ordered Products

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-app mb-5">
                  Ordered Items
                </h3>

                <div className="space-y-5">
                  {orders.map((item) => (
                    <div
                      key={item.id || item.product_id}
                      className="flex gap-4 border border-app rounded-2xl p-4"
                    >
                      <div className="h-24 w-24 rounded-xl overflow-hidden bg-surface border border-app shrink-0">
                        {item.product_image ? (
                          <img
                            src={getImageUrl(item.product_image)}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-semibold text-app">
                          {item.product_name}
                        </h4>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                          {item.size && <span>Size : {item.size}</span>}

                          {item.color && <span>Color : {item.color}</span>}

                          <span>Qty : {item.quantity}</span>
                        </div>

                        <p className="mt-4 font-semibold text-app">
                          {formatPrice(item.total_amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            Estimated Delivery

            <div className="mt-8 rounded-2xl bg-brand-500/5 border border-brand-500/20 p-6">
              <h3 className="font-semibold text-app">Estimated Delivery</h3>

              <p className="text-sm text-muted mt-3">
                Your order is expected to arrive on
              </p>

              <p className="mt-2 text-lg font-bold text-brand-600">
                {deliveryDate.toLocaleDateString()}
              </p>

              <p className="text-xs text-muted mt-3">
                We'll send you shipping updates by email once your order has
                been dispatched.
              </p>
            </div>
          </div> */}
        </div>

        {/* Bottom Buttons */}

        <div className="flex flex-col justify-center items-center gap-2 mt-10 mb-6">
          <p className="mt-3 max-w-xl ">
            Thank you for shopping with us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            
            <Link
              to="/products"
              className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3 transition-colors"
            >
              Continue Shopping
              {/* <ArrowRight size={18} className="ml-2" /> */}
            </Link>

            {/* <Link
              to="/orders"
              state={{ justPlaced: true }}
              className="inline-flex items-center justify-center rounded-full border border-app hover:bg-surface text-app font-semibold px-8 py-3 transition-colors"
            >
              View My Orders
            </Link> */}

            {/* <Link
                to={`/orders/${firstOrder?.id}/tracking`}
              to="/orders"
              className="inline-flex items-center justify-center rounded-full border border-app hover:bg-surface text-app font-semibold px-8 py-3 transition-colors"
            >
              Track Order
            </Link> */}
          </div>

          <p className="text-center text-xs text-muted mt-6">
            Need help with your order?
            <Link to="/contact" className="ml-1 text-brand-500 hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
