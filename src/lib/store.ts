"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Attachment, Cycle, Entry, StoreData, User } from "./types";
import { buildSeed } from "./seed-data";

const KEY = "commission-tracker:v1";
const CHANGE_EVENT = "commission-tracker:changed";

// ─── Limits (prototype) ───────────────────────────────────────────────────
// localStorage hard cap is ~5MB; keep a margin for the session key + headroom.
export const MAX_ATTACHMENT_BYTES = 1_000_000; // 1 MB per file (≈1.4 MB base64)
export const MAX_ATTACHMENTS_PER_ENTRY = 3;
export const STORE_QUOTA_BYTES = 4_500_000; // soft cap before we refuse writes
export const STORE_WARN_BYTES = 3_500_000; // surface a warning past this

// Stable empty reference for SSR and for when localStorage is empty.
const EMPTY_SNAPSHOT: StoreData = {
  version: 1,
  users: [],
  cycles: [],
  entries: [],
};

// Cache the parsed snapshot keyed by the raw string so `getSnapshot`
// returns a stable reference when nothing changed. Without this,
// `useSyncExternalStore` sees a new object each call and re-renders
// infinitely.
let cachedRaw: string | null = null;
let cachedSnapshot: StoreData = EMPTY_SNAPSHOT;

// ─── Low-level persistence ────────────────────────────────────────────────

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function writeRaw(raw: string) {
  window.localStorage.setItem(KEY, raw);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function parseRaw(raw: string | null): StoreData {
  if (!raw) return EMPTY_SNAPSHOT;
  try {
    const parsed = JSON.parse(raw) as StoreData;
    if (parsed?.version === 1) return migrate(parsed);
    return EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

/** Backfill missing fields when an older store schema is loaded. Cheap and
 *  idempotent, runs on every read but only allocates when something is
 *  actually missing. */
function migrate(data: StoreData): StoreData {
  let mutated = false;
  for (const u of data.users) {
    if (u.active === undefined) {
      u.active = true;
      mutated = true;
    }
    if (!u.createdAt) {
      u.createdAt = new Date(0).toISOString();
      mutated = true;
    }
  }
  for (const e of data.entries) {
    if (!Array.isArray(e.attachments)) {
      e.attachments = [];
      mutated = true;
    }
  }
  if (mutated && typeof window !== "undefined") {
    // Persist quietly — don't fire a change event from inside a parse.
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* quota errors handled elsewhere */
    }
  }
  return data;
}

/** Approximate current store size in bytes (UTF-16 in localStorage = 2 bytes/char). */
export function estimateStoreSize(): number {
  const raw = readRaw();
  return raw ? raw.length * 2 : 0;
}

/** Pure read — no side effects. Returns stable reference when unchanged. */
function getSnapshot(): StoreData {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = parseRaw(raw);
  return cachedSnapshot;
}

function getServerSnapshot(): StoreData {
  return EMPTY_SNAPSHOT;
}

/** Return the current store (client-only). Does NOT seed — callers should
 *  check for emptiness and let the `useStore` hook trigger seeding via
 *  useEffect. */
export function getStore(): StoreData {
  return getSnapshot();
}

export class StoreQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreQuotaError";
  }
}

/**
 * Atomic update. The mutator receives a cloned draft; if it actually
 * changes anything, we write it back and fire the change event. No-op
 * mutators do NOT trigger writes — important because some helpers
 * (e.g. ensureCycle) may not mutate when the entity already exists.
 *
 * Throws StoreQuotaError if the resulting store would exceed the soft
 * quota OR if localStorage refuses the write (the browser's hard cap).
 * The original data is left untouched on failure.
 */
export function updateStore(mutator: (draft: StoreData) => void) {
  if (typeof window === "undefined") return;
  const currentRaw = readRaw();
  const current = parseRaw(currentRaw);
  const beforeJSON = JSON.stringify(current);
  const draft: StoreData = JSON.parse(beforeJSON);
  mutator(draft);
  const afterJSON = JSON.stringify(draft);
  if (afterJSON === beforeJSON) return;

  if (afterJSON.length * 2 > STORE_QUOTA_BYTES) {
    throw new StoreQuotaError(
      "Storage quota exceeded. Remove old attachments to make room, or upgrade to a real backend for production."
    );
  }
  try {
    writeRaw(afterJSON);
  } catch (err) {
    // Hard cap — browser refused
    throw new StoreQuotaError(
      "The browser's localStorage is full. This is a prototype-only limit; production storage would not have it."
    );
  }
}

/** Seed the store with demo data if it's empty. Idempotent. */
export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  const raw = readRaw();
  const parsed = parseRaw(raw);
  if (parsed.users.length > 0) return;
  const seeded = buildSeed();
  writeRaw(JSON.stringify(seeded));
}

/** Wipe everything and reseed. */
export function resetStore() {
  if (typeof window === "undefined") return;
  const seeded = buildSeed();
  writeRaw(JSON.stringify(seeded));
}

// ─── Reactive hook ────────────────────────────────────────────────────────

function subscribe(listener: () => void) {
  const handler = () => listener();
  window.addEventListener("storage", handler); // cross-tab
  window.addEventListener(CHANGE_EVENT, handler); // same-tab
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
  };
}

/** Reactive store — rerenders whenever anything in localStorage changes.
 *  On first mount (if empty), seeds the store with demo data. */
export function useStore(): StoreData {
  useEffect(() => {
    seedIfEmpty();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True once the client has mounted. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

// ─── Helpers / domain logic ───────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function nextFridayFromToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function cycleLabel(endsOn: Date): string {
  const start = new Date(endsOn);
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(endsOn)}`;
}

function formatNoteDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Ensure a cycle exists for the given endsOn date; returns it. */
function ensureCycle(draft: StoreData, endsOn: Date): Cycle {
  const iso = endsOn.toISOString();
  const found = draft.cycles.find((c) => c.endsOn === iso);
  if (found) return found;
  const cycle: Cycle = {
    id: uid("c"),
    endsOn: iso,
    label: cycleLabel(endsOn),
  };
  draft.cycles.push(cycle);
  draft.cycles.sort((a, b) => a.endsOn.localeCompare(b.endsOn));
  return cycle;
}

/** Returns the current Friday cycle from the given store data without
 *  any writes. Use this from render code. */
export function findCurrentCycle(store: StoreData): Cycle | null {
  const iso = nextFridayFromToday().toISOString();
  return store.cycles.find((c) => c.endsOn === iso) ?? null;
}

/** Ensure the current Friday cycle exists. Call from effects / handlers. */
export function getOrCreateCurrentCycle(): Cycle {
  const endsOn = nextFridayFromToday();
  let cycle!: Cycle;
  updateStore((draft) => {
    cycle = ensureCycle(draft, endsOn);
  });
  // If updateStore didn't write (cycle existed), read from current snapshot
  if (!cycle) {
    const store = getStore();
    cycle = store.cycles.find((c) => c.endsOn === endsOn.toISOString())!;
  }
  return cycle;
}

// ─── Entry CRUD ───────────────────────────────────────────────────────────

export function createEntry(input: {
  userId: string;
  saleDate: string;
  description: string;
  clientName: string | null;
  saleAmount: number;
  attachments?: Attachment[];
}): Entry {
  const cycle = getOrCreateCurrentCycle();
  const now = new Date().toISOString();
  const entry: Entry = {
    id: uid("e"),
    userId: input.userId,
    cycleId: cycle.id,
    saleDate: new Date(input.saleDate).toISOString(),
    description: input.description.trim(),
    clientName: input.clientName?.trim() || null,
    saleAmount: input.saleAmount,
    commissionRate: 0.7,
    status: "PENDING",
    notes: null,
    attachments: input.attachments?.slice(0, MAX_ATTACHMENTS_PER_ENTRY) ?? [],
    rolledFromCycleId: null,
    paidAt: null,
    createdAt: now,
  };
  updateStore((draft) => {
    draft.entries.push(entry);
  });
  return entry;
}

export function addAttachmentsToEntry(
  entryId: string,
  attachments: Attachment[]
) {
  updateStore((draft) => {
    const entry = draft.entries.find((e) => e.id === entryId);
    if (!entry) return;
    const room = MAX_ATTACHMENTS_PER_ENTRY - entry.attachments.length;
    if (room <= 0) return;
    entry.attachments.push(...attachments.slice(0, room));
  });
}

export function removeAttachmentFromEntry(
  entryId: string,
  attachmentId: string
) {
  updateStore((draft) => {
    const entry = draft.entries.find((e) => e.id === entryId);
    if (!entry) return;
    entry.attachments = entry.attachments.filter((a) => a.id !== attachmentId);
  });
}

export function updateEntry(
  id: string,
  patch: {
    status?: "PAID" | "PENDING";
    commissionAmount?: number;
    commissionRate?: number;
    notes?: string | null;
  }
) {
  updateStore((draft) => {
    const entry = draft.entries.find((e) => e.id === id);
    if (!entry) return;

    if (patch.status === "PAID" || patch.status === "PENDING") {
      entry.status = patch.status;
      entry.paidAt = patch.status === "PAID" ? new Date().toISOString() : null;
    }

    if (patch.commissionAmount !== undefined && entry.saleAmount > 0) {
      const rate = patch.commissionAmount / entry.saleAmount;
      entry.commissionRate = Math.round(rate * 10000) / 10000;
    } else if (patch.commissionRate !== undefined) {
      entry.commissionRate =
        Math.round(patch.commissionRate * 10000) / 10000;
    }

    if (patch.notes !== undefined) {
      const trimmed = patch.notes?.trim() ?? "";
      entry.notes = trimmed.length > 0 ? trimmed : null;
    }
  });
}

export function deleteEntry(id: string) {
  updateStore((draft) => {
    draft.entries = draft.entries.filter((e) => e.id !== id);
  });
}

// ─── User CRUD (admin) ────────────────────────────────────────────────────

export function createUser(input: {
  username: string;
  password: string;
  fullName: string;
  role: "ADMIN" | "PERSONNEL";
}): { user: User | null; error: string | null } {
  const username = input.username.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const password = input.password.trim();
  if (!username || !fullName || !password) {
    return { user: null, error: "All fields are required." };
  }
  const store = getStore();
  if (store.users.some((u) => u.username.toLowerCase() === username)) {
    return { user: null, error: `Username "${username}" is already taken.` };
  }
  const user: User = {
    id: uid("u"),
    username,
    password,
    fullName,
    role: input.role,
    active: true,
    createdAt: new Date().toISOString(),
  };
  updateStore((draft) => {
    draft.users.push(user);
  });
  return { user, error: null };
}

export function updateUser(
  id: string,
  patch: { fullName?: string; password?: string; active?: boolean }
) {
  updateStore((draft) => {
    const user = draft.users.find((u) => u.id === id);
    if (!user) return;
    if (patch.fullName !== undefined) {
      const trimmed = patch.fullName.trim();
      if (trimmed) user.fullName = trimmed;
    }
    if (patch.password !== undefined) {
      const trimmed = patch.password.trim();
      if (trimmed) user.password = trimmed;
    }
    if (patch.active !== undefined) {
      user.active = patch.active;
    }
  });
}

// ─── Rollover ─────────────────────────────────────────────────────────────

function composeRolloverNote(
  previous: string | null,
  fromLabel: string,
  reason: string
): string {
  const today = formatNoteDate(new Date());
  const line = `[Rolled from ${fromLabel} · ${today}] ${reason}`;
  return previous ? `${previous}\n${line}` : line;
}

export function rolloverEntry(id: string, reason: string): string | null {
  const trimmed = reason.trim();
  if (!trimmed) return "A reason is required when rolling an entry over.";

  let error: string | null = null;
  updateStore((draft) => {
    const entry = draft.entries.find((e) => e.id === id);
    if (!entry) {
      error = "Entry not found.";
      return;
    }
    if (entry.status === "PAID") {
      error = "Paid entries cannot be rolled over.";
      return;
    }
    const currentCycle = draft.cycles.find((c) => c.id === entry.cycleId);
    if (!currentCycle) {
      error = "Current cycle not found.";
      return;
    }
    const nextDate = new Date(currentCycle.endsOn);
    nextDate.setDate(nextDate.getDate() + 7);
    const nextCycle = ensureCycle(draft, nextDate);

    entry.rolledFromCycleId = entry.cycleId;
    entry.cycleId = nextCycle.id;
    entry.notes = composeRolloverNote(entry.notes, currentCycle.label, trimmed);
  });
  return error;
}

export function bulkRolloverCycle(
  cycleId: string,
  reason: string
): { movedCount: number; error: string | null } {
  const trimmed = reason.trim();
  if (!trimmed)
    return { movedCount: 0, error: "A reason is required when closing a cycle." };

  let movedCount = 0;
  let error: string | null = null;
  updateStore((draft) => {
    const cycle = draft.cycles.find((c) => c.id === cycleId);
    if (!cycle) {
      error = "Cycle not found.";
      return;
    }
    const nextDate = new Date(cycle.endsOn);
    nextDate.setDate(nextDate.getDate() + 7);
    const nextCycle = ensureCycle(draft, nextDate);

    for (const entry of draft.entries) {
      if (entry.cycleId === cycleId && entry.status === "PENDING") {
        entry.rolledFromCycleId = cycleId;
        entry.cycleId = nextCycle.id;
        entry.notes = composeRolloverNote(entry.notes, cycle.label, trimmed);
        movedCount += 1;
      }
    }
  });
  return { movedCount, error };
}
