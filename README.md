# Django React

Full-stack app with a **Django REST API** backend and a **Next.js** frontend. Users can register, log in with email, and manage notes. Authentication uses JWT tokens stored in **httpOnly cookies** set by Django.

## Tech stack

### Backend (`api-services/backend`)

- Django 6 + Django REST Framework
- Simple JWT (`djangorestframework-simplejwt`)
- Cookie-based JWT authentication
- SQLite (default) / PostgreSQL-ready
- CORS via `django-cors-headers`

### Frontend (`web-app`)

- Next.js 16 (App Router) + TypeScript
- Redux Toolkit Query
- React Hook Form + Zod
- shadcn/ui + Tailwind CSS v4

## Project structure

```
django-react/
├── api-services/backend/   # Django API
│   ├── api/                # App: auth, notes, serializers, views
│   └── backend/            # Project settings & URLs
└── web-app/                # Next.js frontend
    └── src/
        ├── app/            # Pages (login, register, home)
        ├── components/     # UI & auth forms
        └── lib/            # API slices, auth helpers, store
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- npm

## Getting started

### 1. Backend

```bash
cd api-services/backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Optional: create api-services/backend/.env
# FRONTEND_URL=http://localhost:3000

python manage.py migrate
python manage.py runserver
```

API runs at [http://localhost:8000](http://localhost:8000).

### 2. Frontend

```bash
cd web-app

npm install

cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Location | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | `api-services/backend/.env` | `http://localhost:3000` | Allowed CORS origin |
| `NEXT_PUBLIC_API_URL` | `web-app/.env.local` | `http://localhost:8000` | Django API base URL |

## API endpoints

Base URL: `http://localhost:8000/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | No | Create account, set cookies, return user |
| `POST` | `/token` | No | Log in with email + password, set cookies |
| `POST` | `/token/refresh` | No | Refresh access token |
| `POST` | `/logout` | No | Clear auth cookies |
| `GET` | `/me` | Yes | Get current user |
| `GET` | `/notes` | Yes | List user's notes |
| `POST` | `/notes` | Yes | Create a note |

> API routes do **not** use trailing slashes (`APPEND_SLASH = False`).

### Login / register body

```json
{
  "email": "you@example.com",
  "password": "your-password"
}
```

Login uses **email**, not username. On the backend, `username` is set equal to `email` during registration.

## Authentication

1. Client sends `POST /api/token` or `POST /api/register` with `credentials: "include"`.
2. Django validates credentials and responds with `Set-Cookie` headers:
   - `access_token` (httpOnly)
   - `refresh_token` (httpOnly)
3. The browser sends cookies automatically on later requests to the API.
4. Django reads the JWT from cookies via `CookieJWTAuthentication`.
5. On first page load, Next.js reads the cookie server-side and hydrates the Redux store with the current user.

## Frontend pages

| Route | Description |
|-------|-------------|
| `/` | Home (shows user when authenticated) |
| `/login` | Sign in |
| `/register` | Create account |

## Production notes

- Set `DEBUG = False` and configure `SECRET_KEY` via environment variables.
- Set `JWT_COOKIE_SECURE = True` (requires HTTPS).
- Update `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` to your deployed frontend URL.
- Replace SQLite with PostgreSQL for production (`psycopg2-binary` is already in requirements).

## License

MIT
