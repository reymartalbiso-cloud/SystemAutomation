"use client";

import { useSyncExternalStore } from "react";
import { getStore } from "./store";
import type { User } from "./types";

const SESSION_KEY = "commission-tracker:session";
const SESSION_EVENT = "commission-tracker:session-changed";

export type SessionUser = Omit<User, "password">;

// Cache the parsed session keyed by the raw string so `useSyncExternalStore`
// sees a stable reference when nothing changed.
let cachedRaw: string | null = null;
let cachedSession: SessionUser | null = null;

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(user: SessionUser | null) {
  if (user) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function snapshot(): SessionUser | null {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  if (!raw) {
    cachedSession = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id) {
      cachedSession = null;
      return null;
    }
    cachedSession = parsed;
    return parsed;
  } catch {
    cachedSession = null;
    return null;
  }
}

function serverSnapshot(): SessionUser | null {
  return null;
}

/** Verify credentials and start a session. Returns the user or an error string. */
export function signIn(
  username: string,
  password: string
): { user: SessionUser | null; error: string | null } {
  const store = getStore();
  const u = store.users.find(
    (x) => x.username.toLowerCase() === username.toLowerCase().trim()
  );
  if (!u || u.password !== password) {
    return { user: null, error: "Invalid username or password." };
  }
  const { password: _p, ...safe } = u;
  writeSession(safe);
  return { user: safe, error: null };
}

export function signOut() {
  writeSession(null);
}

function subscribe(listener: () => void) {
  const handler = () => listener();
  window.addEventListener("storage", handler);
  window.addEventListener(SESSION_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(SESSION_EVENT, handler);
  };
}

/** Reactive current-user hook (null while unauthenticated). */
export function useCurrentUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
