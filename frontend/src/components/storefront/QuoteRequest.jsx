import React, { useState } from 'react'
import { MessageCircle, Send, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

// AuraStore's WhatsApp business number, reused from the storefront footer's
// existing published phone contact (+91 44 2817 9000) for consistency.
const WHATSAPP_NUMBER = '914428179000'

export default function QuoteRequest({ summaryLines, disabled }) {
  const [submitted, setSubmitted] = useState(false)

  // There's no backend endpoint for custom-quote requests yet, so — same
  // pattern as the rest of this page — submitting just confirms locally via
  // toast rather than calling an API that doesn't exist.
  const handleSubmit = () => {
    setSubmitted(true)
    toast.success("Quote request noted! We'll reach out to confirm pricing.")
  }

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi AuraStore, I'd like a quote for a custom order:\n\n${summaryLines.join('\n')}`
  )}`

  return (
    <div className="flex flex-col gap-3">
      {submitted && (
        <div className="flex items-center gap-2 text-sm font-semibold text-green-600 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} /> Quote request received — we'll follow up shortly.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 px-6 rounded-full shadow-glow-sm transition-colors"
        >
          <Send size={16} /> Request Quote
        </button>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 border border-green-500/40 text-green-600 hover:bg-green-500/10 font-semibold text-sm py-3 px-6 rounded-full transition-colors"
        >
          <MessageCircle size={16} /> WhatsApp Inquiry
        </a>
      </div>
    </div>
  )
}
