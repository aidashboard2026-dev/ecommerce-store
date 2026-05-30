# AdminDash Pro

A production-ready full-stack Admin Dashboard with React + FastAPI + PostgreSQL, fully dockerized.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, Redux |
| Backend    | Python FastAPI, SQLAlchemy ORM      |
| Database   | PostgreSQL 16                       |
| Auth       | JWT (python-jose + bcrypt)          |
| Container  | Docker & Docker Compose             |

---

## Quick Start (Docker — Recommended)

```bash
# 1. Clone or extract the project
cd admin-dashboard

# 2. Start all services (db + backend + frontend)
docker compose up --build

# 3. Open your browser
#    Frontend:  http://localhost:5173
#    API Docs:  http://localhost:8000/docs
```

**Default credentials (seeded automatically):**

| Role        | Email                    | Password   |
|-------------|--------------------------|------------|
| Super Admin | admin@admindash.com      | admin123   |
| Admin       | jane@admindash.com       | jane123    |

> Change these immediately in production!

---

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# Run development server (with hot reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server with HMR
npm run dev
```

### Database

```bash
# Start PostgreSQL locally (or use Docker just for db)
docker compose up db -d
```

---

## Project Structure

```
admin-dashboard/
├── docker-compose.yml
├── .env
│
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py        # Login, /me, logout
│   │   │   │   ├── admins.py      # CRUD for admin users
│   │   │   │   └── dashboard.py   # Stats, charts, activity
│   │   │   └── router.py
│   │   ├── auth/
│   │   │   └── dependencies.py    # JWT bearer dependency
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic settings
│   │   │   └── security.py        # JWT + bcrypt utilities
│   │   ├── database/
│   │   │   ├── base.py            # SQLAlchemy DeclarativeBase
│   │   │   ├── session.py         # Engine + SessionLocal
│   │   │   └── init_db.py         # Seed default admins
│   │   ├── models/
│   │   │   └── admin.py           # Admin SQLAlchemy model
│   │   ├── schemas/
│   │   │   └── admin.py           # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── auth_service.py    # Authentication logic
│   │   │   └── admin_service.py   # Admin CRUD logic
│   │   └── main.py                # FastAPI app + CORS + lifespan
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── common/            # Modal, Badge, Spinner
    │   │   ├── layout/            # Header
    │   │   └── dashboard/         # StatCard
    │   ├── layouts/
    │   │   └── MainLayout.jsx     # Shell with Header + Outlet
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── UsersPage.jsx
    │   │   ├── ProductsPage.jsx
    │   │   ├── AnalyticsPage.jsx
    │   │   └── SettingsPage.jsx
    │   ├── routes/
    │   │   └── AppRoutes.jsx      # Protected + public routes
    │   ├── store/
    │   │   ├── store.js           # Redux store
    │   │   ├── authSlice.js       # Auth state + thunks
    │   │   ├── themeSlice.js      # Dark/light mode
    │   │   └── uiSlice.js         # Sidebar/modal state
    │   ├── services/
    │   │   └── api.js             # Axios instance + API modules
    │   ├── hooks/
    │   │   └── useAuth.js         # useAuth + useTheme hooks
    │   ├── App.jsx
    │   └── main.jsx
    ├── tailwind.config.js
    ├── vite.config.js
    └── Dockerfile
```

---

## API Reference

### Auth
| Method | Endpoint              | Description        | Auth |
|--------|-----------------------|--------------------|------|
| POST   | /api/v1/auth/login    | Login, get JWT     | No   |
| GET    | /api/v1/auth/me       | Get current admin  | Yes  |
| POST   | /api/v1/auth/logout   | Logout             | Yes  |

### Admins (Users)
| Method | Endpoint                  | Description         | Role        |
|--------|---------------------------|---------------------|-------------|
| GET    | /api/v1/admins/           | List all admins     | Any admin   |
| GET    | /api/v1/admins/{id}       | Get admin by ID     | Any admin   |
| POST   | /api/v1/admins/           | Create new admin    | Superadmin  |
| PUT    | /api/v1/admins/{id}       | Update admin        | Any/Super   |
| DELETE | /api/v1/admins/{id}       | Delete admin        | Superadmin  |

### Dashboard
| Method | Endpoint                          | Description         |
|--------|-----------------------------------|---------------------|
| GET    | /api/v1/dashboard/stats           | KPI metrics         |
| GET    | /api/v1/dashboard/chart-data      | Monthly chart data  |
| GET    | /api/v1/dashboard/recent-activity | Activity feed       |

Full interactive docs at: **http://localhost:8000/docs**

---

## Features

- **JWT Authentication** — Login, protected routes, auto-logout on 401
- **Role-based access** — Superadmin vs Admin permissions
- **Dark / Light Mode** — Persistent in localStorage, smooth transitions
- **SPA Navigation** — React Router, no page reloads, active nav highlighting
- **Live HMR** — Vite hot module replacement, instant UI updates
- **Responsive Design** — Mobile-first, works on all screen sizes
- **Full CRUD** — Create, read, update, delete admin users
- **Charts** — Area, Bar, Line, Pie charts via Recharts
- **Real API** — Frontend talks to live FastAPI backend via Axios

---

## Production Deployment

For production, update these values in your `.env`:

```env
SECRET_KEY=<generate with: openssl rand -hex 32>
POSTGRES_PASSWORD=<strong-password>
```

Also add a production Nginx reverse proxy and serve the frontend build (`npm run build`) statically. Consider using the provided `docker-compose.yml` as the base and extend with an `nginx` service.

---

## License

MIT — free for personal and commercial use.
