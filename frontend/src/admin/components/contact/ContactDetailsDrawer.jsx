/**
 * frontend/src/admin/components/contact/ContactDetailsDrawer.jsx
 * 
 * Right-side drawer showing detailed contact message information.
 * Displays customer details, message content, and action buttons.
 */

import React from 'react';
import { X, Mail, Clock, Tag } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    New: { bg: 'bg-blue-100', text: 'text-blue-800', label: '🆕 New' },
    Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏳ Pending' },
    Replied: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Replied' },
    Closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: '✓ Closed' },
  };

  const config = statusConfig[status] || statusConfig.New;

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default function ContactDetailsDrawer({
  open,
  onClose,
  message,
  onReply,
  onDelete,
  onStatusChange,
  loading,
}) {
  if (!open || !message) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 inset-y-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600">
          <h2 className="text-xl font-semibold text-white">Message Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/20 text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex-row flex gap-3 items-center">
              <Tag size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Status</p>
                <StatusBadge status={message.status} />
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-5">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Customer Information</p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Name</p>
                  <p className="text-sm font-medium text-gray-900">{message.name}</p>
                </div>

                <div className="flex items-start gap-2">
                  <Mail size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <a
                      href={`mailto:${message.email}`}
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {message.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Subject</p>
              <p className="text-base font-medium text-gray-900 py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
                {message.subject}
              </p>
            </div>

            {/* Message Content */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Message</p>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap break-words">
                {message.message}
              </div>
            </div>

            {/* Admin Reply (if exists) */}
            {message.admin_reply && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Admin Reply</p>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {message.admin_reply}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Timeline</p>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="h-8 w-0.5 bg-gray-300"></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Created</p>
                    <p className="text-xs text-gray-500">{formatDate(message.created_at)}</p>
                  </div>
                </div>

                {message.replied_at && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Replied</p>
                      <p className="text-xs text-gray-500">{formatDate(message.replied_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-gray-50 px-6 py-4 flex gap-3">
          {message.status !== 'Replied' && message.status !== 'Closed' && (
            <button
              onClick={onReply}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {loading ? 'Processing...' : '💬 Reply'}
            </button>
          )}

          <button
            onClick={onDelete}
            disabled={loading}
            className="flex-1 bg-red-100 hover:bg-red-200 disabled:bg-gray-200 text-red-700 font-medium py-2 px-4 rounded-lg transition"
          >
            {loading ? 'Processing...' : '🗑️ Delete'}
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
