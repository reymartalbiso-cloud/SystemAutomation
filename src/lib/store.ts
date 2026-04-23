"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Cycle, Entry, StoreData, User } from "./types";
import { buildSeed } from "./seed-data";

const KEY = "commission-tracker:v1";
const CHANGE_EVENT = "commission-tracker:changed";

// ─── Low-level persistence ────────────────────────────────────────────────

function readRaw(): StoreData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoreData;
    if (parsed?.version === 1) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeRaw(data: StoreData) {
  window.localStorage.setItem(KEY, JSON.stringify(data));
  // Notify listeners in this tab (the native `storage` event only fires
  // in *other* tabs, so we dispatch a synthetic event for same-tab updates).
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Returns the current store, initializing with seed data if empty. */
export function getStore(): StoreData {
  const existing = readRaw();
  if (existing) return existing;
  const seeded = buildSeed();
  writeRaw(seeded);
  return seeded;
}

/** Atomic update — mutator receives a draft, we write it back. */
export function updateStore(mutator: (draft: StoreData) => void) {
  const data = getStore();
  // Clone so mutations inside the mutator don't leak until write is done
  const draft: StoreData = JSON.parse(JSON.stringify(data));
  mutator(draft);
  writeRaw(draft);
}

/** Wipe everything and reseed. */
export function resetStore() {
  const seeded = buildSeed();
  writeRaw(seeded);
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

function getSnapshot(): StoreData {
  return getStore();
}

function getServerSnapshot(): StoreData {
  // During SSR, return an empty snapshot; real data arrives on hydration.
  return { version: 1, users: [], cycles: [], entries: [] };
}

/** Reactive store — rerenders whenever anything in localStorage changes. */
export function useStore(): StoreData {
  // useSyncExternalStore avoids hydration mismatches and handles
  // both cross-tab and same-tab updates cleanly.
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True once localStorage has been read on the client. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

// ─── Helpers / domain logic ───────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function nextFridayFromToday(): Date {
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

export function getOrCreateCurrentCycle(): Cycle {
  const endsOn = nextFridayFromToday();
  let cycle!: Cycle;
  updateStore((draft) => {
    cycle = ensureCycle(draft, endsOn);
  });
  return cycle;
}

export function getOrCreateNextCycleAfter(endsOnISO: string): Cycle {
  const next = new Date(endsOnISO);
  next.setDate(next.getDate() + 7);
  let cycle!: Cycle;
  updateStore((draft) => {
    cycle = ensureCycle(draft, next);
  });
  return cycle;
}

// ─── Entry CRUD ───────────────────────────────────────────────────────────

export function createEntry(input: {
  userId: string;
  saleDate: string;
  description: string;
  clientName: string | null;
  saleAmount: number;
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
    rolledFromCycleId: null,
    paidAt: null,
    createdAt: now,
  };
  updateStore((draft) => {
    draft.entries.push(entry);
  });
  return entry;
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
