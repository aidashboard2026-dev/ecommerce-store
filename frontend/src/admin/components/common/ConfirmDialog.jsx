import React from "react";
import Modal from "@/shared/components/ui/Modal";
import Button from "@/shared/components/ui/Button";
import { AlertTriangle, Info, Trash2, HelpCircle } from "lucide-react";

export default function ConfirmDialog({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // "danger" | "warning" | "info"
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const icons = {
    danger: <Trash2 className="text-rose-500 shrink-0" size={22} />,
    warning: <AlertTriangle className="text-amber-500 shrink-0" size={22} />,
    info: <Info className="text-sky-500 shrink-0" size={22} />,
  };

  const confirmVariants = {
    danger: "danger",
    warning: "primary",
    info: "primary",
  };

  return (
    <Modal isOpen={isOpen} size="sm">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-full bg-surface border border-app shrink-0 shadow-sm">
            {icons[variant] || <HelpCircle size={22} />}
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="text-sm font-bold text-app">{title}</h3>
            <p className="text-xs text-muted leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-app">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={confirmVariants[variant] || "primary"}
            size="sm"
            loading={isLoading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
