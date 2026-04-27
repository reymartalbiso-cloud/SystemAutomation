"use client";

import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  estimateStoreSize,
  STORE_QUOTA_BYTES,
  STORE_WARN_BYTES,
} from "@/lib/store";

/**
 * Tiny chip that shows how full the localStorage prototype store is.
 * Polls every 4s — cheap (single localStorage read) and only mounted
 * inside the Topbar so it doesn't affect re-render frequency elsewhere.
 */
export function StorageBadge() {
  const [bytes, setBytes] = useState(0);

  useEffect(() => {
    function tick() {
      setBytes(estimateStoreSize());
    }
    tick();
    const id = setInterval(tick, 4000);
    function onStorage() {
      tick();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("commission-tracker:changed", onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("commission-tracker:changed", onStorage);
    };
  }, []);

  if (bytes === 0) return null;

  const pct = Math.min(100, Math.round((bytes / STORE_QUOTA_BYTES) * 100));
  const isWarn = bytes >= STORE_WARN_BYTES;
  const isCrit = bytes >= STORE_QUOTA_BYTES;
  const display =
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-lg border bg-white px-2.5 py-1 text-[11px] font-medium md:flex",
        isCrit
          ? "border-red-200 text-red-700"
          : isWarn
          ? "border-amber-200 text-amber-700"
          : "border-slate-200 text-slate-600"
      )}
      title={`Prototype localStorage: ${display} of ~${(STORE_QUOTA_BYTES / (1024 * 1024)).toFixed(1)} MB`}
    >
      <Database className="h-3 w-3" />
      <span className="tabular-nums">{display}</span>
      <span className="h-1 w-12 overflow-hidden rounded-full bg-slate-100">
        <span
          className={cn(
            "block h-full rounded-full",
            isCrit
              ? "bg-red-500"
              : isWarn
              ? "bg-amber-500"
              : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
