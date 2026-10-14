# KhataFlow — Udhar Khata Web App

A modern React dashboard backed by an authenticated, append-only financial ledger. KhataFlow tracks people, food orders, partial/full payments, references, corrections, exports, and backups without using browser storage as the financial source of truth.

## Stack

- React 18 + Vite + JavaScript
- Tailwind CSS, React Router, Lucide React, Recharts
- Express API + SQLite (`better-sqlite3`)
- Cookie-based JWT authentication with bcrypt password hashing
- Vitest + Supertest

## Local setup

Requirements: Node.js 20+ and npm.

```bash
npm install
copy .env.example .env
npm run db:seed
npm run dev
```

Open `http://localhost:5173`. The local demo login created by the seed command is:

```text
demo@khataflow.in
Demo@1234
```

Change or remove this demo account before exposing the app publicly.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | API port | `4000` |
| `CLIENT_URL` | Allowed browser origin | `http://localhost:5173` |
| `JWT_SECRET` | Signs login sessions; use 32+ random characters | Development fallback |
| `DATABASE_PATH` | SQLite database location | `./data/udhar.db` |
| `UPLOAD_DIR` | Receipt file storage | `./uploads` |
| `NODE_ENV` | Enables secure cookies/static production hosting | `development` |

## Commands

```bash
npm run dev       # Vite frontend and watched API
npm test          # ledger, payment, auth, and persistence tests
npm run build     # production frontend build
npm run db:seed   # idempotent demo data seed
npm start         # serve API (and dist/ when NODE_ENV=production)
```

For a production process, build first and set `NODE_ENV=production`, a strong `JWT_SECRET`, an HTTPS origin in `CLIENT_URL`, and durable paths/volumes for `DATABASE_PATH` and `UPLOAD_DIR`. Back up both the SQLite file and receipt directory. A single Node process is recommended for SQLite writes.

## Netlify frontend + Render backend

This repository includes deployment configuration for keeping the frontend on
Netlify and running the Express/SQLite API as a Render web service:

1. Push the repository to the Git provider connected to Netlify and Render.
2. In Render, create a Blueprint from `render.yaml`. The attached persistent
   disk stores both the SQLite database and uploaded receipts. Do not deploy
   this API without persistent storage. Render persistent disks require a paid
   web-service instance.
3. Copy the resulting HTTPS Render service URL, such as
   `https://udhar-api.onrender.com`.
4. In Netlify, open **Site configuration > Environment variables** and create
   `BACKEND_URL` with that Render URL. Make it available to Functions/runtime.
5. Trigger a new Netlify deploy. `netlify.toml` builds `dist`, enables SPA
   routing, and the `backend-proxy` Function forwards `/api/*` and `/uploads/*`
   to Render without exposing cross-site authentication cookies.

Verify the connection at:

```text
https://udhar-monstera-d631eb.netlify.app/api/health
```

It should return `{"ok":true}`. The Render service's `CLIENT_URL` must match
the final Netlify/custom frontend origin exactly. If the Netlify site URL
changes, update `CLIENT_URL` on Render and redeploy the backend.

## Structure

```text
src/                 React UI
  components/        Reusable layout, dialogs, forms
  pages/             Route-level screens
  lib/               API and formatting helpers
  state/             Authentication state
server/              Express API
  db.js               Schema, triggers, connection
  ledger.js           Financial business rules
  queries.js          Read models and reporting
  scripts/seed.js     Idempotent sample data
tests/                Ledger and API tests
data/                 Local SQLite database (ignored)
uploads/              Local receipts (ignored)
```

## Financial model

All money is stored as integer paise. A balance is always calculated from the sum of a person’s ledger entries. Financial rows are protected by SQLite triggers. Corrections append a reversal and optional replacement entry. See `TRANSACTION_RULES.md` for the complete contract.

## Backup notes

JSON backup/restore includes receipt metadata, not the receipt binary files. Preserve the `uploads/` directory alongside JSON/database backups. Restore is merge-only: matching record IDs are skipped and existing history is not overwritten.
