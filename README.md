# Commission Tracker — Prototype

A clean web app replacement for the Excel-based commission workflow. Personnel
submit sales; admins verify, set commission rate (70% or 30%), mark paid, and
roll unpaid items to the next Friday cycle automatically.

> This is a **prototype** aimed at demonstrating the core concepts. It is
> architected to be MVP-ready: real auth, real database, role-based views, and
> a production-shaped data model.

## Features

**Personnel**
- Username + password login
- Dashboard with earned / pending / monthly / YTD stats
- Form to submit new sales (date, description, client, amount)
- Personal entries table with search, filter by status, and cycle awareness

**Admin**
- Dashboard with pending / paid / YTD / personnel count stats
- Master table across **all** personnel and cycles
- Search across everything (person, client, description, cycle, amount)
- Filter by cycle, by person, by status
- One-click toggle between 70% and 30% commission rate per entry
- Mark Paid / Pending per entry
- Per-entry rollover to next cycle
- Bulk "Roll unpaid → next" for an entire cycle
- Friday-to-Friday billing, auto-created on demand

## Tech Stack

- **Next.js 14** (App Router) — full-stack, Vercel-ready
- **Prisma** + **SQLite** (local) / **PostgreSQL** (production)
- **Tailwind CSS** — professional UI
- **jose** JWT cookie sessions + **bcryptjs** password hashing
- **lucide-react** for icons

## Run Locally

```bash
npm install
npm run db:push      # create SQLite tables from schema
npm run db:seed      # insert demo users, cycles, and entries
npm run dev
```

Open http://localhost:3000

### Demo accounts

| Role       | Username | Password         |
|------------|----------|------------------|
| Admin      | `admin`  | `admin123`       |
| Personnel  | `maria`  | `personnel123`   |
| Personnel  | `james`  | `personnel123`   |
| Personnel  | `anna`   | `personnel123`   |

Reset with fresh data any time:

```bash
npm run db:reset
```

## Deploy to Vercel

SQLite is only suitable for local dev — Vercel's serverless file system is
read-only and ephemeral. For deployment, switch to Postgres (Vercel Postgres,
Neon, or Supabase all work).

1. Create a Postgres database (Neon free tier is easiest: https://neon.tech)
2. Change the provider in [prisma/schema.prisma](prisma/schema.prisma#L8-L11):

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Set environment variables in the Vercel project:
   - `DATABASE_URL` — your Postgres connection string
   - `AUTH_SECRET` — a long random string (`openssl rand -base64 32`)

4. Push the repo to GitHub and import into Vercel. The build script will run
   `prisma generate && prisma migrate deploy && next build`.

5. After the first deploy, run the seed once from your local machine against
   the production DB (optional):

   ```bash
   DATABASE_URL="your-prod-url" npm run db:seed
   ```

## Prototype Scope — What's Intentionally Left Out

Designed to be built next — architecture already supports them:

- Admin UI to create/invite personnel (users are seeded for the demo)
- Password reset / magic-link invites
- CSV / PDF export of reports
- Email notifications on "paid"
- Audit log (who marked what, when)
- Multi-tenant support (multiple admin workspaces)

## Project Structure

```
src/
  app/
    login/              — Login page (server) + form (client)
    personnel/          — Personnel dashboard, entry form, table
    admin/              — Admin dashboard, master console
    api/
      auth/login        — POST: sign in
      auth/logout       — POST: sign out
      entries           — POST: create entry
      entries/[id]      — PATCH: update status/rate/notes · DELETE
      entries/[id]/rollover — POST: move entry to next cycle
      cycles/rollover-unpaid — POST: bulk roll pending entries
  components/           — StatCard, StatusBadge, Topbar
  lib/
    auth.ts             — JWT session + bcrypt credentials
    cycle.ts            — Friday-to-Friday cycle math
    db.ts               — Prisma client singleton
    format.ts           — Currency/date formatting helpers
prisma/
  schema.prisma         — User, BillingCycle, Entry models
  seed.ts               — Demo users, cycles, and entries
```

## Data Model (summary)

- **User** — `{ username, passwordHash, fullName, role: ADMIN|PERSONNEL }`
- **BillingCycle** — `{ endsOn (unique Friday), label }`
- **Entry** — `{ user, cycle, saleDate, description, clientName, saleAmount,
  commissionRate (0.7 or 0.3), status: PENDING|PAID, notes, rolledFromCycleId,
  paidAt }`
