"use client";

import { cn } from "@/lib/cn";

export type Tab<T extends string> = {
  id: T;
  label: string;
  icon?: React.ReactNode;
  count?: number | string;
};

type Props<T extends string> = {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
};

export function TabNav<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div className="overflow-x-auto">
      <div
        role="tablist"
        className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "ml-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
