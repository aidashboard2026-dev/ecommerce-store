import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, X } from "lucide-react";
import clsx from "clsx";

export default function GuestAuthModal({ isOpen, onClose, triggerElement }) {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const modalRef = useRef(null);
  const signInRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => setAnimate(true), 10);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus trap & ESC support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus on Open
  useEffect(() => {
    if (isOpen && signInRef.current) {
      const timer = setTimeout(() => {
        signInRef.current.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Restore Focus on Close
  useEffect(() => {
    return () => {
      if (triggerElement && typeof triggerElement.focus === "function") {
        triggerElement.focus();
      }
    };
  }, [triggerElement]);

  if (!isOpen) return null;

  const handleSignIn = () => {
    onClose();
    navigate("/login", { state: { from: { pathname: "/checkout" } } });
  };

  const handleCreateAccount = () => {
    onClose();
    navigate("/register", { state: { from: { pathname: "/checkout" } } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Screen Reader Live Announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        Authentication required to continue checkout.
      </div>

      {/* Backdrop (rgba(0,0,0,0.5)) */}
      <div
        onClick={onClose}
        className={clsx(
          "absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ease-out",
          animate ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={clsx(
          "relative w-full max-w-md bg-app border border-app rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center gap-6 transition-all duration-200 ease-out transform",
          animate ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-muted hover:text-app p-1 rounded-full hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <X size={18} />
        </button>

        {/* Icon Header */}
        <div className="h-14 w-14 rounded-full bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center text-brand-500">
          <ShieldCheck size={28} className="animate-pulse" />
        </div>

        {/* Title & Description */}
        <div className="flex flex-col gap-2">
          <h2
            id="modal-title"
            className="font-display font-bold text-xl text-app tracking-tight"
          >
            Continue to Secure Checkout
          </h2>
          <p
            id="modal-description"
            className="text-sm text-muted leading-relaxed"
          >
            You're one step away from placing your order.
            <br />
            Sign in or create a free account to continue securely.
          </p>
        </div>

        {/* Safe-cart Indicator */}
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 text-xs font-semibold bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-900/50">
          <span>✓</span> Your cart is safely saved.
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-2.5 mt-1.5">
          <button
            ref={signInRef}
            type="button"
            onClick={handleSignIn}
            className="w-full h-11 flex items-center justify-center bg-brand-500 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 text-white font-semibold text-sm rounded-full shadow-glow-sm transition-colors"
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={handleCreateAccount}
            className="w-full h-11 flex items-center justify-center bg-surface hover:bg-surface-hover border border-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 text-app font-semibold text-sm rounded-full transition-colors"
          >
            Create Account
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-9 flex items-center justify-center text-muted hover:text-app font-medium text-xs transition-colors focus-visible:outline-none focus-visible:underline"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
