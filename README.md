# Django React

Full-stack app with a **Django REST API** (auth, listings, bookings), a **Node messaging** service (chat HTTP + WebSocket), and a **Next.js** frontend. Authentication uses JWT tokens stored in **httpOnly cookies** set by Django; the messaging service validates the same cookies against the shared Postgres database.

## Tech stack

### Backend (`api-services/backend`)

- Django 6 + Django REST Framework
- Simple JWT (`djangorestframework-simplejwt`)
- Cookie-based JWT authentication
- SQLite (default) / PostgreSQL-ready
- CORS via `django-cors-headers`

### Messaging (`api-services/messaging`)

- NestJS + TypeScript
- Prisma (maps existing Django tables — Django owns migrations)
- Raw WebSocket (`ws`) for typing / seen / message fan-out
- Shares Django `DATABASE_URL` + `SECRET_KEY` (as `JWT_SECRET`)

### Frontend (`web-app`)

- Next.js 16 (App Router) + TypeScript
- Redux Toolkit Query
- React Hook Form + Zod
- shadcn/ui + Tailwind CSS v4

## Project structure

```
django-react/
├── api-services/
│   ├── backend/            # Django API (auth, courts, bookings)
│   └── messaging/          # Node chat API + WebSocket
└── web-app/                # Next.js frontend
    └── src/
        ├── app/            # Pages
        ├── components/     # UI & auth forms
        └── lib/            # API slices, auth helpers, store
```

## Prerequisites

- Python 3.11+ (`python3 --version` should show 3.11 or newer)
- Node.js 20+
- npm

> **pyenv users:** if `python` points to 2.7, install and select a modern Python first:
>
> ```bash
> pyenv install 3.12.8
> pyenv local 3.12.8   # run inside api-services/backend
> python -m venv venv
> ```

## Getting started

### 1. Django backend

```bash
cd api-services/backend

# Create and activate a virtual environment (requires Python 3.11+)
python3 -m venv venv
source venv/bin/activate
 # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy env and add your Neon connection string (same format as court-booking)
cp .env.example .env
# DATABASE_URL=postgresql://...@ep-xxx-pooler.us-east-2.aws.neon.tech/mint-db?sslmode=require

python manage.py makemigrations api
python manage.py migrate
python manage.py runserver
```

```
#RUN TRANSACTION TRANSITION SCHEDULER
python3 manage.py process_transaction_transitions

#Run generate court slots
python3 manage.py generate_court_slots

```

API runs at [http://localhost:8000](http://localhost:8000).

### 2. Messaging service

```bash
cd api-services/messaging

npm install
cp .env.example .env
# DATABASE_URL= same as Django backend
# JWT_SECRET= copy Django SECRET_KEY from backend/settings.py (or set SECRET_KEY in env)
# FRONTEND_URL=http://localhost:3000

npx prisma generate
npm run dev
```

Messaging API runs at [http://localhost:8001](http://localhost:8001).  
WebSocket: `ws://localhost:8001/ws/chat/`

> Prisma only **maps** Django tables. Do not run `prisma migrate` — keep using Django migrations for schema changes.

### 3. Frontend

```bash
cd web-app

npm install

cp .env.example .env.local   # if present; otherwise create .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_CHAT_API_URL=http://localhost:8001

npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable                   | Location                       | Default                 | Description                                         |
| -------------------------- | ------------------------------ | ----------------------- | --------------------------------------------------- |
| `DATABASE_URL`             | `api-services/backend/.env`    | _(SQLite fallback)_     | Neon PostgreSQL connection string (pooled)          |
| `FRONTEND_URL`             | `api-services/backend/.env`    | `http://localhost:3000` | Allowed CORS origin                                 |
| `DATABASE_URL`             | `api-services/messaging/.env`  | _(required)_            | Same Postgres URL as Django                         |
| `JWT_SECRET`               | `api-services/messaging/.env`  | _(required)_            | Must match Django `SECRET_KEY` (simplejwt HS256)    |
| `FRONTEND_URL`             | `api-services/messaging/.env`  | `http://localhost:3000` | Allowed CORS origin for chat                        |
| `PORT`                     | `api-services/messaging/.env`  | `8001`                  | Messaging HTTP/WS port                              |
| `NEXT_PUBLIC_API_URL`      | `web-app/.env.local`           | `http://localhost:8000` | Django API base URL (auth, courts, bookings)        |
| `NEXT_PUBLIC_CHAT_API_URL` | `web-app/.env.local`           | `http://localhost:8001` | Node messaging API + WebSocket base URL             |

## API endpoints

### Auth / product (Django) — `http://localhost:8000/api`

| Method | Endpoint         | Auth | Description                               |
| ------ | ---------------- | ---- | ----------------------------------------- |
| `POST` | `/register`      | No   | Create account, set cookies, return user  |
| `POST` | `/token`         | No   | Log in with email + password, set cookies |
| `POST` | `/token/refresh` | No   | Refresh access token                      |
| `POST` | `/logout`        | No   | Clear auth cookies                        |

### Chat (Node messaging) — `http://localhost:8001/api`

| Method | Endpoint                              | Auth | Description                          |
| ------ | ------------------------------------- | ---- | ------------------------------------ |
| `GET`  | `/conversations`                      | Yes  | Inbox for current user               |
| `GET`  | `/conversations/dm?userId=`           | Yes  | Existing DM with peer (or null)      |
| `POST` | `/conversations/:id/seen`             | Yes  | Persist read watermark               |
| `POST` | `/messages/send`                      | Yes  | Send / create thread + WS fan-out    |
| `GET`  | `/messages/:conversationId`           | Yes  | Paginated messages (`limit`, `beforeId`) |
| WS     | `/ws/chat/`                           | Yes  | typing / seen relay; message events  |

> API routes do **not** use trailing slashes (`APPEND_SLASH = False` on Django; Node matches the same paths).

Django still exposes the old chat routes under `:8000` as a fallback; the Next.js client uses the Node service.

### Login / register body

```json
{
  "email": "you@example.com",
  "password": "your-password"
}
```

Login uses **email**, not username. On the backend, `username` is set equal to `email` during registration.

## Authentication

1. Client sends `POST /api/token` or `POST /api/register` with `credentials: "include"` to **Django**.
2. Django validates credentials and responds with `Set-Cookie` headers:
   - `access_token` (httpOnly)
   - `refresh_token` (httpOnly)
3. The browser sends cookies automatically on later requests to Django **and** the messaging service (same host `localhost`, different ports).
4. Django and the NestJS service both validate the JWT (Django `CookieJWTAuthentication` / Nest `AuthGuard`).
5. On 401 from chat, the frontend refreshes via Django `POST /api/token/refresh`, then retries.
6. On first page load, Next.js reads the cookie server-side and hydrates the Redux store with the current user.

**Production:** serve both APIs on one origin (reverse proxy) or set cookie `Domain` so `access_token` is shared.

## Frontend pages

| Route       | Description                          |
| ----------- | ------------------------------------ |
| `/`         | Home (shows user when authenticated) |
| `/login`    | Sign in                              |
| `/register` | Create account                       |

## Production notes

- Set `DEBUG = False` and configure `SECRET_KEY` via environment variables.
- Set `JWT_COOKIE_SECURE = True` (requires HTTPS).
- Update `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` on both Django and messaging to your deployed frontend URL.
- Use Neon PostgreSQL in production via `DATABASE_URL` (same pooled connection format as court-booking).
- Keep `JWT_SECRET` on the messaging service identical to Django `SECRET_KEY`.

## License

MIT
