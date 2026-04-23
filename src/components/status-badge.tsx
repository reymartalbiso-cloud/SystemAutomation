import { cn } from "@/lib/cn";

export function StatusBadge({ status }: { status: string }) {
  const isPaid = status === "PAID";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        isPaid
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-amber-200"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isPaid ? "bg-emerald-500" : "bg-amber-500"
        )}
      />
      {isPaid ? "Paid" : "Pending"}
    </span>
  );
}

export function CommissionBadge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const isHigh = pct >= 70;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1",
        isHigh
          ? "bg-brand-50 text-brand-700 ring-brand-200"
          : "bg-slate-100 text-slate-700 ring-slate-200"
      )}
    >
      {pct}%
    </span>
  );
}
