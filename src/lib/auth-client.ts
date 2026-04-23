"use client";

import { useSyncExternalStore } from "react";
import { getStore } from "./store";
import type { User } from "./types";

const SESSION_KEY = "commission-tracker:session";
const SESSION_EVENT = "commission-tracker:session-changed";

export type SessionUser = Omit<User, "password">;

function readSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id) return null;
    return parsed;
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

function snapshot(): SessionUser | null {
  return readSession();
}

function serverSnapshot(): SessionUser | null {
  return null;
}

/** Reactive current-user hook (null while unauthenticated). */
export function useCurrentUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/** True once the client has mounted (and localStorage is safe to read). */
export function useIsClient(): boolean {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  return hydrated;
}
