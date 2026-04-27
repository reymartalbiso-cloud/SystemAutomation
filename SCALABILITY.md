# Scalability & production-readiness notes

This is a **prototype**. It looks polished and the UX is correct, but the
storage layer is `localStorage` — a 5-megabyte browser key/value bucket
intended for user preferences, not business data. Read this before pitching
the current build as production-ready.

## What works fine today

| Scale | Performance |
|---|---|
| ≤ 50 personnel | Instant |
| ≤ 1,000 entries | Instant |
| ≤ 10 attachments per workspace, ≤ 1 MB each | Instant |
| Multiple tabs (same browser) | Live cross-tab sync via the `storage` event |

For demos and a single user kicking the tires, this is plenty.

## Hard limits of the localStorage build

The numbers below are **structural** — no amount of code optimisation moves
them. Hitting any of these means it's time to swap the store for a real
backend.

| Limit | Cap | Why |
|---|---|---|
| Total store size | ~5 MB (browser-enforced) | localStorage hard cap |
| Soft quota in this app | 4.5 MB | We refuse writes past this to leave room for the session |
| Per-attachment size | 1 MB | Base64 inflation × attachments × small entries fits the 4.5 MB envelope |
| Attachments per entry | 3 | Same envelope reasoning |
| Cross-device sync | None | Each browser has its own data store |
| Concurrent admin/personnel writes | None — last-writer-wins | No server, no transactions |
| Audit trail | None | All writes are local; no server log |
| Account security | Plaintext passwords | Browser-only — there's nothing to hack server-side, but credentials live in localStorage |
| Search | Linear scan in memory | Fine to ~10k entries, slow past that |

The Topbar shows a live storage-usage chip so you can see how close you
are to the cap during a demo.

## What we did inside those limits

These are the optimisations applied to make the prototype feel snappy
even with the full 47-entry seed plus growth from the demo:

- **Stable snapshots.** `useSyncExternalStore` is fed cached
  references keyed by the raw localStorage string — same string in,
  same object out. Eliminates the infinite-render loop that an unstable
  snapshot would cause.
- **No-op writes are dropped.** `updateStore` compares serialised
  before/after; if nothing changed, no write and no change-event fires.
  Important because helpers like `ensureCycle` are called speculatively.
- **Render is pure.** Cycle creation, seeding, and any other writes
  happen in `useEffect` or event handlers — never inside `useMemo`
  or render bodies.
- **All derived data is memoised.** Filters, totals, leaderboard,
  status breakdown — every per-cycle/per-user aggregate is wrapped in
  `useMemo` with narrow deps so unrelated edits don't recompute them.
- **Lookup maps over linear scans.** Admin page builds `userById` /
  `cycleById` `Map`s once per render so per-row lookups are O(1).
- **Migration on read.** Older snapshots get backfilled (e.g.
  `attachments: []`, `active: true`) without forcing a destructive
  reset.
- **Quota-aware writes.** Attempting to write past the 4.5 MB soft
  cap throws `StoreQuotaError` — surfaced as a Toast, never a silent
  data-loss.

## What would NOT scale to real production

If the client wanted to ship this to a real solar sales team tomorrow,
the following would break or need replacing. None of these are
hand-wavy — they're concrete consequences of the current architecture.

### 1. Storage capacity
**5 MB is roughly 10,000 entries with no attachments.** Add a single 1 MB
PDF and you've used 20% of your entire workspace's lifetime quota.
Real solar sales attach photos, contracts, IDs, quotes — multiple files
per deal, often 2–10 MB each. The prototype is *built to fall over* at
that point.

**Production answer:** Postgres for entry rows; S3 / Vercel Blob /
Cloudflare R2 for files. The DB stores only file URLs.

### 2. Multi-user concurrency
Today, if two admins on different machines mark the same entry "Paid"
within seconds of each other, **whichever syncs last wins** silently.
There is no conflict detection, no locking, no audit trail.

**Production answer:** server-side transactions, optimistic locking
via `updatedAt`, append-only audit log table.

### 3. Cross-device data
A personnel logs in from their phone, submits a sale; the admin opens
the laptop and sees… nothing. Different browser = different data store.
This is fine for a single-browser pitch demo and breaks the second the
client tries the app on their actual phone.

**Production answer:** any server-backed store. Even SQLite on a tiny
VPS would solve this.

### 4. Search at scale
The admin search box runs `filter()` over the full entries array on every
keystroke. For 47 demo entries this is sub-millisecond. For 100k entries
in real production it's noticeable; for 1M it's a freeze.

**Production answer:** server-side search with proper indexes
(Postgres full-text, Meilisearch, or even a `LIKE '%q%'` if the table is
indexed by user/cycle and the search is scoped).

### 5. Rendering the master table
The admin's master table renders **every row** that matches the filter.
Past ~5,000 visible rows, the DOM gets heavy.

**Production answer:** server-side pagination (default 50/page) plus
optionally a virtualised table (`@tanstack/react-virtual`) for power
users who want everything on one screen.

### 6. Auth
Passwords are plaintext in localStorage. There is no rate-limiting, no
session expiry, no CSRF protection. None of these matter when the
"server" is your own browser, but all of them matter the moment a real
backend exists.

**Production answer:** bcrypt (already familiar in this codebase),
JWT cookies (`jose`), proper Set-Cookie flags (`HttpOnly`, `Secure`,
`SameSite=Strict`), and either NextAuth or a hand-rolled session
table.

### 7. Reports / analytics
The Reports tab computes everything from the in-memory entries array
on each render. With 1M entries it would freeze the tab on every load.

**Production answer:** persisted aggregate tables, recomputed on a
schedule (daily) or via incremental triggers. Charts render from those,
not the raw entries.

## The migration plan when you're ready

The codebase was designed so this is a contained job. Files in **bold**
are the only ones that need significant changes:

```
src/lib/types.ts          ← keep, already maps to a relational schema
src/lib/seed-data.ts      ← move to a Prisma seed script
src/lib/store.ts          ← REPLACE: become a thin wrapper that calls
                            /api/* fetch endpoints
src/lib/auth-client.ts    ← REPLACE: switch to NextAuth or a JWT cookie
src/lib/attachments.ts    ← keep validateFile/readableSize, REPLACE
                            fileToAttachment to upload to Blob/S3
src/components/**         ← unchanged — already stateless and prop-driven
src/app/admin/**          ← unchanged — already calls store functions
src/app/personnel/**      ← unchanged — same
+ src/app/api/**          ← REINTRODUCE: thin Prisma-backed endpoints
+ prisma/schema.prisma    ← REINTRODUCE: matches the existing types
```

Every component reads from `useStore()` and calls plain functions like
`updateEntry()`. Swap those four lib/ files for fetch calls and the
rest of the UI keeps working unchanged.

## Bottom line

The current build is **excellent for showing the client what the workflow
will feel like** — it's polished, the data model is right, and the UX
patterns (paid/pending toggle, rollover-with-reason, attachments, reports,
personnel management) are exactly what production should ship.

What it cannot do is be the *actual production system* for a sales team
that needs cross-device sync, audit trails, real file storage, or more
than a few megabytes of data. The client should treat this as the
**design + UX prototype**, then commission the backend work as the next
phase. The hand-off is small (~4 files) because the UI was deliberately
written against an abstract store API, not against fetch directly.
