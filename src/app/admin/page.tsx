"use client";

import { useEffect, useMemo } from "react";
import { Banknote, CalendarDays, Hourglass, Users } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { RouteGuard } from "@/components/route-guard";
import {
  findCurrentCycle,
  getOrCreateCurrentCycle,
  useStore,
} from "@/lib/store";
import { commission, formatCurrency } from "@/lib/format";
import { AdminConsole } from "./admin-console";
import type { SessionUser } from "@/lib/auth-client";

export default function AdminPage() {
  return (
    <RouteGuard role="ADMIN">{(user) => <Content user={user} />}</RouteGuard>
  );
}

function Content({ user }: { user: SessionUser }) {
  const store = useStore();

  useEffect(() => {
    if (store.users.length > 0) {
      getOrCreateCurrentCycle();
    }
  }, [store.users.length, store.cycles.length]);

  const currentCycle = useMemo(() => findCurrentCycle(store), [store]);

  const userById = useMemo(
    () => new Map(store.users.map((u) => [u.id, u])),
    [store.users]
  );
  const cycleById = useMemo(
    () => new Map(store.cycles.map((c) => [c.id, c])),
    [store.cycles]
  );

  const personnel = useMemo(
    () =>
      store.users
        .filter((u) => u.role === "PERSONNEL")
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [store.users]
  );

  const sortedEntries = useMemo(
    () =>
      [...store.entries].sort((a, b) => {
        const d = b.saleDate.localeCompare(a.saleDate);
        return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt);
      }),
    [store.entries]
  );

  const sortedCycles = useMemo(
    () => [...store.cycles].sort((a, b) => b.endsOn.localeCompare(a.endsOn)),
    [store.cycles]
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const currentEntries = currentCycle
    ? sortedEntries.filter((e) => e.cycleId === currentCycle.id)
    : [];

  const pendingTotal = currentEntries
    .filter((e) => e.status === "PENDING")
    .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);

  const paidThisMonth = sortedEntries
    .filter(
      (e) => e.status === "PAID" && e.paidAt && new Date(e.paidAt) >= monthStart
    )
    .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);

  const ytdSales = sortedEntries
    .filter((e) => new Date(e.saleDate) >= yearStart)
    .reduce((s, e) => s + e.saleAmount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar
        fullName={user.fullName}
        subtitle="Admin workspace"
        badge="Admin"
      />

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Commissions overview
          </h2>
          <p className="text-sm text-slate-500">
            Current cycle:{" "}
            <span className="font-medium text-slate-700">
              {currentCycle?.label ?? "—"}
            </span>{" "}
            · Closes Friday
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pending this cycle"
            value={formatCurrency(pendingTotal)}
            hint={`${currentEntries.filter((e) => e.status === "PENDING").length} entries to review`}
            icon={<Hourglass className="h-5 w-5" />}
            accent="amber"
          />
          <StatCard
            label="Paid this month"
            value={formatCurrency(paidThisMonth)}
            hint="Commissions settled"
            icon={<Banknote className="h-5 w-5" />}
            accent="emerald"
          />
          <StatCard
            label="YTD sales"
            value={formatCurrency(ytdSales)}
            hint="Gross across all personnel"
            icon={<CalendarDays className="h-5 w-5" />}
            accent="brand"
          />
          <StatCard
            label="Personnel"
            value={String(personnel.length)}
            hint="Active sales people"
            icon={<Users className="h-5 w-5" />}
            accent="slate"
          />
        </section>

        {currentCycle && (
          <AdminConsole
            currentCycleId={currentCycle.id}
            cycles={sortedCycles.map((c) => ({
              id: c.id,
              label: c.label,
              endsOn: c.endsOn,
            }))}
            users={personnel.map((u) => ({ id: u.id, fullName: u.fullName }))}
            entries={sortedEntries.map((e) => {
              const u = userById.get(e.userId);
              const c = cycleById.get(e.cycleId);
              return {
                id: e.id,
                saleDate: e.saleDate,
                description: e.description,
                clientName: e.clientName,
                saleAmount: e.saleAmount,
                commissionRate: e.commissionRate,
                status: e.status,
                notes: e.notes,
                cycleId: e.cycleId,
                cycleLabel: c?.label ?? "—",
                user: {
                  id: e.userId,
                  fullName: u?.fullName ?? "Unknown",
                },
                rolled: !!e.rolledFromCycleId,
              };
            })}
          />
        )}
      </main>
    </div>
  );
}
