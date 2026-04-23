"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightCircle,
  CheckCircle2,
  FastForward,
  Loader2,
  Pencil,
  RotateCcw,
  Search,
  StickyNote,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Modal } from "@/components/modal";
import { commission, formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  bulkRolloverCycle as storeBulkRollover,
  rolloverEntry as storeRollover,
  updateEntry as storeUpdateEntry,
} from "@/lib/store";

type Entry = {
  id: string;
  saleDate: string;
  description: string;
  clientName: string | null;
  saleAmount: number;
  commissionRate: number;
  status: string;
  notes: string | null;
  cycleId: string;
  cycleLabel: string;
  user: { id: string; fullName: string };
  rolled: boolean;
};

type Cycle = { id: string; label: string; endsOn: string };
type UserLite = { id: string; fullName: string };

type Props = {
  currentCycleId: string;
  cycles: Cycle[];
  users: UserLite[];
  entries: Entry[];
};

export function AdminConsole({ currentCycleId, cycles, users, entries }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cycleFilter, setCycleFilter] = useState<string>(currentCycleId);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PAID">(
    "ALL"
  );
  const [userFilter, setUserFilter] = useState<string>("ALL");

  const [rolloverEntry, setRolloverEntry] = useState<Entry | null>(null);
  const [bulkRolloverCycle, setBulkRolloverCycle] = useState<Cycle | null>(null);
  const [notesEntry, setNotesEntry] = useState<Entry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (cycleFilter !== "ALL" && e.cycleId !== cycleFilter) return false;
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
      if (userFilter !== "ALL" && e.user.id !== userFilter) return false;
      if (!q) return true;
      return (
        e.description.toLowerCase().includes(q) ||
        (e.clientName ?? "").toLowerCase().includes(q) ||
        e.user.fullName.toLowerCase().includes(q) ||
        e.cycleLabel.toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q) ||
        String(e.saleAmount).includes(q)
      );
    });
  }, [entries, query, cycleFilter, statusFilter, userFilter]);

  const totals = useMemo(() => {
    const sales = filtered.reduce((s, e) => s + e.saleAmount, 0);
    const pendingCom = filtered
      .filter((e) => e.status === "PENDING")
      .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);
    const paidCom = filtered
      .filter((e) => e.status === "PAID")
      .reduce((s, e) => s + commission(e.saleAmount, e.commissionRate), 0);
    return { sales, pendingCom, paidCom };
  }, [filtered]);

  function patchEntry(
    id: string,
    body: {
      status?: "PAID" | "PENDING";
      commissionAmount?: number;
      commissionRate?: number;
      notes?: string | null;
    }
  ) {
    setBusyId(id);
    storeUpdateEntry(id, body);
    // brief busy state so users see the update registered
    setTimeout(() => setBusyId(null), 120);
  }

  async function submitRollover(reason: string) {
    if (!rolloverEntry) return;
    setBusyId(rolloverEntry.id);
    const err = storeRollover(rolloverEntry.id, reason);
    setBusyId(null);
    if (err) {
      alert(err);
      return;
    }
    setRolloverEntry(null);
  }

  async function submitBulkRollover(reason: string) {
    if (!bulkRolloverCycle) return;
    const { movedCount, error } = storeBulkRollover(bulkRolloverCycle.id, reason);
    if (error) {
      alert(error);
      return;
    }
    setBulkRolloverCycle(null);
    alert(`Moved ${movedCount} pending entries to the next cycle.`);
  }

  return (
    <section className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search across all billings — person, client, description, notes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="input sm:max-w-[200px]"
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
            >
              <option value="ALL">All cycles</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                  {c.id === currentCycleId ? "  · current" : ""}
                </option>
              ))}
            </select>
            <select
              className="input sm:max-w-[180px]"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="ALL">All personnel</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              {(["ALL", "PENDING", "PAID"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-medium transition-colors",
                    statusFilter === f
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {f === "ALL" ? "All" : f === "PENDING" ? "Pending" : "Paid"}
                </button>
              ))}
            </div>
            <button
              className="btn-secondary"
              onClick={() => {
                const cycle = cycles.find((c) => c.id === cycleFilter);
                if (cycle) setBulkRolloverCycle(cycle);
              }}
              disabled={cycleFilter === "ALL"}
              title={
                cycleFilter === "ALL"
                  ? "Pick a specific cycle to roll over its pending entries"
                  : "Move all pending entries in this cycle to the next one"
              }
            >
              <FastForward className="h-4 w-4" />
              Roll unpaid → next
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-4">
          <FilterSummary label="Entries" value={String(filtered.length)} />
          <FilterSummary label="Sales" value={formatCurrency(totals.sales)} />
          <FilterSummary
            label="Pending commission"
            value={formatCurrency(totals.pendingCom)}
            tone="amber"
          />
          <FilterSummary
            label="Paid commission"
            value={formatCurrency(totals.paidCom)}
            tone="emerald"
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table w-full">
          <colgroup>
            <col className="w-[180px]" />
            <col />
            <col className="w-[180px]" />
            <col className="w-[220px]" />
            <col className="w-[170px]" />
            <col className="w-[140px]" />
          </colgroup>
          <thead>
            <tr>
              <th>Consultant / Date</th>
              <th>Description · Client</th>
              <th>Sale · Commission</th>
              <th>Notes</th>
              <th>Cycle · Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No entries match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const busy = busyId === e.id;
                return (
                  <tr key={e.id} className={busy ? "opacity-60" : ""}>
                    <td>
                      <div className="font-medium text-slate-900">
                        {e.user.fullName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(e.saleDate)}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-900 line-clamp-2">
                        {e.description}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {e.clientName ?? "—"}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs text-slate-500 tabular-nums">
                        Sale {formatCurrency(e.saleAmount)}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <CommissionEditor
                          saleAmount={e.saleAmount}
                          rate={e.commissionRate}
                          disabled={busy}
                          onSave={(amount) =>
                            patchEntry(e.id, { commissionAmount: amount })
                          }
                        />
                        <RateReadout rate={e.commissionRate} />
                      </div>
                    </td>
                    <td>
                      <NotesCell
                        notes={e.notes}
                        onEdit={() => setNotesEntry(e)}
                      />
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
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {e.status === "PENDING" ? (
                          <>
                            <button
                              className="btn-secondary !px-2 !py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200"
                              title="Mark paid"
                              onClick={() =>
                                patchEntry(e.id, { status: "PAID" })
                              }
                              disabled={busy}
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Paid
                            </button>
                            <button
                              className="btn-ghost !px-2 !py-1.5"
                              title="Roll over to next cycle"
                              onClick={() => setRolloverEntry(e)}
                              disabled={busy}
                            >
                              <ArrowRightCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-ghost !px-2 !py-1.5 text-slate-500 hover:text-amber-600"
                            title="Revert to pending"
                            onClick={() =>
                              patchEntry(e.id, { status: "PENDING" })
                            }
                            disabled={busy}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <RolloverReasonModal
        entry={rolloverEntry}
        onClose={() => setRolloverEntry(null)}
        onSubmit={submitRollover}
      />
      <BulkRolloverModal
        cycle={bulkRolloverCycle}
        pendingCount={
          bulkRolloverCycle
            ? entries.filter(
                (e) =>
                  e.cycleId === bulkRolloverCycle.id && e.status === "PENDING"
              ).length
            : 0
        }
        onClose={() => setBulkRolloverCycle(null)}
        onSubmit={submitBulkRollover}
      />
      <NotesModal
        entry={notesEntry}
        onClose={() => setNotesEntry(null)}
        onSubmit={async (newNotes) => {
          if (!notesEntry) return;
          await patchEntry(notesEntry.id, { notes: newNotes });
          setNotesEntry(null);
        }}
      />
    </section>
  );
}

function FilterSummary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber" | "emerald";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "emerald"
      ? "text-emerald-700"
      : "text-slate-900";
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", toneClass)}>
        {value}
      </div>
    </div>
  );
}

/**
 * Inline editor for the commission amount (peso). On save, the API
 * recalculates the rate as commission / saleAmount.
 */
function CommissionEditor({
  saleAmount,
  rate,
  onSave,
  disabled,
}: {
  saleAmount: number;
  rate: number;
  onSave: (amount: number) => void;
  disabled?: boolean;
}) {
  const initialAmount = Math.round(saleAmount * rate);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(initialAmount));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(String(Math.round(saleAmount * rate)));
  }, [saleAmount, rate]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const num = Number(value.replace(/,/g, ""));
    if (!Number.isNaN(num) && num >= 0 && Math.round(num) !== initialAmount) {
      onSave(Math.round(num));
    } else {
      setValue(String(initialAmount));
    }
    setEditing(false);
  }

  function cancel() {
    setValue(String(initialAmount));
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="inline-flex items-center gap-1">
        <span className="text-xs text-slate-500">₱</span>
        <input
          ref={inputRef}
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="w-28 rounded-md border border-brand-300 bg-white px-2 py-1 text-sm font-semibold tabular-nums shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums text-slate-900",
        "hover:bg-brand-50 hover:text-brand-700 transition-colors",
        disabled && "cursor-not-allowed opacity-50"
      )}
      title="Click to edit commission"
    >
      {formatCurrency(initialAmount)}
      <Pencil className="h-3 w-3 text-slate-300 group-hover:text-brand-500" />
    </button>
  );
}

function RateReadout({ rate }: { rate: number }) {
  const pct = rate * 100;
  const display = Math.abs(pct - Math.round(pct)) < 0.05
    ? `${Math.round(pct)}%`
    : `${pct.toFixed(1)}%`;
  const tone = rate >= 0.5 ? "brand" : "slate";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 tabular-nums",
        tone === "brand"
          ? "bg-brand-50 text-brand-700 ring-brand-200"
          : "bg-slate-100 text-slate-700 ring-slate-200"
      )}
      title="Auto-calculated from commission / sale"
    >
      {display}
    </span>
  );
}

function NotesCell({
  notes,
  onEdit,
}: {
  notes: string | null;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex w-full items-start gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      title="Click to view or edit note"
    >
      <StickyNote
        className={cn(
          "h-3.5 w-3.5 flex-none mt-0.5",
          notes ? "text-brand-500" : "text-slate-300 group-hover:text-slate-500"
        )}
      />
      {notes ? (
        <span className="line-clamp-2 whitespace-pre-wrap">{notes}</span>
      ) : (
        <span className="italic text-slate-400">Add note</span>
      )}
    </button>
  );
}

function RolloverReasonModal({
  entry,
  onClose,
  onSubmit,
}: {
  entry: Entry | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReason("");
    setSubmitting(false);
  }, [entry]);

  if (!entry) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason.trim());
    setSubmitting(false);
  }

  return (
    <Modal
      open={!!entry}
      onClose={onClose}
      title="Move to next cycle"
      description={`Why is "${entry.description}" being moved forward? This will be added to the entry's notes.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-800">
              {entry.user.fullName}
            </span>{" "}
            · {entry.clientName ?? "No client"} ·{" "}
            {formatCurrency(entry.saleAmount)}
          </div>
          <div className="mt-1 text-slate-500">From: {entry.cycleLabel}</div>
        </div>
        <div>
          <label className="label" htmlFor="reason">
            Reason for rollover
          </label>
          <textarea
            id="reason"
            rows={3}
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Client payment delayed — deferred to next Friday cycle."
            autoFocus
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !reason.trim()}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightCircle className="h-4 w-4" />
            )}
            Move to next cycle
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BulkRolloverModal({
  cycle,
  pendingCount,
  onClose,
  onSubmit,
}: {
  cycle: Cycle | null;
  pendingCount: number;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReason("");
    setSubmitting(false);
  }, [cycle]);

  if (!cycle) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason.trim());
    setSubmitting(false);
  }

  return (
    <Modal
      open={!!cycle}
      onClose={onClose}
      title="Close cycle — roll unpaid to next"
      description={`Move ${pendingCount} pending ${
        pendingCount === 1 ? "entry" : "entries"
      } from "${cycle.label}" into the next Friday cycle.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="bulkReason">
            Reason (added to every moved entry)
          </label>
          <textarea
            id="bulkReason"
            rows={3}
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Cycle closed — verification outstanding; deferred to next Friday."
            autoFocus
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !reason.trim() || pendingCount === 0}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FastForward className="h-4 w-4" />
            )}
            Move {pendingCount}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NotesModal({
  entry,
  onClose,
  onSubmit,
}: {
  entry: Entry | null;
  onClose: () => void;
  onSubmit: (notes: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValue(entry?.notes ?? "");
    setSubmitting(false);
  }, [entry]);

  if (!entry) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(value);
    setSubmitting(false);
  }

  return (
    <Modal
      open={!!entry}
      onClose={onClose}
      title="Edit notes"
      description={`${entry.user.fullName} · ${entry.description}`}
      widthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          rows={6}
          className="input font-mono text-[13px]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add context, references, client requests, or leave blank to clear."
          autoFocus
        />
        <p className="text-xs text-slate-500">
          Rollover messages are added here automatically when you move an entry
          forward.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save notes
          </button>
        </div>
      </form>
    </Modal>
  );
}
