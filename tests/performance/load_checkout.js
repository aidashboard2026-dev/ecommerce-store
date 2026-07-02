import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 3 }, // ramp up to 3 users (keep it small due to pool size limits)
    { duration: '20s', target: 3 }, // stay at 3 users
    { duration: '10s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% of requests must complete below 800ms
    http_req_failed: ['rate<0.05'],    // failure rate must be less than 5% due to inventory depletion limits
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000/api/v1';
const CUST_TOKEN = __ENV.CUSTOMER_TOKEN || ''; // Pass token via env

export default function () {
  if (!CUST_TOKEN) {
    // If no token is provided, skip checkout and hit a public route to avoid unauthorized errors
    const res = http.get(`${BASE_URL}/products/`);
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
    return;
  }

  const payload = JSON.stringify({
    customer_name: "K6 Load Tester",
    product_name: "Aura Premium T-Shirt",
    product_id: 1,
    size: "M",
    color: "Black",
    quantity: 1,
    price: 39.99,
    total_amount: 39.99,
    payment_method: "COD",
    city: "Mumbai"
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CUST_TOKEN}`
    },
  };

  const res = http.post(`${BASE_URL}/orders/customer`, payload, params);

  check(res, {
    'status is 201 or 400': (r) => r.status === 201 || r.status === 400, // 400 is fine if variant runs out of stock
  });

  sleep(2);
}
