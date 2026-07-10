import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, ShoppingCart, CreditCard, AlertTriangle, XCircle, Inbox } from "lucide-react";
import { notificationsAPI } from "@/services/api";
import clsx from "clsx";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.list();
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsAPI.read(id);
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.readAll();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const getEventIcon = (event) => {
    switch (event) {
      case "New Order Placed":
        return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
      case "Payment Received":
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case "Low Stock Alert":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "Order Cancelled":
        return <XCircle className="h-4 w-4 text-rose-500" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    if (isNaN(diffMs)) return "just now";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <style>{`
        @keyframes swing {
          0%, 100% { transform: rotate(0); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing {
          animation: swing 1.2s ease-in-out infinite;
        }
      `}</style>
      
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "relative flex h-8 w-8 items-center justify-center rounded-lg border border-app bg-surface hover:bg-app text-muted hover:text-app transition-all active:scale-95",
          isOpen && "bg-app text-app"
        )}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={14} className={clsx(unreadCount > 0 && "animate-swing")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white shadow-glow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 md:w-96 rounded-xl border border-app bg-surface shadow-elevated overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-app bg-app/20">
            <h3 className="text-xs font-bold text-app uppercase tracking-wider">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <Check size={10} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-app">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-10 w-10 rounded-full bg-app flex items-center justify-center mb-3">
                  <Inbox className="h-5 w-5 text-muted" />
                </div>
                <p className="text-xs font-medium text-app">All caught up!</p>
                <p className="text-[10px] text-muted mt-1">
                  You have no notifications.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={(e) => !notification.is_read && handleMarkRead(notification.id, e)}
                  className={clsx(
                    "flex gap-3 p-3.5 hover:bg-app/30 cursor-pointer transition-colors relative group",
                    !notification.is_read && "bg-brand-500/[0.02] dark:bg-brand-500/[0.03]"
                  )}
                >
                  {/* Left Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-7 w-7 rounded-lg bg-app flex items-center justify-center">
                      {getEventIcon(notification.event)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className={clsx(
                        "text-xs text-app truncate",
                        !notification.is_read ? "font-semibold" : "font-normal"
                      )}>
                        {notification.title}
                      </p>
                      <span className="text-[9px] text-muted whitespace-nowrap mt-0.5">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted mt-1 leading-normal whitespace-pre-line">
                      {notification.message}
                    </p>
                  </div>

                  {/* Unread Indicator & Mark Read Action */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {!notification.is_read ? (
                      <span className="h-2 w-2 rounded-full bg-brand-500 group-hover:hidden" />
                    ) : null}
                    {!notification.is_read && (
                      <button
                        onClick={(e) => handleMarkRead(notification.id, e)}
                        className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded bg-app text-muted hover:text-app"
                        title="Mark as read"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
