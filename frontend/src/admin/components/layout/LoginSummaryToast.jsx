import React, { useState, useEffect } from "react";
import { X, Bell, ShoppingCart, CreditCard, AlertTriangle, XCircle } from "lucide-react";
import { notificationsAPI } from "@/shared/services/api";
import clsx from "clsx";

export default function LoginSummaryToast() {
  const [show, setShow] = useState(false);
  const [summary, setSummary] = useState({
    unreadCount: 0,
    details: [],
    lastThree: []
  });

  useEffect(() => {
    const isShown = sessionStorage.getItem("login_summary_toast_shown");
    if (isShown) return;

    const loadSummary = async () => {
      try {
        const response = await notificationsAPI.list();
        const notifications = response.data.notifications || [];
        const unread = notifications.filter(n => !n.is_read);

        if (unread.length > 0) {
          // Count events
          const counts = {};
          unread.forEach(n => {
            counts[n.event] = (counts[n.event] || 0) + 1;
          });

          const details = [];
          if (counts["New Order Placed"]) {
            details.push(`${counts["New Order Placed"]} new order${counts["New Order Placed"] > 1 ? "s" : ""}`);
          }
          if (counts["Payment Received"]) {
            details.push(`${counts["Payment Received"]} payment${counts["Payment Received"] > 1 ? "s" : ""} received`);
          }
          if (counts["Low Stock Alert"]) {
            details.push(`${counts["Low Stock Alert"]} low stock alert${counts["Low Stock Alert"] > 1 ? "s" : ""}`);
          }
          if (counts["Order Cancelled"]) {
            details.push(`${counts["Order Cancelled"]} order cancellation${counts["Order Cancelled"] > 1 ? "s" : ""}`);
          }

          // Last 3 unread
          const lastThree = unread.slice(0, 3);

          setSummary({
            unreadCount: response.data.unread_count || unread.length,
            details,
            lastThree
          });
          
          setShow(true);
          sessionStorage.setItem("login_summary_toast_shown", "true");

          // Auto-hide after 10 seconds
          const timer = setTimeout(() => {
            setShow(false);
          }, 10000);
          return () => clearTimeout(timer);
        } else {
          sessionStorage.setItem("login_summary_toast_shown", "true");
        }
      } catch (error) {
        console.error("Failed to load notifications for login summary:", error);
      }
    };

    loadSummary();
  }, []);

  if (!show) return null;

  const getEventIcon = (event) => {
    switch (event) {
      case "New Order Placed":
        return <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" />;
      case "Payment Received":
        return <CreditCard className="h-3.5 w-3.5 text-blue-500" />;
      case "Low Stock Alert":
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "Order Cancelled":
        return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-brand-500" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-surface/95 dark:bg-surface/90 backdrop-blur-md rounded-2xl border border-app shadow-elevated p-4 animate-slide-up transition-all duration-300">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center">
            <Bell className="h-4 w-4 text-brand-500" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-app">Welcome back!</h4>
            <p className="text-[10px] text-muted">Here's your summary</p>
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          className="h-5 w-5 rounded-md hover:bg-app flex items-center justify-center text-muted hover:text-app transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-app leading-normal">
          You have <strong className="text-brand-500">{summary.unreadCount}</strong> unread notification{summary.unreadCount > 1 ? "s" : ""}.
          {summary.details.length > 0 && (
            <span> Since your last session: {summary.details.join(", ")}.</span>
          )}
        </p>

        {summary.lastThree.length > 0 && (
          <div className="border-t border-app pt-2.5 space-y-2">
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider">
              Recent Events
            </p>
            <div className="space-y-1.5">
              {summary.lastThree.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-[10px] text-app">
                  <div className="flex-shrink-0">{getEventIcon(item.event)}</div>
                  <span className="font-medium truncate flex-1">{item.title}</span>
                  <span className="text-[9px] text-muted flex-shrink-0">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress timer bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500/10 rounded-b-2xl overflow-hidden">
        <div className="h-full bg-brand-500 animate-[shrink_10s_linear_forwards]" />
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
