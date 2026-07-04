// src/storefront/pages/ReturnsPolicy.jsx
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  IndianRupee,
  PackageSearch,
  Ban,
  RefreshCcw,
  Truck,
  Wallet,
  Palette,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

const Section = ({ icon: Icon, title, children }) => (
  <div className="rounded-2xl border border-app bg-card p-6 shadow-sm">
    <div className="mb-5 flex items-center gap-3">
      <div className="rounded-xl bg-brand-500/10 p-3">
        <Icon className="h-6 w-6 text-brand-500" />
      </div>

      <h2 className="text-xl font-semibold text-app">{title}</h2>
    </div>

    {children}
  </div>
);

export default function ReturnsPolicy() {
     const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero */}

      <div className="mb-10 rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-800 p-10 text-white">
        <Link
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
        >
          <ArrowLeft size={18} />
          Back to Shopping
        </Link>

        <h1 className="text-5xl font-bold">Return Policy</h1>

        <p className="mt-4 max-w-2xl text-lg text-zinc-300">
          We are committed to making your shopping experience simple,
          transparent and hassle-free.
        </p>
      </div>

      <div className="grid gap-8">
        <Section
          icon={ShieldCheck}
          title="5-Day Hassle-Free Returns & Exchanges"
        >
          <ul className="space-y-3 text-muted-foreground">
            <li>• Return request must be raised within 5 days of delivery.</li>
            <li>• Our customer support team is always available to help.</li>
            <li>• Exchanges are completely free.</li>
          </ul>
        </Section>

        <Section icon={IndianRupee} title="Return & Refund Convenience Fee">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-app p-6">
              <h3 className="text-3xl font-bold text-app">₹100</h3>

              <p className="mt-2 text-muted-foreground">
                Flat fee for returned goods below ₹2,000.
              </p>
            </div>

            <div className="rounded-xl border border-app p-6">
              <h3 className="text-3xl font-bold text-app">5%</h3>

              <p className="mt-2 text-muted-foreground">
                For returned goods above ₹2,000.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-yellow-500 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 text-yellow-600" />

              <p>
                Convenience fee is deducted only for refunds. Exchanges remain
                completely FREE.
              </p>
            </div>
          </div>
        </Section>

        <Section icon={PackageSearch} title="Damaged, Defective or Wrong Items">
          <ul className="space-y-3 text-muted-foreground">
            <li>• Inspect your order immediately.</li>
            <li>• Record an unboxing video.</li>
            <li>• Share Order ID & registered email.</li>
            <li>• Contact support immediately.</li>
          </ul>
        </Section>

        <Section icon={Ban} title="Cancellation Policy">
          <ul className="space-y-3 text-muted-foreground">
            <li>• Orders can be cancelled only before 11:00 AM.</li>
            <li>• 100% refund before dispatch.</li>
            <li>• No cancellation after dispatch.</li>
            <li>• Late cancellation follows return policy.</li>
          </ul>
        </Section>

        <Section icon={RefreshCcw} title="Conditions for Returns & Exchanges">
          <ul className="space-y-3 text-muted-foreground">
            <li>• Product must be unused.</li>

            <li>• Original tags & invoice required.</li>

            <li>• Made-to-Order items cannot be returned.</li>

            <li>• Replacement depends on stock availability.</li>

            <li>• Second exchange request costs ₹150.</li>
          </ul>
        </Section>

        <Section icon={Truck} title="Return Pick-up Process">
          <ul className="space-y-3 text-muted-foreground">
            <li>• Pickup arranged within 24 business hours.</li>
            <li>• Pickup attempted twice.</li>
            <li>• Self-shipping required if pickup fails.</li>
            <li>• Depends on pincode availability.</li>
          </ul>
        </Section>

        <Section icon={Wallet} title="Refund Timeline">
          <ul className="space-y-3 text-muted-foreground">
            <li>• Cancellation Refund: 2–3 business days.</li>
            <li>• Return Refund after quality inspection.</li>
            <li>• Complete process may take up to 14 days.</li>
          </ul>
        </Section>

        <Section icon={Palette} title="Colour Variation Disclaimer">
          <p className="text-muted-foreground leading-7">
            Product colours may vary slightly because of screen settings,
            photography lighting and fabric dyeing processes. Such variations
            are natural and are not considered manufacturing defects.
          </p>
        </Section>

        <Section icon={AlertTriangle} title="Important Notes">
          <ul className="space-y-3 text-muted-foreground">
            <li>• Do not return products without confirmation email.</li>

            <li>• Return with original label.</li>

            <li>
              • Customer is responsible until warehouse receives the parcel.
            </li>

            <li>• Wrong product returns may lead to claim rejection.</li>

            <li>• Policies may change without prior notice.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
