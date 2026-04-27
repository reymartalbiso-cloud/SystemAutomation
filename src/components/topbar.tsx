"use client";

import { LogOut, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { StorageBadge } from "@/components/storage-badge";

type Props = {
  fullName: string;
  subtitle: string;
  badge?: string;
};

export function Topbar({ fullName, subtitle, badge }: Props) {
  const router = useRouter();
  const initials = fullName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleLogout() {
    signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900">
                Commission Tracker
              </h1>
              {badge && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StorageBadge />
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-slate-900">{fullName}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 ring-1 ring-brand-200">
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost !px-2.5"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
