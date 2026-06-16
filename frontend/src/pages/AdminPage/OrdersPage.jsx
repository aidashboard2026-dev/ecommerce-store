import React, { useState, useEffect, useMemo } from "react";
import { Search, Download, ClipboardList, CheckCircle, Package, Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import jsPDF from "jspdf";
import clsx from "clsx";

import PageHeader from "../../components/ui/PageHeader";
import SearchBar from "../../components/ui/SearchBar";
import Badge from "../../components/ui/Badge";

import {
  getOrders,
  updateOrderStatus,
} from "../../services/order_Service";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [date, setDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (order) => {
    const pdf = new jsPDF();

    pdf.setFontSize(22);
    pdf.text("My Design", 85, 20);

    pdf.setFontSize(12);
    pdf.text("T-Shirt Store Invoice", 70, 28);

    pdf.line(10, 35, 200, 35);

    pdf.text(
      `Invoice No : ${order.order_number}`,
      10,
      50
    );

    pdf.text(
      `Date : ${order.ordered_at?.split("T")[0]}`,
      10,
      58
    );

    pdf.line(10, 65, 200, 65);

    pdf.setFontSize(14);
    pdf.text("Customer Details", 10, 75);

    pdf.setFontSize(11);

    pdf.text(
      `Name : ${order.customer_name}`,
      10,
      85
    );

    pdf.text(
      `Email : ${order.customer_email}`,
      10,
      93
    );

    pdf.text(
      `Phone : ${order.customer_phone}`,
      10,
      101
    );

    pdf.text(
      `Address : ${order.address_line1}`,
      10,
      109
    );

    pdf.text(
      `${order.city} - ${order.pincode}`,
      10,
      117
    );

    pdf.line(10, 125, 200, 125);

    pdf.setFontSize(14);
    pdf.text("Order Details", 10, 135);

    pdf.setFontSize(11);

    pdf.text(
      `Product : ${order.product_name}`,
      10,
      145
    );

    pdf.text(
      `Size : ${order.size}`,
      10,
      153
    );

    pdf.text(
      `Color : ${order.color}`,
      10,
      161
    );

    pdf.text(
      `Quantity : ${order.quantity}`,
      10,
      169
    );

    pdf.text(
      `Price : ₹${order.price}`,
      10,
      177
    );

    pdf.line(10, 185, 200, 185);

    pdf.setFontSize(14);
    pdf.text("Payment Summary", 10, 195);

    pdf.setFontSize(11);

    pdf.text(
      `Subtotal : ₹${order.total_amount}`,
      10,
      205
    );

    pdf.text(
      "Shipping : FREE",
      10,
      213
    );

    pdf.text(
      "Tax : ₹0",
      10,
      221
    );

    pdf.line(10, 228, 200, 228);

    pdf.setFontSize(14);

    pdf.text(
      `Total : ₹${order.total_amount}`,
      10,
      238
    );

    pdf.line(10, 245, 200, 245);

    pdf.setFontSize(11);

    pdf.text(
      `Payment Status : ${order.payment_status}`,
      10,
      255
    );

    pdf.text(
      `Tracking Status : ${order.tracking_status}`,
      10,
      263
    );

    pdf.save(
      `Invoice-${order.order_number}.pdf`
    );
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                tracking_status: newStatus,
              }
            : order
        )
      );
    } catch (error) {
      console.error(error);
      alert("Status update failed");
    }
  };

  // ── Filters & Analytics ──────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = search.toLowerCase();
      return (
        o.order_number?.toLowerCase().includes(term) ||
        o.customer_name?.toLowerCase().includes(term) ||
        o.payment_method?.toLowerCase().includes(term) ||
        o.tracking_status?.toLowerCase().includes(term)
      );
    });
  }, [orders, search]);

  const newOrders = useMemo(() => orders.filter((o) => o.tracking_status === "PLACED").length, [orders]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.tracking_status === "PROCESSING").length, [orders]);
  const shippedOrders = useMemo(() => orders.filter((o) => o.tracking_status === "SHIPPED").length, [orders]);
  const deliveredOrders = useMemo(() => orders.filter((o) => o.tracking_status === "DELIVERED").length, [orders]);

  const getRemainingTime = (expectedDate, trackingStatus) => {
    if (trackingStatus === "DELIVERED") {
      return "Delivered";
    }

    const diff = new Date(expectedDate) - new Date();

    if (diff <= 0) {
      return "Arriving Soon";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return `${days} Days ${hours} Hrs`;
  };

  return (
    <div className="space-y-6 py-2">
      {/* Upper Layout Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        {/* Left Side Info */}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          <PageHeader
            title="Orders"
            description="Manage processing, shipment, and receipts"
          />

          {/* Search Box */}
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search by Order ID, Customer, Payment..."
            className="max-w-md w-full"
          />

          {/* Metrics Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-2">
            {[
              { label: "New Orders", val: newOrders, icon: ClipboardList, color: "text-blue-500 bg-blue-500/5 border-blue-500/10 dark:bg-blue-500/10" },
              { label: "Processing", val: pendingOrders, icon: Clock, color: "text-amber-500 bg-amber-500/5 border-amber-500/10 dark:bg-amber-500/10" },
              { label: "Shipped", val: shippedOrders, icon: Package, color: "text-indigo-500 bg-indigo-500/5 border-indigo-500/10 dark:bg-indigo-500/10" },
              { label: "Delivered", val: deliveredOrders, icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10 dark:bg-emerald-500/10" },
            ].map((stat) => (
              <div key={stat.label} className="card p-5 bg-surface border border-app rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{stat.label}</p>
                  <p className="text-2xl font-bold font-display mt-2 tracking-tight text-app">{stat.val}</p>
                </div>
                <div className={clsx("w-9 h-9 rounded-lg border flex items-center justify-center shadow-xs shrink-0", stat.color)}>
                  <stat.icon size={15} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Calendar Wrapper */}
        <div className="flex-shrink-0 flex flex-col items-center p-4 card w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-3 self-start">
            <CalendarIcon size={14} />
            <span>Calendar Logs</span>
          </div>
          <Calendar
            onChange={setDate}
            value={date}
          />
        </div>
      </div>

      {/* Orders List Container */}
      <div className="space-y-6">
        <div className="border-b border-app pb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <ClipboardList size={14} />
            Active Orders ({filteredOrders.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-xs font-medium text-muted">Syncing orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="card p-12 text-center text-muted">
            <p className="text-sm font-semibold">No orders matched your search</p>
            <p className="text-xs mt-1">Try clearing filters or search terms.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="card p-6 shadow-sm hover:border-brand-500/30 transition-all duration-200"
            >
              {/* Order Item Header */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-app pb-4 mb-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-sm font-bold text-app">
                    {order.order_number}
                  </span>
                  <span className="h-4 w-px bg-border-light dark:bg-border-dark hidden sm:inline" />
                  <span className="text-xs text-muted font-medium">
                    Placed: {order.ordered_at?.split("T")[0]}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted font-semibold">
                    Set Status:
                  </span>
                  <div className="flex gap-1.5">
                    {[
                      { status: "PROCESSING", label: "Process", activeColor: "bg-amber-500 border-amber-500 text-white" },
                      { status: "SHIPPED", label: "Ship", activeColor: "bg-violet-500 border-violet-500 text-white" },
                      { status: "DELIVERED", label: "Deliver", activeColor: "bg-emerald-500 border-emerald-500 text-white" },
                    ].map((step) => (
                      <button
                        key={step.status}
                        onClick={() => handleStatusUpdate(order.id, step.status)}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95",
                          order.tracking_status === step.status
                            ? step.activeColor
                            : "border-app bg-app text-muted hover:text-app"
                        )}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Grid details */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.5fr_220px] gap-8">
                
                {/* Column 1: Customer Info */}
                <div className="lg:border-r lg:border-app lg:pr-6 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Customer Registry</p>
                  <div>
                    <h4 className="text-base font-bold text-app">{order.customer_name}</h4>
                    <p className="text-xs text-muted mt-0.5">{order.customer_email}</p>
                    <p className="text-xs text-muted">{order.customer_phone}</p>
                  </div>
                  <div className="text-xs space-y-1 text-app font-medium bg-app/50 p-3 rounded-lg border border-app">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-1">Delivery Address</p>
                    <p>{order.address_line1}</p>
                    {order.address_line2 && <p>{order.address_line2}</p>}
                    <p>{order.city} - {order.pincode}</p>
                  </div>
                  <div className="text-xs flex flex-col gap-1 pt-1">
                    <p className="text-muted">
                      Payment Mode: <span className="font-bold text-brand-500">{order.payment_method}</span>
                    </p>
                    <p className="text-muted">
                      Logistics: <span className="font-semibold text-app">Priority Cargo</span>
                    </p>
                  </div>
                </div>

                {/* Column 2: Items Details */}
                <div className="lg:border-r lg:border-app lg:px-6 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Purchased Item</p>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-16 rounded-lg bg-app border border-app overflow-hidden flex-shrink-0">
                      {order.product_image ? (
                        <img
                          src={order.product_image}
                          alt={order.product_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted">
                          <Package size={18} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-app truncate">{order.product_name}</h4>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1.5 text-xs text-muted">
                        <p>Size: <span className="font-bold text-app">{order.size}</span></p>
                        <p>Color: <span className="font-bold text-app">{order.color}</span></p>
                        <p>Qty: <span className="font-bold text-app">{order.quantity}</span></p>
                        <p>Price: <span className="font-bold text-app">₹{order.price}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="border-t border-app pt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Subtotal</span>
                      <span className="font-medium text-app">₹{order.price * order.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Shipping</span>
                      <span className="font-bold text-emerald-500 uppercase text-[10px]">FREE</span>
                    </div>
                    <div className="flex justify-between border-t border-app pt-2 font-bold text-sm">
                      <span className="text-app">Total Amount</span>
                      <span className="text-emerald-500">₹{order.total_amount}</span>
                    </div>
                    <div className="pt-2 flex flex-col gap-1.5 border-t border-app">
                      <div className="flex justify-between">
                        <span className="text-muted">Dispatch Days:</span>
                        <span className="font-bold text-app">{order.delivery_days} Days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Time Remaining:</span>
                        <span
                          className={clsx(
                            "font-bold",
                            order.tracking_status === "DELIVERED"
                              ? "text-emerald-500"
                              : "text-amber-500"
                          )}
                        >
                          {getRemainingTime(order.expected_delivery_date, order.tracking_status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Payment Summary & Actions */}
                <div className="flex flex-col justify-between h-full space-y-6">
                  <div className="text-center space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Tracking Status</p>
                      <Badge
                        label={order.tracking_status}
                        variant={
                          order.tracking_status === "DELIVERED"
                            ? "success"
                            : order.tracking_status === "SHIPPED"
                            ? "info"
                            : order.tracking_status === "PROCESSING"
                            ? "warning"
                            : "default"
                        }
                        dot
                      />
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Receipt Settled</p>
                      <p className="text-xl font-bold font-display text-app">₹{order.total_amount}</p>
                      <div className="mt-1.5">
                        <Badge
                          label={order.payment_status}
                          variant={order.payment_status === "PAID" ? "success" : "warning"}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadInvoice(order)}
                    className="w-full btn-secondary text-xs font-bold py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <Download size={14} />
                    Invoice PDF
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
