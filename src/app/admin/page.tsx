import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentCycle } from "@/lib/cycle";
import { commission, formatCurrency } from "@/lib/format";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import {
  Banknote,
  CalendarDays,
  Hourglass,
  Users,
} from "lucide-react";
import { AdminConsole } from "./admin-console";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireRole("ADMIN");
  const currentCycle = await getOrCreateCurrentCycle();

  const [entries, cycles, users] = await Promise.all([
    prisma.entry.findMany({
      include: { user: true, cycle: true },
      orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.billingCycle.findMany({ orderBy: { endsOn: "desc" } }),
    prisma.user.findMany({
      where: { role: "PERSONNEL" },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const currentEntries = entries.filter((e) => e.cycleId === currentCycle.id);
  const pendingTotal = currentEntries
    .filter((e) => e.status === "PENDING")
    .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);

  const paidThisMonth = entries
    .filter((e) => e.status === "PAID" && e.paidAt && e.paidAt >= monthStart)
    .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);

  const ytdSales = entries
    .filter((e) => e.saleDate >= yearStart)
    .reduce((s, e) => s + e.saleAmount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar
        fullName={session.fullName}
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
              {currentCycle.label}
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
            value={String(users.length)}
            hint="Active sales people"
            icon={<Users className="h-5 w-5" />}
            accent="slate"
          />
        </section>

        <AdminConsole
          currentCycleId={currentCycle.id}
          cycles={cycles.map((c) => ({
            id: c.id,
            label: c.label,
            endsOn: c.endsOn.toISOString(),
          }))}
          users={users.map((u) => ({ id: u.id, fullName: u.fullName }))}
          entries={entries.map((e) => ({
            id: e.id,
            saleDate: e.saleDate.toISOString(),
            description: e.description,
            clientName: e.clientName,
            saleAmount: e.saleAmount,
            commissionRate: e.commissionRate,
            status: e.status,
            notes: e.notes,
            cycleId: e.cycleId,
            cycleLabel: e.cycle.label,
            user: { id: e.user.id, fullName: e.user.fullName },
            rolled: !!e.rolledFromCycleId,
          }))}
        />
      </main>
    </div>
  );
}
