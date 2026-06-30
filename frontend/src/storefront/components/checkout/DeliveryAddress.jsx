import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Check, MapPin, Plus } from "lucide-react";
import clsx from "clsx";
import {
  addAddress,
  removeAddress,
  selectAddress,
  selectSelectedAddress,
} from "@/storefront/store/checkoutStore";

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

const DELIVERY_FIELDS = [
  "full_name",
  "phone",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "pincode",
];

export default function DeliveryAddress({ form, setForm, update }) {
  const dispatch = useDispatch();
  const addresses = useSelector((state) => state.checkout.addresses);
  const selectedAddress = useSelector(selectSelectedAddress);
  const [showForm, setShowForm] = useState(addresses.length === 0);

  const handleSave = (event) => {
    event.preventDefault();

    dispatch(
      addAddress({
        full_name: form.full_name,
        phone: form.phone,
        address_line1: form.address_line1,
        address_line2: form.address_line2,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      }),
    );

    setForm((current) =>
      DELIVERY_FIELDS.reduce(
        (next, field) => ({
          ...next,
          [field]: "",
        }),
        current,
      ),
    );
    setShowForm(false);
  };

  return (
    <div className="bg-app border border-app rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
      <h2 className="font-display font-bold text-lg text-app flex items-center gap-2">
        <MapPin size={18} /> Delivery Address
      </h2>

      {addresses.length > 0 && (
        <div className="flex flex-col gap-3">
          {addresses.map((addr) => {
            const addressLine1 = addr.address_line1 || addr.address || "";

            return (
              <div
                key={addr.id}
                role="button"
                tabIndex={0}
                onClick={() => dispatch(selectAddress(addr.id))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    dispatch(selectAddress(addr.id));
                  }
                }}
                className={clsx(
                  "text-left border rounded-xl p-4 transition-colors relative cursor-pointer",
                  selectedAddress?.id === addr.id
                    ? "border-brand-500 bg-brand-500/5"
                    : "border-app hover:border-brand-500/50",
                )}
              >
                {selectedAddress?.id === addr.id && (
                  <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                    <Check size={12} />
                  </span>
                )}
                <p className="text-sm font-semibold text-app">
                  {addr.full_name}
                </p>
                <p className="text-xs text-muted mt-1">
                  {addressLine1}
                  {addr.address_line2 ? `, ${addr.address_line2}` : ""},{" "}
                  {addr.city}, {addr.state} - {addr.pincode}
                </p>
                <p className="text-xs text-muted mt-1">Phone: {addr.phone}</p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatch(removeAddress(addr.id));
                  }}
                  className="text-[11px] text-red-500 mt-2 hover:underline"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-500 hover:text-brand-600"
        >
          <Plus size={16} /> Add New Address
        </button>
      ) : (
        <form
          onSubmit={handleSave}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <input
            required
            autoComplete="name"
            placeholder="Full Name"
            value={form.full_name}
            onChange={update("full_name")}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2"
          />
          <input
            required
            autoComplete="tel"
            type="tel"
            placeholder="Phone Number"
            value={form.phone}
            onChange={update("phone")}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2"
          />
          <textarea
            required
            rows={4}
            autoComplete="street-address"
            placeholder="House No, Building Name, Street, Area"
            value={form.address_line1}
            onChange={update("address_line1")}
            className="bg-surface border border-app rounded-xl py-3 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2 resize-none min-h-[110px]"
          />
          {/* <input
            autoComplete="address-line2"
            placeholder="Address Line 2 (optional)"
            value={form.address_line2}
            onChange={update("address_line2")}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2"
          /> */}
          <input
            required
            autoComplete="address-level2"
            placeholder="City"
            value={form.city}
            onChange={update("city")}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted"
          />
          <select
            required
            autoComplete="address-level1"
            value={form.state}
            onChange={update("state")}
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
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
            autoComplete="postal-code"
            placeholder="Pincode"
            value={form.pincode}
            onChange={update("pincode")}
            pattern="\d{4,10}"
            className="bg-surface border border-app rounded-xl py-2.5 px-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted sm:col-span-2"
          />

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-2.5 rounded-full transition-colors"
            >
              Save Address
            </button>
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 border border-app rounded-full text-sm font-semibold text-app hover:bg-surface"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
