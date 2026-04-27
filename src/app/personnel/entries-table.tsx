"use client";

import { useMemo, useState } from "react";
import { ArrowRightCircle, Search, StickyNote } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { commission, formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { AttachmentChip } from "@/components/attachment-uploader";
import { AttachmentViewer } from "@/components/attachment-viewer";
import type { Attachment } from "@/lib/types";

type Entry = {
  id: string;
  saleDate: string;
  description: string;
  clientName: string | null;
  saleAmount: number;
  commissionRate: number;
  status: string;
  notes: string | null;
  attachments: Attachment[];
  cycleLabel: string;
  rolled: boolean;
};

export function PersonnelEntriesTable({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL");
  const [viewerEntry, setViewerEntry] = useState<Entry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "ALL" && e.status !== filter) return false;
      if (!q) return true;
      return (
        e.description.toLowerCase().includes(q) ||
        (e.clientName ?? "").toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q) ||
        e.cycleLabel.toLowerCase().includes(q)
      );
    });
  }, [entries, query, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search description, client, notes, cycle…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
          {(["ALL", "PENDING", "PAID"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                filter === f
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {f === "ALL" ? "All" : f === "PENDING" ? "Pending" : "Paid"}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table w-full">
          <colgroup>
            <col className="w-[110px]" />
            <col />
            <col className="w-[170px]" />
            <col className="w-[220px]" />
            <col className="w-[170px]" />
          </colgroup>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description · Client</th>
              <th>Sale · Commission</th>
              <th>Notes</th>
              <th>Cycle · Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  No entries match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const pct = e.commissionRate * 100;
                const ratePretty =
                  Math.abs(pct - Math.round(pct)) < 0.05
                    ? `${Math.round(pct)}%`
                    : `${pct.toFixed(1)}%`;
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-sm text-slate-700">
                      {formatDate(e.saleDate)}
                    </td>
                    <td>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 line-clamp-2">
                            {e.description}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {e.clientName ?? "—"}
                          </div>
                        </div>
                        <AttachmentChip
                          count={e.attachments.length}
                          onClick={() => setViewerEntry(e)}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="text-xs text-slate-500 tabular-nums">
                        Sale {formatCurrency(e.saleAmount)}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(commission(e.saleAmount, e.commissionRate))}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 tabular-nums",
                            e.commissionRate >= 0.5
                              ? "bg-brand-50 text-brand-700 ring-brand-200"
                              : "bg-slate-100 text-slate-700 ring-slate-200"
                          )}
                        >
                          {ratePretty}
                        </span>
                      </div>
                    </td>
                    <td>
                      {e.notes ? (
                        <div className="flex items-start gap-1.5 text-xs text-slate-600">
                          <StickyNote className="h-3.5 w-3.5 flex-none mt-0.5 text-brand-500" />
                          <span className="line-clamp-2 whitespace-pre-wrap">
                            {e.notes}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <span className="truncate">{e.cycleLabel}</span>
                        {e.rolled && (
                          <span
                            title="Rolled over from a previous cycle"
                            className="inline-flex flex-none items-center"
                          >
                            <ArrowRightCircle className="h-3.5 w-3.5 text-brand-500" />
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={e.status} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AttachmentViewer
        open={!!viewerEntry}
        onClose={() => setViewerEntry(null)}
        title={viewerEntry?.description ?? ""}
        attachments={viewerEntry?.attachments ?? []}
      />
    </div>
  );
}
