import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ContactSection({ form, update }) {
  const customer = useSelector((state) => state.customer.customer);
  const [newsletter, setNewsletter] = useState(false);

  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-app">Contact</h2>

        {!customer && (
          <Link
            to="/auth/login"
            className="text-sm font-medium text-brand-500 hover:underline"
          >
            Sign up / Log in
          </Link>
        )}
      </div>

      <label htmlFor="checkout-email" className="mb-2 block text-sm font-medium text-app">
        Email Address
      </label>

      <input
        required
        id="checkout-email"
        type="email"
        value={form.email}
        onChange={update("email")}
        autoComplete="email"
        placeholder="Enter your email"
        className="w-full rounded-xl border border-app bg-surface py-3 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
      />

      <div className="mt-4 flex items-center gap-3">
        <input
          id="newsletter"
          type="checkbox"
          checked={newsletter}
          onChange={(event) => setNewsletter(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />

        <label htmlFor="newsletter" className="text-sm text-app cursor-pointer">
          Email me with news and offers
        </label>
      </div>
    </div>
  );
}
