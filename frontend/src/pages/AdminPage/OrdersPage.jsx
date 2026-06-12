import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  getOrders,
  updateOrderStatus,
} from "../../services/order_Service";
import { getImageUrl } from "../../utils/productUtils";
import { useTheme } from "../../hooks/useAuth";

// ─── Tracking-status → style mapping (mirrors status-pill pattern) ────────────
const STATUS_STYLES = {
  PLACED:     { bg: "rgba(59,130,246,.12)",  color: "#3b82f6", border: "rgba(59,130,246,.35)"  },
  PROCESSING: { bg: "rgba(245,158,11,.12)",  color: "#f59e0b", border: "rgba(245,158,11,.35)"  },
  SHIPPED:    { bg: "rgba(168,85,247,.12)",  color: "#a855f7", border: "rgba(168,85,247,.35)"  },
  DELIVERED:  { bg: "rgba(34,197,94,.12)",   color: "#22c55e", border: "rgba(34,197,94,.35)"   },
  CANCELLED:  { bg: "rgba(239,68,68,.12)",   color: "#ef4444", border: "rgba(239,68,68,.35)"   },
  REFUNDED:   { bg: "rgba(100,116,139,.12)", color: "#64748b", border: "rgba(100,116,139,.35)" },
};

function TrackingBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.PLACED;
  return (
    <span
      style={{
        display: "inline-block",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        padding: "4px 14px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

// ─── Stat card — uses design system surface / border tokens ──────────────────
function StatCard({ label, value, accent }) {
  return (
    <div
      className="card p-4 flex flex-col justify-between gap-2"
      style={{ borderLeft: `4px solid ${accent}`, minHeight: 110 }}
    >
      <p className="text-muted text-sm font-semibold">{label}</p>
      <p className="text-4xl font-bold" style={{ color: accent, lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );
}

export default function OrdersPage() {
  const { isDark } = useTheme();

  const [date, setDate] = useState(new Date());
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getOrders();
      console.log(
        data.map((o) => ({
          id: o.id,
          expected_delivery_date: o.expected_delivery_date,
          tracking_status: o.tracking_status,
        }))
      );
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadInvoice = (order) => {
    const pdf = new jsPDF();

    pdf.setFontSize(22);
    pdf.text("My Design", 85, 20);

    pdf.setFontSize(12);
    pdf.text("T-Shirt Store Invoice", 70, 28);

    pdf.line(10, 35, 200, 35);

    pdf.text(`Invoice No : ${order.order_number}`, 10, 50);
    pdf.text(`Date : ${order.ordered_at?.split("T")[0]}`, 10, 58);

    pdf.line(10, 65, 200, 65);

    pdf.setFontSize(14);
    pdf.text("Customer Details", 10, 75);

    pdf.setFontSize(11);
    pdf.text(`Name : ${order.customer_name}`, 10, 85);
    pdf.text(`Email : ${order.customer_email}`, 10, 93);
    pdf.text(`Phone : ${order.customer_phone}`, 10, 101);
    pdf.text(`Address : ${order.address_line1}`, 10, 109);
    pdf.text(`${order.city} - ${order.pincode}`, 10, 117);

    pdf.line(10, 125, 200, 125);

    pdf.setFontSize(14);
    pdf.text("Order Details", 10, 135);

    pdf.setFontSize(11);
    pdf.text(`Product : ${order.product_name}`, 10, 145);
    pdf.text(`Size : ${order.size}`, 10, 153);
    pdf.text(`Color : ${order.color}`, 10, 161);
    pdf.text(`Quantity : ${order.quantity}`, 10, 169);
    pdf.text(`Price : ₹${order.price}`, 10, 177);

    pdf.line(10, 185, 200, 185);

    pdf.setFontSize(14);
    pdf.text("Payment Summary", 10, 195);

    pdf.setFontSize(11);
    pdf.text(`Subtotal : ₹${order.total_amount}`, 10, 205);
    pdf.text("Shipping : FREE", 10, 213);
    pdf.text("Tax : ₹0", 10, 221);

    pdf.line(10, 228, 200, 228);

    pdf.setFontSize(14);
    pdf.text(`Total : ₹${order.total_amount}`, 10, 238);

    pdf.line(10, 245, 200, 245);

    pdf.setFontSize(11);
    pdf.text(`Payment Status : ${order.payment_status}`, 10, 255);
    pdf.text(`Tracking Status : ${order.tracking_status}`, 10, 263);

    pdf.save(`Invoice-${order.order_number}.pdf`);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, tracking_status: newStatus }
            : order
        )
      );
    } catch (error) {
      console.error(error);
      alert("Status update failed");
    }
  };

  console.log("ORDERS =", orders);

  const newOrders = orders.filter(
    (o) => o.tracking_status === "PLACED"
  ).length;
  const pendingOrders = orders.filter(
    (o) => o.tracking_status === "PROCESSING"
  ).length;
  const shippedOrders = orders.filter(
    (o) => o.tracking_status === "SHIPPED"
  ).length;
  const deliveredOrders = orders.filter(
    (o) => o.tracking_status === "DELIVERED"
  ).length;

  console.log(
    orders.map((o) => ({ id: o.id, status: o.tracking_status }))
  );
  console.log("NEW =", newOrders);
  console.log("PENDING =", pendingOrders);
  console.log("SHIPPED =", shippedOrders);
  console.log("DELIVERED =", deliveredOrders);

  const getRemainingTime = (expectedDate, trackingStatus) => {
    if (trackingStatus === "DELIVERED") return "Delivered";
    const diff = new Date(expectedDate) - new Date();
    if (diff <= 0) return "Arriving Soon";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    return `${days} Days ${hours} Hrs`;
  };

  // ── Action button: active state uses accent fill; inactive uses ghost ──────
  const actionBtn = (label, active, onClick, accentColor) => (
    <button
      onClick={onClick}
      style={{
        padding: "4px 14px",
        borderRadius: 7,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 150ms ease",
        border: active
          ? `1px solid ${accentColor}`
          : "1px solid var(--color-border)",
        background: active ? accentColor : "transparent",
        color: active ? "#fff" : "var(--color-text-muted)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6 py-4">
      {/* ── Top section: header + calendar ─────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row justify-between items-start gap-6">
        {/* Left Side */}
        <div className="flex-1">
          {/* Page heading */}
          <h1 className="font-display font-bold text-4xl text-app leading-tight">
            Orders
          </h1>
          <p className="text-muted text-sm mt-1">Today's order list</p>

          {/* Search */}
          <div className="relative w-full mt-6">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              placeholder="Order Id, COD, UPI"
              className="w-full border border-app bg-app rounded-lg pl-8 pr-4 py-2 text-sm text-app placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 w-full">
            <StatCard label="New Orders"  value={newOrders}       accent="#3b82f6" />
            <StatCard label="Shipped"     value={shippedOrders}   accent="#a855f7" />
            <StatCard label="Delivered"   value={deliveredOrders} accent="#22c55e" />
            <StatCard label="Pending"     value={pendingOrders}   accent="#f59e0b" />
          </div>
        </div>

        {/* Calendar */}
        <div className="w-full xl:w-[260px] h-auto flex-shrink-0">
          <Calendar
            onChange={setDate}
            value={date}
            className="rounded-xl overflow-hidden"
          />
        </div>
      </div>

      {/* ── Order cards ─────────────────────────────────────────────────────── */}
      {orders.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-muted text-sm">No orders found.</p>
        </div>
      )}

      {orders.map((order) => (
        <div key={order.id} className="card overflow-hidden">
          {/* Order header row */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 px-6 py-4 border-b border-app">
            {/* Order number + date */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="font-bold text-app break-all text-sm">
                {order.order_number}
              </span>
              <span className="text-muted text-xs">
                Date: {order.ordered_at?.split("T")[0]}
              </span>
            </div>

            {/* Status action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-xs text-muted">Operation Action:</span>
              <div className="flex flex-wrap gap-2">
                {actionBtn(
                  "Process",
                  order.tracking_status === "PROCESSING",
                  () => handleStatusUpdate(order.id, "PROCESSING"),
                  "#f59e0b"
                )}
                {actionBtn(
                  "Shipped",
                  order.tracking_status === "SHIPPED",
                  () => handleStatusUpdate(order.id, "SHIPPED"),
                  "#a855f7"
                )}
                {actionBtn(
                  "Deliver",
                  order.tracking_status === "DELIVERED",
                  () => handleStatusUpdate(order.id, "DELIVERED"),
                  "#22c55e"
                )}
              </div>
            </div>
          </div>

          {/* Order body: 3-column grid */}
          <div
            id={`invoice-${order.id}`}
            className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_260px] gap-0"
          >
            {/* ── Column 1: Customer ──────────────────────────────────────── */}
            <div className="p-6 border-b lg:border-b-0 lg:border-r border-app flex flex-col justify-between gap-6">
              <div>
                <h3 className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">
                  Customer Registry
                </h3>
                <p className="text-2xl font-bold text-app break-words">
                  {order.customer_name}
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-muted text-xs uppercase tracking-wider font-semibold mb-2">
                  Address
                </p>
                {[
                  order.address_line1,
                  order.address_line2,
                  order.city,
                  order.pincode,
                ]
                  .filter(Boolean)
                  .map((line, i) => (
                    <p key={i} className="text-app text-sm ml-2">
                      {line}
                    </p>
                  ))}
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-muted">
                  Receipt Method:{" "}
                  <span className="font-bold" style={{ color: "#f59e0b" }}>
                    {order.payment_method}
                  </span>
                </p>
                <p className="text-muted">
                  Dispatch Logistics:{" "}
                  <span className="font-semibold text-app">Priority Cargo</span>
                </p>
              </div>
            </div>

            {/* ── Column 2: Purchased item + price breakdown ───────────────── */}
            <div className="p-6 border-b lg:border-b-0 lg:border-r border-app flex flex-col gap-4">
              <h3 className="text-muted text-xs font-semibold uppercase tracking-widest">
                Purchased Item
              </h3>

              {/* Product thumbnail + info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg border border-app overflow-hidden flex-shrink-0 bg-surface">
                  <img
                    src={getImageUrl(order.product_image)}
                    alt="Product"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-app">
                    {order.product_name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">Size: {order.size}</p>
                  <p className="text-xs text-muted">Color: {order.color}</p>
                  <p className="text-xs text-muted">Qty: {order.quantity}</p>
                </div>
                <p className="font-bold text-app text-sm">₹{order.price}</p>
              </div>

              {/* Price breakdown */}
              <div className="border-t border-app pt-4 space-y-2">
                {[
                  { label: "Product Price", value: `₹${order.price}` },
                  { label: "Quantity",      value: order.quantity    },
                  { label: "Shipping",      value: "FREE",  valueClass: "text-green-500" },
                  { label: "Tax",           value: "₹0"              },
                ].map(({ label, value, valueClass }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-muted">{label}</span>
                    <span className={`font-medium text-app ${valueClass ?? ""}`}>
                      {value}
                    </span>
                  </div>
                ))}

                <div className="border-t border-app pt-2 flex justify-between font-bold text-sm">
                  <span className="text-app">Total</span>
                  <span className="text-green-500">₹{order.total_amount}</span>
                </div>
              </div>

              {/* Delivery timing */}
              <div className="border-t border-app pt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Delivery Days:</span>
                  <span className="font-semibold text-app">
                    {order.delivery_days} Days
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Remaining:</span>
                  <span
                    className="font-bold"
                    style={{
                      color:
                        order.tracking_status === "DELIVERED"
                          ? "#22c55e"
                          : "#f59e0b",
                    }}
                  >
                    {getRemainingTime(
                      order.expected_delivery_date,
                      order.tracking_status
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Column 3: Summary + Invoice ─────────────────────────────── */}
            <div className="p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4 text-center">
                {/* Tracking status badge */}
                <div className="flex justify-center">
                  <TrackingBadge status={order.tracking_status} />
                </div>

                {/* Total amount */}
                <p className="text-3xl font-bold text-app">
                  ₹{order.total_amount}
                </p>

                {/* Payment status */}
                <p
                  className="text-2xl font-bold"
                  style={{
                    color:
                      order.payment_status === "PAID" ? "#22c55e" : "#f59e0b",
                  }}
                >
                  {order.payment_status}
                </p>

                {/* Repeat total for prominence */}
                <p className="text-4xl font-bold text-app mt-4">
                  ₹{order.total_amount}
                </p>
              </div>

              {/* Invoice download — btn-primary from design system */}
              <button
                onClick={() => downloadInvoice(order)}
                className="btn-primary w-full text-center justify-center"
              >
                🖨 Download Invoice
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
