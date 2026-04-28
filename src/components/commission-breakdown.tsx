"use client";

import { Calculator, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { computeBreakdown } from "@/lib/commission-rules";
import { formatCurrency } from "@/lib/format";

type Props = {
  saleAmount: number;
  description: string;
  notes: string | null;
  /** The commission the admin currently has set (rate × sale). */
  currentCommission: number;
  currentRate: number;
  /** Optional callback — admin clicks "Apply system value" to overwrite the current rate. */
  onApply?: () => void;
};

export function CommissionBreakdown({
  saleAmount,
  description,
  notes,
  currentCommission,
  currentRate,
  onApply,
}: Props) {
  const breakdown = computeBreakdown({ saleAmount, description, notes });
  const matches = Math.abs(breakdown.total - currentCommission) < 1;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700 ring-1 ring-brand-200">
              <Calculator className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                System-computed breakdown
              </div>
              <div className="text-[11px] text-slate-500">
                Rules-based — recomputes if rules change
              </div>
            </div>
          </div>
        </header>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2 font-medium">Component</th>
              <th className="px-4 py-2 font-medium">Calculation</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.lines.map((line) => {
              const inactive = line.amount === 0 && !line.base;
              return (
                <tr
                  key={line.id}
                  className={cn(
                    "border-b border-slate-50 last:border-0",
                    inactive && "text-slate-400"
                  )}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {line.label}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {line.detail}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right font-semibold tabular-nums",
                      inactive ? "text-slate-300" : "text-slate-900"
                    )}
                  >
                    {line.amount === 0 ? "—" : formatCurrency(line.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                Total commission
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {(breakdown.effectiveRate * 100).toFixed(2)}% effective rate
              </td>
              <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-emerald-700">
                {formatCurrency(breakdown.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div
        className={cn(
          "rounded-xl border p-4",
          matches
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-amber-200 bg-amber-50/60"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-8 w-8 flex-none items-center justify-center rounded-lg",
              matches
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            )}
          >
            {matches ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">
              {matches ? "Current value matches the system" : "Differs from current value"}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Currently set:{" "}
              <span className="font-semibold tabular-nums text-slate-900">
                {formatCurrency(currentCommission)}
              </span>{" "}
              ({(currentRate * 100).toFixed(1)}%)
              {!matches && (
                <>
                  {" · System suggests "}
                  <span className="font-semibold tabular-nums text-emerald-700">
                    {formatCurrency(breakdown.total)}
                  </span>{" "}
                  ({(breakdown.effectiveRate * 100).toFixed(1)}%)
                </>
              )}
            </div>
            {!matches && onApply && (
              <button
                type="button"
                onClick={onApply}
                className="btn-primary mt-3"
              >
                Apply system value
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Rules: 10% base, +2% on the portion above ₱500k, +3% on the portion above
        ₱1M, +2% uplift if the description mentions a battery / backup product.
        Replace this engine with the client's real commission structure when
        finalised — the breakdown UI re-renders automatically.
      </p>
    </div>
  );
}
