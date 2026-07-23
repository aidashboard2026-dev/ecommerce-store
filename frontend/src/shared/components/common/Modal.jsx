import React, { useCallback, useEffect } from "react";

import { X } from "lucide-react";
import clsx from "clsx";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  contentClassName = "",
  isLoading = false,
  preventClose = false,
}) {
  const isLocked = isLoading || preventClose;

  // Lock page scroll when Modal is open
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Escape key closes modal unless locked during active saving
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape" && !isLocked && onClose) {
        onClose();
      }
    },
    [onClose, isLocked],
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background overlay */}
      <div
        className="absolute inset-0 animate-fade-in bg-black/50"
        onClick={() => {
          if (!isLocked && onClose) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className={clsx(
          `
            relative flex w-full flex-col
            overflow-hidden rounded-2xl
            border border-app
            bg-white shadow-2xl
            animate-slide-up
            dark:bg-gray-900
          `,
          sizes[size],
        )}
        style={{
          maxHeight: "calc(100vh - 3rem)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal header */}
        <div
          className="
            flex flex-shrink-0
            items-center justify-between
            border-b border-app
            bg-white
            px-4 py-3
            dark:bg-gray-900
            sm:px-6 sm:py-4
          "
        >
          <h2
            id="modal-title"
            className="
              truncate
              font-display
              text-base
              font-bold
              text-app
              sm:text-lg
            "
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isLocked}
            className="
              flex h-8 w-8
              items-center justify-center
              rounded-xl
              text-muted
              transition-all
              hover:bg-surface
              hover:text-app
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal content */}
        <div
          className={clsx(
            `
              flex-1
              overflow-y-auto
              overscroll-contain
              bg-white
              p-4
              dark:bg-gray-900
              sm:p-6
            `,
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
