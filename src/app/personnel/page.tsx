"use client";

import { useEffect, useMemo } from "react";
import { CalendarClock, CheckCircle2, Hourglass, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { RouteGuard } from "@/components/route-guard";
import {
  findCurrentCycle,
  getOrCreateCurrentCycle,
  useStore,
} from "@/lib/store";
import { commission, formatCurrency } from "@/lib/format";
import { EntryForm } from "./entry-form";
import { PersonnelEntriesTable } from "./entries-table";
import type { SessionUser } from "@/lib/auth-client";

export default function PersonnelPage() {
  return (
    <RouteGuard role="PERSONNEL">{(user) => <Content user={user} />}</RouteGuard>
  );
}

function Content({ user }: { user: SessionUser }) {
  const store = useStore();

  // Ensure a current Friday cycle exists — runs in an effect so we never
  // write to localStorage during render.
  useEffect(() => {
    if (store.users.length > 0) {
      getOrCreateCurrentCycle();
    }
  }, [store.users.length, store.cycles.length]);

  const currentCycle = useMemo(() => findCurrentCycle(store), [store]);

  const entries = useMemo(
    () =>
      store.entries
        .filter((e) => e.userId === user.id)
        .sort((a, b) => {
          const d = b.saleDate.localeCompare(a.saleDate);
          return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt);
        }),
    [store.entries, user.id]
  );

  const cycleById = useMemo(
    () => new Map(store.cycles.map((c) => [c.id, c])),
    [store.cycles]
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const totalEarned = entries
    .filter((e) => e.status === "PAID")
    .reduce((sum, e) => sum + commission(e.saleAmount, e.commissionRate), 0);

  const pendingAmount = entries
    .filter((e) => e.status === "PENDING")
    .reduce((sum, e) => sum + commission(e.saleAmount, e.commissionRate), 0);

  const thisMonth = entries
    .filter(
      (e) => e.status === "PAID" && e.paidAt && new Date(e.paidAt) >= monthStart
    )
    .reduce((sum, e) => sum + commission(e.saleAmount, e.commissionRate), 0);

  const thisYearSales = entries
    .filter((e) => new Date(e.saleDate) >= yearStart)
    .reduce((sum, e) => sum + e.saleAmount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar
        fullName={user.fullName}
        subtitle="Personnel workspace"
        badge="Personnel"
      />

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Hi {user.fullName.split(" ")[0]} 👋
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
            label="Total earned"
            value={formatCurrency(totalEarned)}
            hint="All paid commissions"
            icon={<CheckCircle2 className="h-5 w-5" />}
            accent="emerald"
          />
          <StatCard
            label="Pending payout"
            value={formatCurrency(pendingAmount)}
            hint={`${entries.filter((e) => e.status === "PENDING").length} entries awaiting`}
            icon={<Hourglass className="h-5 w-5" />}
            accent="amber"
          />
          <StatCard
            label="This month"
            value={formatCurrency(thisMonth)}
            hint="Commissions paid this month"
            icon={<CalendarClock className="h-5 w-5" />}
            accent="brand"
          />
          <StatCard
            label="YTD sales"
            value={formatCurrency(thisYearSales)}
            hint="Gross sales this year"
            icon={<TrendingUp className="h-5 w-5" />}
            accent="slate"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h3 className="text-base font-semibold text-slate-900">
                Submit new sale
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                It'll land in the admin's queue for verification.
              </p>
              <div className="mt-5">
                <EntryForm userId={user.id} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                My entries
              </h3>
              <span className="text-xs text-slate-500">
                {entries.length} total
              </span>
            </div>
            <PersonnelEntriesTable
              entries={entries.map((e) => ({
                id: e.id,
                saleDate: e.saleDate,
                description: e.description,
                clientName: e.clientName,
                saleAmount: e.saleAmount,
                commissionRate: e.commissionRate,
                status: e.status,
                notes: e.notes,
                cycleLabel: cycleById.get(e.cycleId)?.label ?? "—",
                rolled: !!e.rolledFromCycleId,
              }))}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
