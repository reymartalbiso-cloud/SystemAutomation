"use client";

import { useMemo } from "react";
import { Crown, TrendingUp } from "lucide-react";
import { commission, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Cycle, Entry, User } from "@/lib/types";

type Props = {
  cycles: Cycle[];
  entries: Entry[];
  users: User[];
};

export function ReportsTab({ cycles, entries, users }: Props) {
  // ── Cycle bar chart data: last 8 cycles, gross sales + commission ─────
  const cycleData = useMemo(() => {
    const sorted = [...cycles]
      .sort((a, b) => a.endsOn.localeCompare(b.endsOn))
      .slice(-8);
    return sorted.map((c) => {
      const cycleEntries = entries.filter((e) => e.cycleId === c.id);
      const sales = cycleEntries.reduce((s, e) => s + e.saleAmount, 0);
      const com = cycleEntries.reduce(
        (s, e) => s + commission(e.saleAmount, e.commissionRate),
        0
      );
      return {
        cycleId: c.id,
        label: c.label,
        endsOn: c.endsOn,
        sales,
        commission: com,
        count: cycleEntries.length,
      };
    });
  }, [cycles, entries]);

  // ── Personnel leaderboard: this month's earned commission ─────────────
  const leaderboard = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const personnel = users.filter((u) => u.role === "PERSONNEL");
    return personnel
      .map((u) => {
        const own = entries.filter((e) => e.userId === u.id);
        const monthEarned = own
          .filter((e) => e.status === "PAID" && e.paidAt && e.paidAt >= monthStart)
          .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);
        const monthSales = own
          .filter((e) => e.saleDate >= monthStart)
          .reduce((s, e) => s + e.saleAmount, 0);
        const ytdSales = own
          .filter((e) => e.saleDate >= ytdStart)
          .reduce((s, e) => s + e.saleAmount, 0);
        const ytdEarned = own
          .filter((e) => e.status === "PAID" && e.paidAt && e.paidAt >= ytdStart)
          .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);
        return {
          user: u,
          monthEarned,
          monthSales,
          ytdSales,
          ytdEarned,
          count: own.length,
        };
      })
      .sort((a, b) => b.monthEarned - a.monthEarned);
  }, [entries, users]);

  // ── Status breakdown (for current cycle context) ──────────────────────
  const statusBreakdown = useMemo(() => {
    const totalSales = entries.reduce((s, e) => s + e.saleAmount, 0);
    const paidCount = entries.filter((e) => e.status === "PAID").length;
    const pendingCount = entries.filter((e) => e.status === "PENDING").length;
    const paidCom = entries
      .filter((e) => e.status === "PAID")
      .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);
    const pendingCom = entries
      .filter((e) => e.status === "PENDING")
      .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);
    return {
      totalSales,
      paidCount,
      pendingCount,
      paidCom,
      pendingCom,
      total: paidCount + pendingCount,
    };
  }, [entries]);

  return (
    <div className="space-y-6">
      <CycleChart data={cycleData} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Leaderboard entries={leaderboard} />
        <StatusBreakdown {...statusBreakdown} />
      </div>
    </div>
  );
}

function CycleChart({
  data,
}: {
  data: {
    cycleId: string;
    label: string;
    sales: number;
    commission: number;
    count: number;
  }[];
}) {
  const maxSales = Math.max(...data.map((d) => d.sales), 1);

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Sales &amp; commissions per cycle
          </h3>
          <p className="text-sm text-slate-500">
            Last {data.length} Friday-to-Friday cycles
          </p>
        </div>
        <div className="hidden gap-3 text-xs sm:flex">
          <LegendDot color="bg-brand-500" label="Gross sales" />
          <LegendDot color="bg-emerald-500" label="Commission" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-8 items-end gap-3">
        {data.map((d) => {
          const salesPct = (d.sales / maxSales) * 100;
          const comPct = d.sales > 0 ? (d.commission / d.sales) * salesPct : 0;
          return (
            <div key={d.cycleId} className="flex flex-col items-center gap-2">
              <div
                className="relative flex h-44 w-full items-end justify-center"
                title={`${d.label}\nSales: ${formatCurrency(d.sales)}\nCommission: ${formatCurrency(d.commission)}\nEntries: ${d.count}`}
              >
                <div
                  className="absolute bottom-0 w-7 rounded-t-md bg-gradient-to-t from-brand-500 to-brand-400 transition-all hover:from-brand-600 hover:to-brand-500"
                  style={{ height: `${Math.max(salesPct, 1)}%` }}
                />
                <div
                  className="absolute bottom-0 w-7 rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all hover:from-emerald-600 hover:to-emerald-500"
                  style={{ height: `${Math.max(comPct, 0.5)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 text-center leading-tight">
                {d.label.split(" – ")[0]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs sm:grid-cols-4">
        <ChartStat
          label="Total sales (period)"
          value={formatCurrency(data.reduce((s, d) => s + d.sales, 0))}
        />
        <ChartStat
          label="Total commission"
          value={formatCurrency(data.reduce((s, d) => s + d.commission, 0))}
        />
        <ChartStat
          label="Avg cycle"
          value={formatCurrency(
            data.length > 0
              ? data.reduce((s, d) => s + d.sales, 0) / data.length
              : 0
          )}
        />
        <ChartStat
          label="Entries"
          value={String(data.reduce((s, d) => s + d.count, 0))}
        />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-600">
      <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
      {label}
    </div>
  );
}

function ChartStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

function Leaderboard({
  entries,
}: {
  entries: {
    user: User;
    monthEarned: number;
    monthSales: number;
    ytdSales: number;
    ytdEarned: number;
    count: number;
  }[];
}) {
  return (
    <div className="card p-6 lg:col-span-2">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-500" />
        <h3 className="text-base font-semibold text-slate-900">
          Personnel leaderboard
        </h3>
      </div>
      <p className="mt-0.5 text-sm text-slate-500">
        Ranked by paid commissions this month
      </p>

      <ul className="mt-5 space-y-2.5">
        {entries.map((row, i) => {
          const initials = row.user.fullName
            .split(" ")
            .map((s) => s[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <li
              key={row.user.id}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
            >
              <div
                className={cn(
                  "flex h-7 w-7 flex-none items-center justify-center rounded-md text-xs font-semibold",
                  i === 0
                    ? "bg-amber-100 text-amber-800"
                    : i === 1
                    ? "bg-slate-200 text-slate-700"
                    : i === 2
                    ? "bg-orange-100 text-orange-800"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {i + 1}
              </div>
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900">
                  {row.user.fullName}
                  {!row.user.active && (
                    <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      inactive
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  YTD sales {formatCurrency(row.ytdSales)} ·{" "}
                  {row.count} entries
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums text-emerald-700">
                  {formatCurrency(row.monthEarned)}
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  this month
                </div>
              </div>
            </li>
          );
        })}
        {entries.length === 0 && (
          <li className="py-8 text-center text-sm text-slate-400">
            No personnel yet.
          </li>
        )}
      </ul>
    </div>
  );
}

function StatusBreakdown({
  totalSales,
  paidCount,
  pendingCount,
  paidCom,
  pendingCom,
  total,
}: {
  totalSales: number;
  paidCount: number;
  pendingCount: number;
  paidCom: number;
  pendingCom: number;
  total: number;
}) {
  const paidPct = total > 0 ? (paidCount / total) * 100 : 0;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-brand-600" />
        <h3 className="text-base font-semibold text-slate-900">
          Workflow status
        </h3>
      </div>
      <p className="mt-0.5 text-sm text-slate-500">
        Across all entries in the system
      </p>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between text-xs">
          <span className="font-medium text-emerald-700">Paid</span>
          <span className="tabular-nums text-slate-500">
            {paidCount}/{total}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${paidPct}%` }}
          />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-xs">
        <BreakdownStat
          label="Paid commission"
          value={formatCurrency(paidCom)}
          tone="emerald"
        />
        <BreakdownStat
          label="Pending commission"
          value={formatCurrency(pendingCom)}
          tone="amber"
        />
        <BreakdownStat
          label="Paid entries"
          value={String(paidCount)}
          tone="emerald"
        />
        <BreakdownStat
          label="Pending entries"
          value={String(pendingCount)}
          tone="amber"
        />
        <BreakdownStat
          label="Total sales"
          value={formatCurrency(totalSales)}
          tone="slate"
          full
        />
      </dl>
    </div>
  );
}

function BreakdownStat({
  label,
  value,
  tone,
  full,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "slate";
  full?: boolean;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
      ? "text-amber-700"
      : "text-slate-900";
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2",
        full && "col-span-2"
      )}
    >
      <dt className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className={cn("mt-0.5 text-sm font-semibold tabular-nums", toneClass)}>
        {value}
      </dd>
    </div>
  );
}
