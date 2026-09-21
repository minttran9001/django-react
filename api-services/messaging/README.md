# Messaging service

Node.js (Express + TypeScript) chat API that shares Django's Postgres tables and JWT cookies.

## Structure

```
src/
  server.ts                 # HTTP + WebSocket bootstrap
  app.ts                    # Express app factory
  config/                   # env
  db/                       # Prisma client
  common/                   # errors, utils, typed-resource
  middleware/               # auth
  serializers/              # response shaping
  modules/
    conversations/          # routes → controller → service → validators
    messages/
  routes/                   # API router mount
  websocket/                # chat gateway + fan-out
  generated/prisma/         # prisma generate output (gitignored)
```

Request flow: **route → controller → (validator) → service → db / websocket**.

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
