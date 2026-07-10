import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mail, Phone, MapPin as MapPinIcon, HelpCircle, Info, Shield, FileText, RotateCcw, MessageCircle } from 'lucide-react'
import clsx from 'clsx'
import useStoreSettings from '@/shared/hooks/useStoreSettings'

// NOTE: AuraStore did not previously have Contact/FAQ/About/Privacy/Terms/
// Returns pages anywhere in the app (the footer had inert "Privacy Policy"
// / "Terms of Use" buttons with no destination). This page is new — built
// to satisfy the target architecture's SupportPage.jsx — and uses
// reasonable placeholder copy rather than inventing specific legal or
// policy claims that aren't backed by real business decisions. Replace the
// placeholder text with real content when it's ready.

function ContactUsSection({ settings }) {
  const supportEmail = settings?.support_email;
  const rawPhone = settings?.support_phone || "";
  // Normalize to +91XXXXXXXXXX regardless of how it's stored
  const supportPhone = rawPhone
    ? rawPhone.startsWith("+91")
      ? rawPhone
      : rawPhone.startsWith("91") && rawPhone.replace(/\D/g, "").length === 12
      ? `+${rawPhone.replace(/\D/g, "")}`
      : `+91${rawPhone.replace(/\D/g, "")}`
    : "";
  // Display as "+91 9876543210"
  const displayPhone = supportPhone
    ? `${supportPhone.slice(0, 3)} ${supportPhone.slice(3)}`
    : "";
  const storeLocation = settings?.store_location;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
        <h2 className="font-display font-bold text-lg text-app mb-4">Get in Touch</h2>
        <div className="flex flex-col gap-3 text-sm">
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} className="flex items-center gap-3 text-app hover:text-brand-500">
              <Mail size={16} className="text-brand-500" /> {supportEmail}
            </a>
          )}
          {displayPhone && (
            <a href={`tel:${supportPhone}`} className="flex items-center gap-3 text-app hover:text-brand-500">
              <Phone size={16} className="text-brand-500" /> {displayPhone}
            </a>
          )}
          {storeLocation && (
            <span className="flex items-start gap-3 text-app whitespace-pre-line">
              <MapPinIcon size={16} className="text-brand-500 mt-0.5" /> {storeLocation}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">
        Our support team typically responds within 24 hours on business days.
      </p>
    </div>
  )
}

function FAQSection() {
  const faqs = [
    { q: 'How do I track my order?', a: 'Use the Track Order page with your order number, or check My Orders if you\u2019re signed in.' },
    { q: 'What payment methods are accepted?', a: 'Cash on Delivery, UPI, cards, wallets, and net banking are available at checkout.' },
    { q: 'Can I cancel an order?', a: 'Orders that haven\u2019t shipped yet can be cancelled from My Orders.' },
    { q: 'Do you ship across India?', a: 'Yes, we currently ship to addresses across India.' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {faqs.map((item) => (
        <div key={item.q} className="bg-app border border-app rounded-2xl p-5">
          <p className="text-sm font-semibold text-app mb-1.5">{item.q}</p>
          <p className="text-sm text-muted leading-relaxed">{item.a}</p>
        </div>
      ))}
    </div>
  )
}

function AboutUsSection({ settings }) {
  const storeName = import.meta.env.VITE_STORE_NAME || "My Designers";
  const description = settings?.description || "";
  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-app mb-3">About {storeName}</h2>
      {description && (
        <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
          {description}
        </p>
      )}
    </div>
  )
}

function PrivacyPolicySection() {
  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-app mb-3">Privacy Policy</h2>
      <p className="text-sm text-muted leading-relaxed">
        This section will outline how we collect, use, and protect your personal information.
        Full policy details are being finalized — for any privacy-related questions in the
        meantime, please reach out to our support team.
      </p>
    </div>
  )
}

function TermsSection() {
  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-app mb-3">Terms of Use</h2>
      <p className="text-sm text-muted leading-relaxed">
        This section will outline the terms that govern your use of AuraStore. Full terms are
        being finalized — contact support if you have questions before then.
      </p>
    </div>
  )
}

function ReturnsSection() {
  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-app mb-3">Returns &amp; Exchanges</h2>
      <p className="text-sm text-muted leading-relaxed">
        Our detailed return and exchange policy is being finalized. For now, please contact our
        support team about returns or exchanges for your order, and we'll guide you through it.
      </p>
    </div>
  )
}

const TABS = [
  { key: 'contact', label: 'Contact Us', icon: MessageCircle, path: '/support', Component: ContactUsSection },
  { key: 'faq', label: 'FAQ', icon: HelpCircle, path: '/support/faq', Component: FAQSection },
  { key: 'about', label: 'About Us', icon: Info, path: '/support/about', Component: AboutUsSection },
  { key: 'privacy', label: 'Privacy Policy', icon: Shield, path: '/support/privacy', Component: PrivacyPolicySection },
  { key: 'terms', label: 'Terms', icon: FileText, path: '/support/terms', Component: TermsSection },
  { key: 'returns', label: 'Returns', icon: RotateCcw, path: '/support/returns', Component: ReturnsSection },
]

function activeTabFromPath(pathname) {
  const match = TABS.find((t) => t.key !== 'contact' && pathname.endsWith(`/${t.key}`))
  return match ? match.key : 'contact'
}

// Consolidated support/info page — folds Contact Us, FAQ, About Us, Privacy
// Policy, Terms, and Returns into one page with internal tab navigation.
export default function SupportPage() {
  const { settings } = useStoreSettings()
  const location = useLocation()
  const activeTab = activeTabFromPath(location.pathname)
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.Component || ContactUsSection

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-app mb-6">Support</h1>

      <div className="flex gap-2 mb-8 border-b border-app overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            to={tab.path}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted hover:text-app'
            )}
          >
            <tab.icon size={14} /> {tab.label}
          </Link>
        ))}
      </div>

      <ActiveComponent settings={settings} />
    </div>
  )
}
