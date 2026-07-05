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
            <label className="mb-1 block text-sm font-medium">Name</label>

            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>

            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Subject</label>

            <input
              type="text"
              value={form.subject}
              onChange={(e) => updateField("subject", e.target.value)}
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Message</label>

            <textarea
              rows={3}
              required
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-black "
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-2 md:px-5 md:py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-black border border-black px-6 py-2 text-white hover:bg-gray-900 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
