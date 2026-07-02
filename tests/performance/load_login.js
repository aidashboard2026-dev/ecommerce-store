import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 5 }, // ramp up to 5 users
    { duration: '20s', target: 5 }, // stay at 5 users
    { duration: '10s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],    // failure rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000/api/v1';

export default function () {
  const payload = JSON.stringify({
    email: `customer_${Math.floor(Math.random() * 100)}@example.com`,
    password: 'password123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Simulating customer login attempt
  const res = http.post(`${BASE_URL}/auth/customer/login`, payload, params);

  check(res, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'transaction time OK': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
