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
# Copy backend and frontend environment files from templates:
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit the files with your credentials (database, secrets, payment keys).
# For a full reference of every configuration variable, see docs/ENVIRONMENT_VARIABLES.md.

# 3. Start all services (database + backend + frontend)
docker compose up --build

# 4. Open your browser
#    Storefront:  http://localhost:5173
#    Admin Panel: http://localhost:5173/admin
#    API Docs:    http://localhost:8000/docs
```

The backend seeds one superadmin account automatically using your `.env` values.

---

## Environment Configuration & Reference

The platform decouples configuration by component:
- **Backend Configurations**: Managed in [backend/.env.example](file:///d:/freelance/ecommerce-store/backend/.env.example) and loaded by the `Settings` schema.
- **Frontend Configurations**: Managed in [frontend/.env.example](file:///d:/freelance/ecommerce-store/frontend/.env.example) and prefixed with `VITE_`.

For a complete detail on security classifications, client-editable switches, default values, and deployment checklists, please refer to the official [docs/ENVIRONMENT_VARIABLES.md](file:///d:/freelance/ecommerce-store/docs/ENVIRONMENT_VARIABLES.md) reference.

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

```text
ecommerce-store/
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── alembic/
│   ├── app/
│   │
│   │── main.py
│   │
│   ├── api/
│   │   ├── router.py
│   │   └── v1/
│   │       └── router.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   │
│   ├── shared/
│   │   ├── utils/
│   │   ├── storage/
│   │   │   └── supabase_storage.py
│   │   ├── dependencies/
│   │   ├── exceptions/
│   │   └── middleware/
│   │
│   ├── modules/
│   │
│   │   ├── auth/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   ├── dependencies.py
│   │   │   └── models.py
│   │   │
│   │   ├── admins/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py
│   │   │
│   │   ├── customers/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py
│   │   │
│   │   ├── products/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py
│   │   │
│   │   ├── orders/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py
│   │   │
│   │   ├── offers/
│   │   ├── banners/
│   │   ├── settings/
│   │   ├── delivery_zones/
│   │   ├── custom_products/
│   │   └── dashboard/
│   │
│   └── database/
│       ├── base.py
│       ├── session.py
│       └── init_db.py
│
│── requirements.txt
└── Dockerfile


frontend/
│
├── src/
│
├── admin/
│   ├── pages/
│   ├── components/
│   ├── layouts/
│   ├── routes/
│   ├── services/
│   ├── hooks/
│   └── store/
│
├── storefront/
│   ├── pages/
│   ├── components/
│   ├── layouts/
│   ├── routes/
│   ├── services/
│   ├── hooks/
│   └── store/
│
├── shared/
│   ├── components/
│   ├── assets/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── constants/
│   ├── data/
│   ├── routes/
│   └── store/
│
├── App.jsx
├── main.jsx
└── index.css

tailwind.config.js
vite.config.js
Dockerfile
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

| Route                       | Page                         | Auth         |
| ---------------------------- | ----------------------------- | ------------ |
| `/`                          | Home                          | Public       |
| `/products`                 | Product Listing               | Public       |
| `/products/:slug`           | Product Detail                | Public       |
| `/cart`                      | Shopping Cart                 | Public       |
| `/auth/login`                | Customer Login                | Public only  |
| `/auth/register`            | Customer Signup (canonical)   | Public only  |
| `/auth/signup`               | Customer Signup (legacy alias)| Public only  |
| `/auth/forgot-password`      | Password reset info           | Public only  |
| `/checkout`                  | Checkout                      | Customer JWT |
| `/payment`                   | Order Success (legacy alias)  | Customer JWT |
| `/orders`                    | Order History                 | Customer JWT |
| `/orders/success`           | Order Success                 | Customer JWT |
| `/orders/:id`                | Order Detail                  | Customer JWT |
| `/orders/:id/tracking`      | Order Detail (with tracking)  | Customer JWT |
| `/profile`                   | Customer Profile              | Customer JWT |
| `/profile/orders`           | Profile — Orders tab          | Customer JWT |
| `/profile/addresses`        | Profile — Addresses tab       | Customer JWT |
| `/profile/wishlist`         | Profile — Wishlist tab        | Customer JWT |
| `/profile/settings`         | Profile — Account Settings tab| Customer JWT |
| `/wishlist`                  | Wishlist                      | Public       |
| `/tracking`                  | Order Tracking (by number)    | Public       |
| `/custom`                    | Custom Orders — type selector | Public       |
| `/custom/:productType`      | Custom Orders — quote form    | Public       |
| `/support`                   | Support — Contact Us          | Public       |
| `/support/faq`               | Support — FAQ                 | Public       |
| `/support/about`             | Support — About Us            | Public       |
| `/support/privacy`           | Support — Privacy Policy      | Public       |
| `/support/terms`             | Support — Terms of Use        | Public       |
| `/support/returns`           | Support — Returns & Exchanges | Public       |
| `*` (unmatched)              | Not Found                     | Public       |

## Admin Routes

| Route                  | Page                   | Auth         |
| ---------------------- | ----------------------- | ------------ |
| `/admin/login`         | Admin Login            | Public only  |
| `/admin/dashboard`     | Dashboard              | Admin JWT    |
| `/admin/products`      | Products               | Admin JWT    |
| `/admin/orders`        | Orders                 | Admin JWT    |
| `/admin/customers`     | Customers              | Admin JWT    |
| `/admin/offers`        | Offers                 | Admin JWT    |
| `/admin/banners`       | Banners                | Admin JWT    |
| `/admin/settings`      | Settings               | Admin JWT    |


---

## WhatsApp Notification Integration

The platform includes full architectural support for **WhatsApp Notifications** (via Meta WhatsApp Cloud API) alongside Email notifications.

### Current Status
* **Database & API**: Fully supported. Database fields, schemas, and endpoints for toggling WhatsApp alerts are active.
* **Admin UI**: Fully functional. The Admin Settings page includes independent toggles for Email and WhatsApp per notification event.
* **Runtime Dispatcher**: The WhatsApp channel execution logic is temporarily disabled (messages are not sent) in `backend/app/shared/notifications/service.py` to prepare for future Meta Cloud API integration.
* **Future Integration**: To activate WhatsApp notifications, only the provider-level sending logic needs to be implemented inside the dispatcher; the UI settings, database schema, and event triggers are fully ready and require zero modification.

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