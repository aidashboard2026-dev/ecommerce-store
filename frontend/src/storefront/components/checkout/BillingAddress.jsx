import React from "react";

/*
 * NOTE: Billing address is intentionally not persisted.
 * The backend Order model and checkout payloads currently support only
 * a single delivery address.  A "same as delivery" notice is shown so
 * the customer knows their billing address = delivery address.
 *
 * Future enhancement: Add a billing_address table / JSON column to
 * the Order model and wire it into the checkout payload builders
 * (buildOrderPayload / buildCheckoutPayload in CheckoutPage.jsx).
 */

export default function BillingAddress() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-app">Billing Address</h2>
      <p className="text-sm text-muted">
        Billing address is the same as your delivery address.
      </p>
    </div>
  );
}
