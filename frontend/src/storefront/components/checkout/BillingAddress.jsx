import React from "react";

const INDIAN_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "Rajasthan",
  "Uttar Pradesh",
  "West Bengal",
  "Punjab",
  "Haryana",
  "Bihar",
  "Madhya Pradesh",
];

export default function BillingAddress({ form, update }) {
  return (
    <div className=" space-y-5">
      <h2 className="text-lg font-semibold text-app">Billing Address</h2>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="billing"
            value="same"
            checked={form.billingType === "same"}
            onChange={update("billingType")}
          />
          <span className="text-sm text-app">Same as delivery address</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="billing"
            value="different"
            checked={form.billingType === "different"}
            onChange={update("billingType")}
          />
          <span className="text-sm text-app">
            Use a different billing address
          </span>
        </label>
      </div>

      {form.billingType === "different" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-app pt-5">
          <input
            required
            type="text"
            autoComplete="billing name"
            placeholder="Full Name"
            aria-label="Billing Full Name"
            value={form.billing_full_name}
            onChange={update("billing_full_name")}
            className="sm:col-span-2 rounded-xl border border-app bg-surface px-4 py-3 text-sm"
          />

          <input
            required
            type="tel"
            autoComplete="billing tel"
            placeholder="Phone Number"
            aria-label="Billing Phone Number"
            value={form.billing_phone}
            onChange={update("billing_phone")}
            className="sm:col-span-2 rounded-xl border border-app bg-surface px-4 py-3 text-sm"
          />

          <textarea
            required
            rows={4}
            autoComplete="street-address"
            placeholder="House No, Building Name, Street, Area"
            aria-label="Billing Address"
            value={form.billing_address}
            onChange={update("billing_address")}
            className="sm:col-span-2 rounded-xl border border-app bg-surface px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />

          <input
            required
            type="text"
            autoComplete="billing address-level2"
            placeholder="City"
            aria-label="Billing City"
            value={form.billing_city}
            onChange={update("billing_city")}
            className="rounded-xl border border-app bg-surface px-4 py-3 text-sm"
          />

          <select
            required
            autoComplete="billing address-level1"
            aria-label="Billing State"
            value={form.billing_state}
            onChange={update("billing_state")}
            className="rounded-xl border border-app bg-surface px-4 py-3 text-sm"
          >
            <option value="">Select State</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          <input
            required
            type="text"
            autoComplete="billing postal-code"
            placeholder="Pincode"
            aria-label="Billing Pincode"
            value={form.billing_pincode}
            onChange={update("billing_pincode")}
            pattern="\d{4,10}"
            className="sm:col-span-2 rounded-xl border border-app bg-surface px-4 py-3 text-sm"
          />
        </div>
      )}
    </div>
  );
}
