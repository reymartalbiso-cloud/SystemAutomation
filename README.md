# Solar Commission Tracker — Prototype

A clean web app replacing the Excel-based commission workflow for a solar
sales team. Personnel submit sales; admins verify, set the commission, mark
paid, and roll unpaid items to the next Friday cycle — with a required reason.

> **Prototype storage:** this build uses browser **localStorage** so there's
> no database to set up. Data persists per browser and syncs live across tabs.
> For multi-device production use, swap the store for a real backend
> (see "Upgrading to a backend" below).

## Features

**Personnel**
- Username + password login (client-side)
- Dashboard with earned / pending / monthly / YTD stats
- Submit new sales (date, description, client, amount)
- Personal entries table with search, status filter, and notes

**Admin**
- Dashboard with pending / paid / YTD / personnel count stats
- Master table across **all** personnel and cycles
- Search across everything (person, client, description, notes, cycle, amount)
- Filter by cycle, by person, by status
- **Editable commission amount** — rate auto-recalculates from commission ÷ sale
- Mark Paid / Pending per entry
- Per-entry rollover to next cycle — **reason required**, recorded in notes
- Bulk "Roll unpaid → next" for an entire cycle, reason applied to all
- Friday-to-Friday billing, auto-created on demand
- **Notes column** with inline edit modal

## Tech stack

- Next.js 14 (App Router, client-rendered)
- Tailwind CSS
- lucide-react icons
- **No backend**: data lives in browser localStorage

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first visit, the store auto-seeds with:

- 1 admin + 5 personnel accounts
- 8 Friday-to-Friday billing cycles (6 past, current, next)
- 47 mock solar sales entries (residential installs, commercial arrays,
  battery backups, consultations, inspections, and more)

## Demo accounts

| Role       | Username | Password         |
|------------|----------|------------------|
| Admin      | `admin`  | `admin123`       |
| Personnel  | `maria`  | `personnel123`   |
| Personnel  | `james`  | `personnel123`   |
| Personnel  | `anna`   | `personnel123`   |
| Personnel  | `paulo`  | `personnel123`   |
| Personnel  | `teresa` | `personnel123`   |

## Resetting the demo

Open the browser DevTools console and run:

```js
localStorage.removeItem('commission-tracker:v1');
localStorage.removeItem('commission-tracker:session');
location.reload();
```

The store will rebuild with fresh seed data.

## Deploy to Vercel

Nothing special — no DB, no env vars:

1. Push to a GitHub repo (already done)
2. Import the repo into Vercel
3. Accept defaults; deploy

Each visitor gets their own isolated demo in their own browser.

## Limitations of the localStorage build

- **Per-browser data**: admin on one laptop and personnel on another will
  not see each other's entries. For a live demo, log in/out as different
  users in the same browser.
- **No audit trail** of who did what (all writes are local).
- **Clearing browser data** wipes the workspace.

These are the *intended* prototype limits. See below to upgrade.

## Upgrading to a backend (next phase)

When you're ready to make this real:

- Replace [`src/lib/store.ts`](src/lib/store.ts) with fetch calls to API routes.
- Add back a Prisma + Postgres (Neon, Vercel Postgres, Supabase) layer.
- Move auth to JWT cookies (bcrypt + jose are already familiar in this codebase).

The data model in [`src/lib/types.ts`](src/lib/types.ts) already matches a
relational schema (User, BillingCycle, Entry).

## Project structure

```
src/
  app/
    login/                — Login page + form (client-side auth)
    personnel/            — Personnel dashboard, entry form, table
    admin/                — Admin dashboard, master console
    layout.tsx            — Root layout (shared fonts/styles)
    page.tsx              — Redirect based on current session
  components/
    modal.tsx             — Reusable modal (reason prompts, notes editor)
    route-guard.tsx       — Client-side role gate with loading state
    stat-card.tsx         — Dashboard stat cards
    status-badge.tsx      — Paid/Pending badges
    topbar.tsx            — Header with user avatar + logout
  lib/
    auth-client.ts        — signIn / signOut / useCurrentUser
    cn.ts                 — Tailwind className helper
    format.ts             — Currency/date formatters
    seed-data.ts          — 47-entry solar demo dataset
    store.ts              — localStorage store + CRUD + rollover logic
    types.ts              — User, Cycle, Entry, StoreData types
```
