import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 }, // ramp up to 10 users
    { duration: '20s', target: 10 }, // stay at 10 users
    { duration: '10s', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests must complete below 300ms
    http_req_failed: ['rate<0.01'],    // failure rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000/api/v1';

export default function () {
  // Query product list with different filters (e.g. search, min_price)
  const filters = [
    '',
    '?search=shirt',
    '?min_price=10&max_price=100',
    '?sort_by=newest',
    '?category=clothing'
  ];
  
  const selectedFilter = filters[Math.floor(Math.random() * filters.length)];
  const res = http.get(`${BASE_URL}/products/${selectedFilter}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response body has items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items);
      } catch (e) {
        return false;
      }
    }
  });

  sleep(0.5);
}
