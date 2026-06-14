# Ecommerce Store Platform

A production-ready full-stack Ecommerce Management Platform built with React, FastAPI, PostgreSQL, and Docker.

The platform ships two complete applications in a single codebase:

- **Customer Storefront** — public-facing shop with product browsing, cart, checkout, and order tracking
- **Admin Dashboard** — internal panel for managing products, orders, customers, offers, and banners

---

## Technology Stack

| Layer              | Technology                              |
| ------------------ | --------------------------------------- |
| Frontend           | React 18, Vite, Tailwind CSS            |
| State Management   | Redux Toolkit                           |
| Backend            | FastAPI (Python)                        |
| ORM                | SQLAlchemy 2.0                          |
| Database           | PostgreSQL 16                           |
| Authentication     | JWT (python-jose + bcrypt)              |
| API Client         | Axios                                   |
| Migrations         | Alembic                                 |
| Containerization   | Docker & Docker Compose                 |
| Charts & Analytics | Recharts                                |
| Icons              | Lucide React                            |
| Animations         | Lottie React                            |

---

## Quick Start (Docker — Recommended)

```bash
# 1. Clone or extract the project
cd ecommerce-store

# 2. Configure environment
cp .env.example .env
# Edit .env — set your SECRET_KEY, admin credentials, and database connection

# 3. Start all services (database + backend + frontend)
docker compose up --build

# 4. Open your browser
#    Storefront:  http://localhost:5173
#    Admin Panel: http://localhost:5173/admin
#    API Docs:    http://localhost:8000/docs
```

The backend seeds one superadmin account automatically using your `.env` values.

| Variable                | Purpose                              |
| ----------------------- | ------------------------------------ |
| `SECRET_KEY`            | JWT signing key (use a random hex)   |
| `INITIAL_ADMIN_NAME`    | Display name for the seed admin      |
| `INITIAL_ADMIN_EMAIL`   | Login email for the seed admin       |
| `INITIAL_ADMIN_PASSWORD`| Login password for the seed admin    |
| `POSTGRES_SERVER`       | PostgreSQL host                      |
| `POSTGRES_PORT`         | PostgreSQL port (default: 5432)      |
| `POSTGRES_USER`         | Database user                        |
| `POSTGRES_PASSWORD`     | Database password                    |
| `POSTGRES_DB`           | Database name                        |

---

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example ../.env
# Edit ../.env with your database credentials and admin account

# Run database migrations
alembic upgrade head

# Start development server with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server with HMR
npm run dev
```

### Database Only (via Docker)

```bash
# Start just PostgreSQL if you want to run backend locally
docker compose up db -d
```

---

## Project Structure

```
ecommerce-store/
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── alembic/                        # Database migrations
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py             # Admin login, customer login, signup, /me
│   │   │   │   ├── admins.py           # Admin user CRUD
│   │   │   │   ├── products.py         # Product & variant management
│   │   │   │   ├── orders.py           # Admin & customer order endpoints
│   │   │   │   ├── customers.py        # Customer management & self-service
│   │   │   │   ├── offers.py           # Discount offer management
│   │   │   │   ├── banners.py          # Storefront banner management
│   │   │   │   └── dashboard.py        # Stats, charts, activity feed
│   │   │   └── router.py
│   │   ├── auth/
│   │   │   └── dependencies.py         # JWT bearer — get_current_admin / get_current_customer
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic settings (reads .env)
│   │   │   └── security.py             # JWT creation + bcrypt utilities
│   │   ├── database/
│   │   │   ├── base.py                 # SQLAlchemy DeclarativeBase
│   │   │   ├── session.py              # Engine + SessionLocal
│   │   │   └── init_db.py              # Seed superadmin from .env
│   │   ├── models/                     # SQLAlchemy ORM models
│   │   │   ├── admin.py
│   │   │   ├── customer.py
│   │   │   ├── product.py
│   │   │   ├── order.py
│   │   │   ├── offer.py
│   │   │   └── banner.py
│   │   ├── schemas/                    # Pydantic request / response schemas
│   │   │   ├── auth.py
│   │   │   ├── admin.py
│   │   │   ├── customer.py
│   │   │   ├── product.py
│   │   │   ├── order.py
│   │   │   ├── offer.py
│   │   │   └── banner.py
│   │   ├── services/                   # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── admin_service.py
│   │   │   ├── product_service.py
│   │   │   ├── order_service.py
│   │   │   └── customer_service.py
│   │   └── main.py                     # FastAPI app entry point + CORS + lifespan
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── common/                 # Modal, Badge, Spinner
    │   │   ├── layout/                 # Header, PageHeader
    │   │   ├── dashboard/              # StatCard, SalesDashboard, OrderStatusAnalytics
    │   │   ├── customers/              # CustomerTable, CustomerDrawer, CustomerFilters, etc.
    │   │   ├── products/               # InlineProductForm, VariantFormModal, ImageUploadModal
    │   │   └── storefront/             # Customer-facing components (3 modules)
    │   │       ├── product/
    │   │       │   ├── components/     # ProductCard, ProductGrid, ProductFilters,
    │   │       │   │                   # HeroSection, OfferBanner, CategorySection
    │   │       │   ├── hooks/          # useProducts (React Query)
    │   │       │   └── pages/          # ProductHome, ProductsPage, ProductDetails
    │   │       ├── cart/
    │   │       │   ├── components/     # CartItem, CartSummary, CouponSection
    │   │       │   └── pages/          # CartPage
    │   │       └── order/
    │   │           ├── components/     # CheckoutForm, PaymentSection, OrderTimeline
    │   │           ├── hooks/          # useOrders (React Query)
    │   │           └── pages/          # CheckoutPage, PaymentPage, OrdersPage, OrderDetailsPage
    │   ├── layouts/
    │   │   ├── MainLayout.jsx          # Admin shell — sidebar + header + outlet
    │   │   └── StorefrontLayout.jsx    # Storefront shell — navbar + footer
    │   ├── pages/
    │   │   ├── AdminPage/
    │   │   │   ├── LoginPage.jsx
    │   │   │   ├── SignupPage.jsx
    │   │   │   ├── DashboardPage.jsx
    │   │   │   ├── ProductsPage.jsx
    │   │   │   ├── OrdersPage.jsx
    │   │   │   ├── CustomersPage.jsx
    │   │   │   ├── OffersPage.jsx
    │   │   │   ├── BannerPage.jsx
    │   │   │   └── SettingsPage.jsx
    │   │   └── StoreFront/
    │   │       ├── HomePage.jsx
    │   │       ├── ProductsPage.jsx
    │   │       ├── ProductDetailsPage.jsx
    │   │       ├── CartPage.jsx
    │   │       ├── CheckoutPage.jsx
    │   │       ├── PaymentPage.jsx
    │   │       ├── CustomerLoginPage.jsx
    │   │       ├── CustomerSignupPage.jsx
    │   │       ├── CustomerProfilePage.jsx
    │   │       ├── WishlistPage.jsx
    │   │       └── TrackingPage.jsx
    │   ├── routes/
    │   │   └── AppRoutes.jsx           # All routes — admin + storefront + protected guards
    │   ├── store/
    │   │   ├── store.js                # Redux store (7 slices)
    │   │   ├── authSlice.js            # Admin auth state + thunks
    │   │   ├── customerSlice.js        # Customer auth state + thunks
    │   │   ├── cartSlice.js            # Cart items + coupon + totals (localStorage)
    │   │   ├── wishlistSlice.js        # Wishlist items (localStorage)
    │   │   ├── checkoutStore.js        # Address, payment method, last order
    │   │   ├── themeSlice.js           # Dark / light mode
    │   │   └── uiSlice.js              # Sidebar + modal state
    │   ├── services/
    │   │   ├── api.js                  # Axios instance + authAPI + storefrontAPI
    │   │   └── storefront/
    │   │       ├── productsService.js
    │   │       ├── cartService.js
    │   │       └── ordersService.js
    │   ├── utils/
    │   │   └── productUtils.js         # getImageUrl, formatPrice, useDebounce
    │   ├── App.jsx
    │   └── main.jsx
    ├── tailwind.config.js
    ├── vite.config.js
    └── Dockerfile
```

---

## Features

### Storefront (Customer-Facing)

#### Product Discovery
- Home page with hero banner, category section, and offer banners
- Featured products, new arrivals, and best sellers sections
- Product listing with infinite scroll
- Search, sort, collection filter, price range filter, stock filter
- Product detail page with image gallery, zoom, and color / size variant selection
- Wishlist (persisted in localStorage)

#### Cart & Checkout
- Guest cart with full localStorage persistence
- Quantity management, per-line removal, cart clear
- Coupon code support — demo codes: `WELCOME10`, `SAVE20`, `AURA50`
- Shipping calculation (free over ₹999, flat ₹79 otherwise)
- 5% GST tax calculation
- Saved delivery addresses (persisted in localStorage)
- Payment methods: Cash on Delivery, UPI, Card, Wallet, Net Banking

#### Orders & Account
- Customer signup and login (separate JWT session from admin)
- Place orders with automatic stock decrement
- Order history with expand / collapse cards
- Order status timeline: Placed → Processing → Shipped → Delivered
- Cancel orders (blocked after shipping)
- Public order tracking by order number
- Customer profile update (name, phone)

---

### Admin Dashboard

#### Analytics
- Revenue, order count, customer count, and product stats
- Monthly sales and revenue charts (Recharts)
- Order status breakdown analytics
- Customer spending analytics
- Recent activity feed

#### Product Management
- Create, update, and delete products
- Product variants (size + color + SKU + price + stock)
- Image upload (multiple images per product)
- Product status management (draft / published / archived)
- Collection / category assignment
- Inventory tracking per variant
- Featured product toggle

#### Order Management
- View all customer orders
- Update order status and tracking status
- Payment status management
- Filter and search orders
- Revenue analytics per order

#### Customer Management
- Customer list with search and status filters
- Customer profile drawer with full order history and spend analytics
- Activate / deactivate customers
- Add notes and tags to customer profiles
- Customer creation (admin-side)

#### Offer & Banner Management
- Create time-limited discount offers with percentage values
- Publish / unpublish offers with date and time scheduling
- Upload offer banner images
- Manage storefront banners with sort order and placement

---

## Storefront Routes

| Route                  | Page                   | Auth         |
| ---------------------- | ---------------------- | ------------ |
| `/`                    | Home                   | Public       |
| `/products`            | Product Listing        | Public       |
| `/products/:slug`      | Product Detail         | Public       |
| `/cart`                | Shopping Cart          | Public       |
| `/auth/login`          | Customer Login         | Public only  |
| `/auth/signup`         | Customer Signup        | Public only  |
| `/checkout`            | Checkout               | Customer JWT |
| `/payment`             | Payment                | Customer JWT |
| `/orders`              | Order History          | Customer JWT |
| `/orders/:id`          | Order Detail           | Customer JWT |
| `/profile`             | Customer Profile       | Customer JWT |
| `/wishlist`            | Wishlist               | Public       |
| `/tracking`            | Order Tracking         | Public       |

## Admin Routes

| Route                  | Page                   | Auth         |
| ---------------------- | ---------------------- | ------------ |
| `/admin/login`         | Admin Login            | Public only  |
| `/admin/dashboard`     | Dashboard              | Admin JWT    |
| `/admin/products`      | Products               | Admin JWT    |
| `/admin/orders`        | Orders                 | Admin JWT    |
| `/admin/customers`     | Customers              | Admin JWT    |
| `/admin/offers`        | Offers                 | Admin JWT    |
| `/admin/banners`       | Banners                | Admin JWT    |
| `/admin/settings`      | Settings               | Admin JWT    |

---

## API Reference

All endpoints are prefixed with `/api/v1`.
Full interactive documentation is available at **http://localhost:8000/docs**

### Authentication

| Method | Endpoint                  | Description                     | Auth         |
| ------ | ------------------------- | ------------------------------- | ------------ |
| POST   | `/auth/login`             | Admin login — returns JWT       | No           |
| GET    | `/auth/me`                | Get current admin               | Admin JWT    |
| POST   | `/auth/logout`            | Admin logout                    | Admin JWT    |
| POST   | `/auth/signup`            | Customer signup                 | No           |
| POST   | `/auth/customer/login`    | Customer login — returns JWT    | No           |
| GET    | `/auth/customer/me`       | Get current customer            | Customer JWT |

### Products

| Method | Endpoint                          | Description                     | Auth         |
| ------ | --------------------------------- | ------------------------------- | ------------ |
| GET    | `/products/`                      | List products (paginated, filterable) | Public  |
| GET    | `/products/slug/{slug}`           | Get product by slug             | Public       |
| POST   | `/products/admin`                 | Create product                  | Admin JWT    |
| GET    | `/products/admin`                 | List products (admin view)      | Admin JWT    |
| PATCH  | `/products/admin/{id}`            | Update product                  | Admin JWT    |
| DELETE | `/products/admin/{id}`            | Delete product                  | Admin JWT    |
| POST   | `/products/admin/{id}/variants`   | Add variant                     | Admin JWT    |
| POST   | `/products/admin/{id}/publish`    | Publish product                 | Admin JWT    |
| DELETE | `/products/admin/{id}/variants/{vid}` | Delete variant              | Admin JWT    |
| POST   | `/products/admin/{id}/images`     | Upload images                   | Admin JWT    |
| DELETE | `/products/admin/images/{id}`     | Delete product image            | Admin JWT    |

### Orders

| Method | Endpoint                          | Description                     | Auth         |
| ------ | --------------------------------- | ------------------------------- | ------------ |
| GET    | `/orders/`                        | List all orders                 | Admin JWT    |
| POST   | `/orders/`                        | Create order (admin)            | Admin JWT    |
| GET    | `/orders/{id}`                    | Get order                       | Admin JWT    |
| PUT    | `/orders/{id}`                    | Update order                    | Admin JWT    |
| POST   | `/orders/{id}/cancel`             | Cancel order (admin)            | Admin JWT    |
| PUT    | `/orders/{id}/tracking`           | Update tracking status          | Admin JWT    |
| POST   | `/orders/customer`                | Place order (customer)          | Customer JWT |
| GET    | `/orders/customer/all`            | Customer's own orders           | Customer JWT |
| GET    | `/orders/customer/{id}`           | Customer's order detail         | Customer JWT |
| POST   | `/orders/customer/{id}/cancel`    | Customer cancel order           | Customer JWT |
| GET    | `/orders/track/{order_number}`    | Public order tracking           | Public       |

### Customers

| Method | Endpoint                          | Description                     | Auth         |
| ------ | --------------------------------- | ------------------------------- | ------------ |
| GET    | `/customers/`                     | List customers (paginated)      | Admin JWT    |
| GET    | `/customers/analytics`            | Customer analytics              | Admin JWT    |
| POST   | `/customers/`                     | Create customer                 | Admin JWT    |
| GET    | `/customers/{id}`                 | Get customer                    | Admin JWT    |
| GET    | `/customers/{id}/profile`         | Full profile with order history | Admin JWT    |
| PUT    | `/customers/{id}`                 | Update customer                 | Admin JWT    |
| PATCH  | `/customers/{id}/status`          | Toggle active/inactive          | Admin JWT    |
| PATCH  | `/customers/{id}/notes`           | Update customer notes           | Admin JWT    |
| PATCH  | `/customers/{id}/tags`            | Update customer tags            | Admin JWT    |
| PUT    | `/customers/profile/update`       | Customer self-update            | Customer JWT |

### Offers

| Method | Endpoint                | Description             | Auth         |
| ------ | ----------------------- | ----------------------- | ------------ |
| GET    | `/offers/active/all`    | Get active offers       | Public       |
| GET    | `/offers/`              | List all offers         | Admin JWT    |
| POST   | `/offers/`              | Create offer            | Admin JWT    |
| GET    | `/offers/{id}`          | Get offer               | Admin JWT    |
| PUT    | `/offers/{id}`          | Update offer            | Admin JWT    |
| PATCH  | `/offers/{id}`          | Partial update          | Admin JWT    |
| DELETE | `/offers/{id}`          | Delete offer            | Admin JWT    |

### Banners

| Method | Endpoint                | Description             | Auth         |
| ------ | ----------------------- | ----------------------- | ------------ |
| GET    | `/banners/active/all`   | Get active banners      | Public       |
| GET    | `/banners/`             | List all banners        | Admin JWT    |
| POST   | `/banners/`             | Create banner           | Admin JWT    |
| GET    | `/banners/{id}`         | Get banner              | Admin JWT    |
| PATCH  | `/banners/{id}`         | Update banner           | Admin JWT    |
| PUT    | `/banners/{id}/toggle`  | Toggle active/inactive  | Admin JWT    |
| DELETE | `/banners/{id}`         | Delete banner           | Admin JWT    |

### Dashboard

| Method | Endpoint                         | Description            | Auth      |
| ------ | -------------------------------- | ---------------------- | --------- |
| GET    | `/dashboard/stats`               | KPI metrics            | Admin JWT |
| GET    | `/dashboard/chart-data`          | Monthly chart data     | Admin JWT |
| GET    | `/dashboard/recent-activity`     | Activity feed          | Admin JWT |

---

## State Management

The Redux store contains 7 slices:

| Slice            | Purpose                                          | Persisted        |
| ---------------- | ------------------------------------------------ | ---------------- |
| `auth`           | Admin JWT session, login/logout thunks           | localStorage     |
| `customer`       | Customer JWT session, login/signup/me thunks     | localStorage     |
| `cart`           | Cart items, coupon, price totals                 | localStorage     |
| `wishlist`       | Wishlisted product IDs + metadata                | localStorage     |
| `checkout`       | Saved addresses, payment method, last order      | localStorage     |
| `theme`          | Dark / light mode preference                     | localStorage     |
| `ui`             | Sidebar open/close, modal state                  | Session only     |

---

## Cart Pricing Logic

| Component      | Rule                                               |
| -------------- | -------------------------------------------------- |
| Subtotal       | `Σ (selling_price × quantity)` per line            |
| Coupon         | Percentage discount applied to subtotal            |
| Shipping       | Free when subtotal ≥ ₹999, otherwise flat ₹79      |
| Tax            | 5% GST on discounted subtotal                      |
| **Total**      | Discounted subtotal + shipping + tax               |

Demo coupon codes: `WELCOME10` (10% off), `SAVE20` (20% off), `AURA50` (50% off)

---

## Order Status Flow

```
PLACED → PROCESSING → SHIPPED → DELIVERED
                              ↘ CANCELLED  (blocked once SHIPPED or DELIVERED)
```

---

## Production Deployment

Generate a strong secret key before deploying:

```bash
openssl rand -hex 32
```

Update your `.env`:

```env
SECRET_KEY=<your-generated-key>
POSTGRES_PASSWORD=<strong-password>
AUTH_COOKIE_SECURE=true
```

Build the frontend for production:

```bash
cd frontend && npm run build
```

For production hosting, add an Nginx reverse proxy to the `docker-compose.yml` to serve the frontend build statically and proxy `/api` requests to the FastAPI backend.

---

## License

MIT — free for personal and commercial use.