# Changes

## Unreleased

### Database — Neon PostgreSQL

- **`api-services/backend/backend/settings.py`** — reads `DATABASE_URL` from env; uses Neon PostgreSQL when set, SQLite fallback otherwise
- **`api-services/backend/requirements.txt`** — added `dj-database-url`
- **`api-services/backend/.env.example`** — template with pooled Neon connection string (same format as court-booking)
- **`README.md`** — updated setup and env var docs for `DATABASE_URL`

### Frontend — Landing page (from court-booking)

- **`web-app/src/components/landing/`** — `ContentBanner`, `BannerSlider`, `LandingHeader`, `Logo`
- **`web-app/src/assets/images/`** — carousel hero images
- **`web-app/src/app/page.tsx`** — full-screen carousel homepage with floating header

### Frontend — Auth UI (from court-booking)

- **`web-app/src/components/auth/AuthPageView.tsx`** — shared login/register layout (Google button, OR divider, card)
- **`web-app/src/components/auth/SocialButton.tsx`** — Continue with Google button (disabled, UI only)
- **`web-app/src/components/auth/LoginForm.tsx`** — refactored to field-only form inside `AuthPageView`
- **`web-app/src/components/auth/RegisterForm.tsx`** — same; redirects to verify-email after signup
- **`web-app/src/app/login/page.tsx`**, **`register/page.tsx`** — use `AuthPageView`

### Frontend — Verify email (UI only)

- **`web-app/src/app/verify-email/page.tsx`** — new route
- **`web-app/src/components/auth/VerifyEmailView.tsx`** — auto-verify from URL params or manual form
- **`web-app/src/components/auth/VerifyEmailForm.tsx`** — email + token form
- **`web-app/src/hooks/useVerifyEmail.ts`** — mock verification (wire to Django when backend is ready)
- **`web-app/src/features/auth/schemas/verifyEmailSchema.ts`** — Zod schema
- **`web-app/src/proxy.ts`** — added `/verify-email` to public auth routes

### Frontend — Typography

- **`web-app/src/app/layout.tsx`** — switched from Geist to **Inter** (matches court-booking)
- **`web-app/src/app/globals.css`** — updated font theme tokens

### Frontend — Auth / SSR (earlier)

- **`web-app/src/proxy.ts`** — session validation via Django `/api/me`, token refresh, cookie forwarding
- **`web-app/src/lib/auth/fetch-user.ts`** — `prefetchUser`, axios + fetch for refresh `Set-Cookie`
- **`web-app/src/providers/InitialUserContext.tsx`** — server user passed to client for hydration
- **`web-app/src/providers/StoreProvider.tsx`** — Redux upsert from `initialUser`
- **`web-app/src/lib/auth/server.ts`** — `getCurrentUser()` reads `x-current-user` header

### Backend — Auth (earlier)

- **`api-services/backend/api/views.py`** — `CookieTokenRefreshView` sets `access_token` cookie on refresh
- **`api-services/backend/api/cookies.py`** — `set_access_token_cookie()`
- **`api-services/backend/api/authentication.py`** — JWT from httpOnly cookies
- **`api-services/backend/api/urls.py`** — email login, register, me, logout, notes

---

## Setup after pulling

```bash
# Backend
cd api-services/backend
cp .env.example .env   # add Neon DATABASE_URL (pooled, sslmode=require)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd web-app
cp .env.example .env.local
npm install
npm run dev
```

## Still to do (practice)

- [ ] Django verify-email endpoint + token model
- [ ] Send verification email on register
- [ ] Block login until email verified
- [ ] Wire `useVerifyEmail` to Django API
- [ ] Google OAuth (optional)
- [ ] Notes UI on frontend
