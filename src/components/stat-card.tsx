import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: "brand" | "emerald" | "amber" | "slate";
};

const accentMap = {
  brand: "bg-brand-50 text-brand-600 ring-brand-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function StatCard({ label, value, hint, icon, accent = "brand" }: Props) {
  return (
    <div className="card p-5 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </div>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg ring-1",
              accentMap[accent]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
