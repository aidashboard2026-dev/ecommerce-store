# AuraStore Quality Assurance & Testing Suite

This directory contains the complete modular testing suite for AuraStore. It is structured into distinct testing scopes: backend unit & integration tests (Pytest), frontend unit tests (Vitest), end-to-end tests (Playwright), security vulnerability tests, and performance load/stress tests.

---

## Directory Structure

```text
tests/
├── README.md                          # Testing suite documentation
├── pytest.ini                         # Pytest configuration
├── backend/                           # Backend Test Suite
│   ├── conftest.py                    # Pytest database & auth fixtures
│   ├── db/
│   │   ├── test_connection_pool.py    # Pool size limits & timeout asserts
│   │   ├── test_constraints.py        # Unique & check constraints tests
│   │   └── test_transactions.py       # Atomic rollback verification
│   ├── unit/
│   │   ├── test_models.py             # ORM properties & stock calculations
│   │   ├── test_schemas.py            # Pydantic validation checks
│   │   └── test_utils.py              # Password hashing & JWT utils
│   └── integration/
│       ├── test_admin_api.py          # Admin creation & permissions (Superadmin)
│       ├── test_auth_api.py           # Register, login, logout flows
│       ├── test_categories_api.py     # Category & collection management
│       ├── test_orders_api.py         # Customer vs admin placement, cancel actions
│       ├── test_payments_api.py       # Payment status transitions & refunds
│       ├── test_products_api.py       # Product CRUD & variant updates
│       └── test_settings_api.py       # Profile & business limits configurations
├── security/                          # Security Assessment Tests
│   ├── test_auth_bypass.py            # Access protection & route-guard checks
│   ├── test_file_upload_validation.py # Size, extension, & magic signature checks
│   ├── test_sql_injection.py          # Parameter injection validation
│   └── test_xss.py                    # Script payload isolation
├── performance/                       # Performance & Stress Tests
│   ├── db_pool_stress.py              # Threaded DB connection stress-testing
│   ├── load_checkout.js               # k6 order placement simulation
│   ├── load_login.js                  # k6 auth logins stress
│   └── load_product_list.js           # k6 query filters stress
├── frontend/                          # Frontend Unit Tests
│   ├── setupTests.ts                  # Vitest environment setup & mocks
│   └── unit/
│       ├── components/
│       │   └── CartSummary.test.jsx   # Order Summary render & click actions
│       ├── pages/
│       │   └── NotFoundPage.test.jsx  # 404 page navigation & UI items
│       └── redux/
│           └── cartSlice.test.js      # Redux actions, discount, & total calculations
└── e2e/                               # End-to-End Tests
    ├── playwright.config.ts           # Playwright E2E configuration
    ├── admin-dashboard.spec.ts        # Admin dashboard layout & page links
    ├── auth.spec.ts                   # Customer & Admin login flows
    ├── cart-and-checkout.spec.ts      # Storefront cart drawer & checkout E2E
    ├── order-tracking.spec.ts         # Guest order tracking timeline lookup
    ├── payment-flow.spec.ts           # Payment selection options E2E
    ├── product-crud.spec.ts           # Admin product forms & listings
    └── responsive.spec.ts             # Mobile layout adaptation checks
```

---

## Phase Execution Framework

The suite is designed for a phased rollout to ensure core stability before expanding test scenarios.

### Phase 0: Startup & DB Health
Validates baseline infrastructure configuration, database connection pools, table constraints, and transactional safety.
- Run database integrity and setup checks:
  ```bash
  pytest tests/backend/db/
  ```

### Phase 1: Critical Path Smoke Suite
Validates authentication, core catalog discovery, and storefront order placement workflows.
- Run unit & API integration checks:
  ```bash
  pytest tests/backend/unit/ tests/backend/integration/
  ```

### Phase 2: Complete Coverage & Security
Expands coverage to check edge-case CRUD, security header constraints, role isolation, and file-upload vulnerabilities.
- Run security test cases:
  ```bash
  pytest tests/security/
  ```

### Phase 3: Performance & Scale
Validates app responsiveness, load limits, and connection timeouts under high concurrent stress.
- Run DB pool stress script:
  ```bash
  python tests/performance/db_pool_stress.py
  ```

---

## How to Run the Tests

### Backend Unit, Integration, & Security Tests
Verify that your virtual environment is active and all dependencies are installed.
- Run all python test cases:
  ```bash
  pytest
  ```
- Run a specific file:
  ```bash
  pytest tests/backend/integration/test_orders_api.py
  ```

### Frontend Unit Tests
Frontend unit testing is managed using **Vitest**.
- Run tests in the frontend folder:
  ```bash
  cd frontend
  npm run test
  # or
  npx vitest run
  ```

### End-to-End Tests
End-to-End tests are managed using **Playwright**.
- Install Playwright browsers:
  ```bash
  npx playwright install
  ```
- Execute E2E tests:
  ```bash
  npx playwright test --config=tests/e2e/playwright.config.ts
  ```

### Performance (k6) Load Tests
Ensure [k6](https://k6.io) is installed on your local machine.
- Execute a k6 test script:
  ```bash
  k6 run tests/performance/load_product_list.js
  ```

---

## Skipped Features & Design Notes

1. **Server-side Cart Endpoints (`/cart`)**: 
   - **Note**: AuraStore does not currently have backend `/cart` routes. Cart state is managed entirely client-side using Redux and persist/sync through `localStorage`.
   - **Testing Approach**: Replaced backend cart integration testing with a comprehensive frontend unit test suite targeting `cartSlice.test.js` (actions, totals, discounts) and E2E specs verifying cart drawer flows.
   
2. **Third-Party Payment Gateways**:
   - **Note**: The backend doesn't implement a dedicated Stripe/PayPal endpoint router. Order payments are handled via payment options selected during order placement (e.g. COD or pending online payments).
   - **Testing Approach**: Verified payment-related behavior in `test_payments_api.py` by asserting order payment status transitions (PAID -> REFUNDED) and ensuring these trigger the expected backend logic.
