import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, ClipboardList, Ban, CheckCircle, Package, Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import clsx from "clsx";
import toast from "react-hot-toast";

import PageHeader from "@/shared/components/ui/PageHeader";
import SearchBar from "@/shared/components/ui/SearchBar";
import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";
import { ordersAPI } from "@/shared/services/api";

import {
  getOrders,
  updateOrderStatus,
  updateOrder,
} from "@/admin/services/order_Service";
import { useDebounce, getApiErrorMessage } from "@/shared/utils/productUtils";
import { generateInvoice } from "@/shared/utils/invoiceGenerator";

export default function OrdersPage() {
  const [searchParams] = useSearchParams();

  // Map URL ?status= param to internal tracking_status search prefix
  const initialSearch = (() => {
    const s = searchParams.get('status')
    if (!s) return ''
    // Map friendly URL values to internal status labels used in search
    const map = {
      pending:    'PLACED',
      processing: 'PROCESSING',
      shipped:    'SHIPPED',
      delivered:  'DELIVERED',
      cancelled:  'CANCELLED',
    }
    return map[s.toLowerCase()] || s.toUpperCase()
  })()

  const emptyOrderForm = {
    logistics: "",
    tracking_id: "",
  };

  const PAGE_SIZE = 20;

  const [orders, setOrders]         = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [date, setDate]             = useState(new Date());
  // Pre-populate search from URL ?status= param so dashboard nav pre-filters
  const [search, setSearch]         = useState(initialSearch);
  const [loading, setLoading]       = useState(true);
  const [orderDrafts, setOrderDrafts] = useState({});

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadOrders(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  const loadOrders = async (page = 1, searchText = "") => {
    try {
      setLoading(true);
      const result = await getOrders(page, PAGE_SIZE, { search: searchText });
      setOrders(result.orders);
      setTotalOrders(result.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (order) => {
    const toastId = toast.loading("Generating invoice…");
    try {
      await generateInvoice(order);
      toast.success("Invoice downloaded!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to download invoice", { id: toastId });
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));

  
  const getOrderDraft = (order) => {
    return orderDrafts[order.id] || {
      logistics: order.logistics || "",
      tracking_id: order.tracking_id || "",
    };
  };

  const handleDraftChange = (order, field, value) => {
    setOrderDrafts((prev) => ({
      ...prev,
      [order.id]: {
        ...(prev[order.id] || {
          logistics: order.logistics || "",
          tracking_id: order.tracking_id || "",
        }),
        [field]: value,
      },
    }));
  };

  const handleClearForm = (orderId) => {
    setOrderDrafts((prev) => ({
      ...prev,
      [orderId]: emptyOrderForm,
    }));
    toast.success("Order fields cleared");
  };

  const handleSubmit = async (order) => {
    try {
      const draft = getOrderDraft(order);
      const updated = await updateOrder(
        order.id,
        draft
      );

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? updated
            : item
        )
      );
      setOrderDrafts((prev) => ({
        ...prev,
        [order.id]: {
          logistics: updated.logistics || "",
          tracking_id: updated.tracking_id || "",
        },
      }));

      toast.success("Order updated successfully");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Failed to update order"));
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      // Optimistic update in local state first for instant UI feedback
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, tracking_status: newStatus } : order
        )
      );
    } catch (error) {
      console.error(error);
      toast.error("Status update failed. Please try again.");
    }
  };

  // Filters & Analytics
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
  const cancelOrders = useMemo(() => orders.filter((o) => o.tracking_status === "CANCELLED").length, [orders]);

  const getRemainingTime = (expectedDate, trackingStatus) => {
    if (trackingStatus === "PLACED") {
      return "New Order";
    }
    if (trackingStatus === "DELIVERED") {
      return "Delivered";
    }
    if (trackingStatus === "CANCELLED") {
      return "Cancelled";
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
        <div className="flex flex-col min-w-0 space-y-4 w-full">
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
              { label: "Cancel", val: cancelOrders, icon: Ban, color: "text-red-500 bg-red-500/5 border-red-500/10 dark:bg-red-500/10" },
            ].map((stat) => (
              <div key={stat.label} className={clsx(
                "card py-3 px-2 rounded-xl shadow-sm flex flex-col items-start justify-between border", stat.bg
              )}>
                <div className="w-full flex justify-between items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{stat.label}</p>
                  <div className={clsx("w-9 h-9 rounded-lg border flex items-center justify-center shadow-xs shrink-0", stat.color)}>
                    <stat.icon size={15} />
                  </div>
                </div>

                <p className="text-4xl pl-4 font-bold font-display mt-2 tracking-tight text-app">{stat.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Calendar Wrapper */}
        <div className="flex flex-1 flex-col items-center lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-3 self-start">
            <CalendarIcon size={14} />
            <span>Calendar Logs</span>
          </div>
          <div className="rounded-none border-0 bg-transparent shadow-none">
            <Calendar
              onChange={setDate}
              value={date}
              className="border-0 bg-transparent shadow-none"
            />
          </div>
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
                
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted font-semibold">
                    Set Status:
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { status: "PLACED", label: "New Order", activeColor: "bg-blue-500 border-blue-500 text-white" },
                      { status: "PROCESSING", label: "Process", activeColor: "bg-amber-500 border-amber-500 text-white" },
                      { status: "SHIPPED", label: "Ship", activeColor: "bg-violet-500 border-violet-500 text-white" },
                      { status: "DELIVERED", label: "Deliver", activeColor: "bg-emerald-500 border-emerald-500 text-white" },
                      { status: "CANCELLED", label: "Cancel", activeColor: "bg-red-500 border-red-500 text-white" },
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
                <div className="lg:border-r lg:border-app lg:pr-6 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Customer Registry</p>
                  <div>
                    <h4 className="text-base font-bold text-app">{order.customer_name}</h4>
                    <p className="text-xs text-muted mt-0.5">{order.customer_email}</p>
                    <p className="text-xs text-muted">{order.customer_phone}</p>
                  </div>
                  <div className="text-xs text-app font-medium bg-app/50">
                    <p className="text-md font-bold uppercase tracking-wider text-muted mb-1">Delivery Address:</p>
                    <div className="pl-3">
                      <p>{order.address_line1}</p>
                      {order.address_line2 && <p>{order.address_line2}</p>}
                      <p>{order.city} - {order.pincode}</p>
                    </div>
                  </div>
                  <div className="text-xs flex flex-col gap-1 pt-1">
                    <p className="font-bold text-md uppercase">
                      Payment Mode: <span className="font-bold text-brand-500">{order.payment_method}</span>
                    </p>
                  </div>
                  {/* Order Management */}
              <div className="flex flex-row w-full justify-between gap-3 ">
                <div className="flex flex-col">
                  <div className="">
                    <label className="text-xs font-semibold text-muted">
                      Logistics
                    </label>
                    <input
                      className="input-field w-full text-xs"
                      value={getOrderDraft(order).logistics}
                      onChange={(e) =>
                        handleDraftChange(order, "logistics", e.target.value)
                      }
                      placeholder="Enter logistics partner"
                    />
                  </div>

                  <div className="w-full">
                    <label className="text-xs font-semibold text-muted">
                      Tracking ID
                    </label>
                    <input
                      className="input-field w-full text-xs"
                      value={getOrderDraft(order).tracking_id}
                      onChange={(e) =>
                        handleDraftChange(order, "tracking_id", e.target.value)
                      }
                      placeholder="Enter tracking ID"
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleSubmit(order)}
                  >
                    Update
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleClearForm(order.id)}
                  >
                    Clear
                  </Button>
                </div>
                
              </div>

                </div>

                {/* Column 2: Items Details */}
                <div className="lg:border-r lg:border-app lg:pr-6 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Purchased Item</p>
                  <div className="flex items-start gap-3 ">
                    <div className="w-24 h-28 rounded-lg bg-app border border-app overflow-hidden flex-shrink-0">
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
                      <div className="grid grid-cols-2 gap-x-2 gap-y-2 mt-2 text-xs text-muted">
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
                      <span className={order.shipping_fee > 0 ? "font-medium text-app" : "font-bold text-emerald-500 uppercase text-[10px]"}>
                        {order.shipping_fee > 0 ? `₹${order.shipping_fee}` : "FREE"}
                      </span>
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
                            order.tracking_status === "DELIVERED" && "text-emerald-500",
                            order.tracking_status === "SHIPPED" && "text-indigo-500",
                            order.tracking_status === "PLACED" && "text-blue-500",
                            order.tracking_status === "PROCESSING" && "text-amber-500",
                            order.tracking_status === "CANCELLED" && "text-red-500"
                          )}
                        >
                          {getRemainingTime(
                            order.expected_delivery_date,
                            order.tracking_status
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Payment Summary & Actions */}
                <div className="flex flex-col justify-between h-full space-y-6">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Tracking Status</p>
                  <div className="text-center space-y-4">
                      <Badge
                        label={order.tracking_status}
                        variant={
                          order.tracking_status === "PLACED" ? "new":
                          order.tracking_status === "DELIVERED" ? "success":
                          order.tracking_status === "SHIPPED" ? "info":
                          order.tracking_status === "PROCESSING" ? "warning":
                          order.tracking_status === "CANCELLED" ? "danger": "default"
                        } dot
                      />
                  </div>
                   <div className="text-center pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Receipt Settled</p>
                      <p className="text-xl font-bold font-display text-app">₹{order.total_amount}</p>
                      <div className="mt-1.5">
                        <Badge
                          label={order.payment_status}
                          variant={order.payment_status === "PAID" ? "success" : "warning"}
                        />
                      </div>
                    </div>

                  <Button
                    onClick={() => handleDownloadInvoice(order)}
                    variant="download"
                    className="flex"
                    icon={Download}
                  >
                    Invoice PDF
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 mt-2">
          <p className="text-sm text-gray-400">
            Page <span className="font-medium text-white">{currentPage}</span> of{" "}
            <span className="font-medium text-white">{totalPages}</span>{" "}
            &mdash; {totalOrders} total orders
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 text-sm rounded bg-gray-700 text-white disabled:opacity-40 hover:bg-gray-600 transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const page  = start + i;
              return page <= totalPages ? (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    page === currentPage
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {page}
                </button>
              ) : null;
            })}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 text-sm rounded bg-gray-700 text-white disabled:opacity-40 hover:bg-gray-600 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
