# Messaging service

NestJS (TypeScript) chat API that shares Django's Postgres tables and JWT cookies.

## Structure

```
src/
  main.ts                   # Nest bootstrap (HTTP + WebSocket)
  app.module.ts
  config/                   # env
  prisma/                   # Prisma client
  auth/                     # JWT cookie guard
  common/                   # errors, utils, typed-resource
  serializers/              # response shaping
  modules/
    conversations/          # controller → service → validators
    messages/
  websocket/                # chat gateway + fan-out
  generated/prisma/         # prisma generate output (gitignored)
```

Request flow: **controller → (validator) → service → db / websocket**.

## Setup

```bash
cp .env.example .env
# Set DATABASE_URL (same as Django).
# JWT_SECRET must equal Django SECRET_KEY — quote it if it contains # (dotenv truncates otherwise):
#   JWT_SECRET='django-insecure-....#....'
npm install
npx prisma generate
npm run dev
```

- HTTP: `http://localhost:8001`
- WebSocket: `ws://localhost:8001/ws/chat/`

Do **not** run `prisma migrate`. Schema changes belong in Django migrations; use `npx prisma db pull` if the mapped models drift.
