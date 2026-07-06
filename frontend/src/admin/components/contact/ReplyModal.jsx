/**
 * frontend/src/admin/components/contact/ReplyModal.jsx
 * 
 * Modal for admin to compose and send replies to contact messages.
 * Includes validation, character counter, and send functionality.
 */

import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

export default function ReplyModal({
  open,
  onClose,
  message,
  onSend,
  loading,
}) {
  const [replyText, setReplyText] = useState('');
  const maxChars = 5000;
  const charCount = replyText.length;
  const isValid = charCount > 0 && charCount <= maxChars;

  const handleSend = async () => {
    if (!isValid) return;
    await onSend(replyText);
    setReplyText('');
  };

  if (!open || !message) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600">
          <h2 className="text-xl font-semibold text-white">Reply to Message</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/20 text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* To Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-gray-600">{message.name}</span>
              <span className="text-gray-400 text-sm">&lt;{message.email}&gt;</span>
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-600">
              Re: {message.subject}
            </div>
          </div>

          {/* Original Message Preview */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">Original Message</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-3">
              {message.message}
            </p>
          </div>

          {/* Reply Text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Your Reply</label>
              <span className={`text-xs font-medium ${charCount === maxChars ? 'text-red-500' : 'text-gray-500'}`}>
                {charCount} / {maxChars}
              </span>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value.slice(0, maxChars))}
              placeholder="Type your reply message here..."
              rows={6}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
            />
            {charCount > maxChars * 0.9 && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ You're approaching the character limit
              </p>
            )}
          </div>

          {/* Tips */}
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <p className="text-xs font-medium text-amber-900 mb-2">💡 Tips for great responses:</p>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
              <li>Be clear and concise</li>
              <li>Address the customer by name when appropriate</li>
              <li>Provide actionable solutions</li>
              <li>Include any relevant links or resources</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!isValid || loading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Reply
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
