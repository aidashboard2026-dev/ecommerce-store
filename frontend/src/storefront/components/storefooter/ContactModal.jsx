import React from "react";
import { X } from "lucide-react";

export default function ContactModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  loading,
}) {
  if (!open) return null;

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-end  p-1"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}

        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Contact Us</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              disabled={loading}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              disabled={loading}
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              required
              disabled={loading}
              value={form.subject}
              onChange={(e) => updateField("subject", e.target.value)}
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-700">Message</label>
              <span className={`text-xs font-mono ${(form.message || "").length >= 5000 ? "text-red-500 font-bold" : "text-gray-400"}`}>
                {(form.message || "").length} / 5000
              </span>
            </div>
            <textarea
              rows={3}
              required
              maxLength={5000}
              disabled={loading}
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-400 transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-black border border-black px-6 py-2 text-white hover:bg-gray-900 disabled:opacity-60 transition flex items-center justify-center gap-2 min-w-[130px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
