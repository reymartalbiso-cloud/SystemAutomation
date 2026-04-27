"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Loader2,
  Pencil,
  Power,
  PowerOff,
  Search,
  UserPlus,
} from "lucide-react";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { commission, formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  createUser as storeCreateUser,
  updateUser as storeUpdateUser,
  StoreQuotaError,
} from "@/lib/store";
import type { Entry, User } from "@/lib/types";

type Props = {
  users: User[];
  entries: Entry[];
};

type EditingUser = { id: string; fullName: string; password: string };

export function PersonnelTab({ users, entries }: Props) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditingUser | null>(null);

  const personnel = useMemo(
    () => users.filter((u) => u.role === "PERSONNEL"),
    [users]
  );

  const stats = useMemo(() => {
    const map = new Map<
      string,
      {
        entries: number;
        pending: number;
        ytdSales: number;
        ytdEarned: number;
      }
    >();
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    for (const u of personnel) {
      map.set(u.id, { entries: 0, pending: 0, ytdSales: 0, ytdEarned: 0 });
    }
    for (const e of entries) {
      const s = map.get(e.userId);
      if (!s) continue;
      s.entries += 1;
      if (e.status === "PENDING") s.pending += 1;
      if (e.saleDate >= yearStart) s.ytdSales += e.saleAmount;
      if (e.status === "PAID" && e.paidAt && e.paidAt >= yearStart) {
        s.ytdEarned += commission(e.saleAmount, e.commissionRate);
      }
    }
    return map;
  }, [personnel, entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personnel
      .filter((u) => (showInactive ? true : u.active))
      .filter(
        (u) =>
          !q ||
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q)
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [personnel, query, showInactive]);

  function toggleActive(user: User) {
    try {
      storeUpdateUser(user.id, { active: !user.active });
      toast.success(
        user.active ? "Account deactivated" : "Account reactivated",
        user.fullName
      );
    } catch (err) {
      if (err instanceof StoreQuotaError) {
        toast.error("Storage full", err.message);
      } else {
        toast.error("Update failed", "Please try again.");
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by name or username…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Show inactive
            </label>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setAdding(true)}
            >
              <UserPlus className="h-4 w-4" />
              Add personnel
            </button>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table w-full">
          <colgroup>
            <col />
            <col className="w-[140px]" />
            <col className="w-[110px]" />
            <col className="w-[170px]" />
            <col className="w-[170px]" />
            <col className="w-[140px]" />
          </colgroup>
          <thead>
            <tr>
              <th>Name · Username</th>
              <th>Joined</th>
              <th>Entries</th>
              <th>YTD sales</th>
              <th>YTD earned</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No personnel match.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const s = stats.get(u.id) ?? {
                  entries: 0,
                  pending: 0,
                  ytdSales: 0,
                  ytdEarned: 0,
                };
                return (
                  <tr key={u.id} className={cn(!u.active && "opacity-60")}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
                          {u.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">
                            {u.fullName}
                            {!u.active && (
                              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                                inactive
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-600">
                      {formatDate(u.createdAt)}
                    </td>
                    <td>
                      <div className="text-sm font-semibold tabular-nums text-slate-900">
                        {s.entries}
                      </div>
                      {s.pending > 0 && (
                        <div className="text-[11px] text-amber-700">
                          {s.pending} pending
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(s.ytdSales)}
                    </td>
                    <td className="whitespace-nowrap text-sm font-semibold tabular-nums text-emerald-700">
                      {formatCurrency(s.ytdEarned)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="btn-ghost !px-2"
                          title="Edit"
                          onClick={() =>
                            setEditing({
                              id: u.id,
                              fullName: u.fullName,
                              password: "",
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className={cn(
                            "btn-ghost !px-2",
                            u.active
                              ? "hover:text-red-600"
                              : "hover:text-emerald-600"
                          )}
                          title={u.active ? "Deactivate" : "Reactivate"}
                          onClick={() => toggleActive(u)}
                        >
                          {u.active ? (
                            <PowerOff className="h-3.5 w-3.5" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AddUserModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(name) =>
          toast.success("Personnel added", `${name} can now sign in.`)
        }
        existingUsernames={users.map((u) => u.username.toLowerCase())}
      />
      <EditUserModal
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={(name) =>
          toast.success("Saved", `${name}'s profile has been updated.`)
        }
      />
    </div>
  );
}

function AddUserModal({
  open,
  onClose,
  onCreated,
  existingUsernames,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
  existingUsernames: string[];
}) {
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("personnel123");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFullName("");
    setUsername("");
    setPassword("personnel123");
    setSubmitting(false);
  }

  function close() {
    reset();
    onClose();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const lower = username.trim().toLowerCase();
      if (existingUsernames.includes(lower)) {
        toast.error("Username taken", `"${lower}" already exists.`);
        return;
      }
      const { user, error } = storeCreateUser({
        username,
        password,
        fullName,
        role: "PERSONNEL",
      });
      if (error || !user) {
        toast.error("Could not create user", error ?? "Try again.");
        return;
      }
      onCreated(user.fullName);
      close();
    } catch (err) {
      if (err instanceof StoreQuotaError) {
        toast.error("Storage full", err.message);
      } else {
        toast.error("Create failed", "Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add personnel"
      description="Create a sales consultant account. They'll log in with these credentials."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label" htmlFor="newName">
            Full name
          </label>
          <input
            id="newName"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Maria Santos"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="newUser">
            Username
          </label>
          <input
            id="newUser"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            placeholder="e.g. maria"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="newPass">
            Initial password
          </label>
          <input
            id="newPass"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Share this with the personnel. They'll use it on first sign-in.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={close}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Create account
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: EditingUser | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  // Re-init form state whenever a different user opens the modal
  useEffect(() => {
    setFullName(editing?.fullName ?? "");
    setPassword("");
    setSubmitting(false);
  }, [editing]);

  if (!editing) return null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      const patch: { fullName?: string; password?: string } = {};
      if (fullName.trim() && fullName.trim() !== editing.fullName) {
        patch.fullName = fullName.trim();
      }
      if (password.trim()) {
        patch.password = password.trim();
      }
      if (Object.keys(patch).length === 0) {
        toast.info("Nothing to save", "No changes detected.");
        return;
      }
      storeUpdateUser(editing.id, patch);
      onSaved(patch.fullName ?? editing.fullName);
      onClose();
    } catch (err) {
      if (err instanceof StoreQuotaError) {
        toast.error("Storage full", err.message);
      } else {
        toast.error("Save failed", "Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={!!editing}
      onClose={onClose}
      title="Edit personnel"
      description="Update the display name or reset the password."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label" htmlFor="editName">
            Full name
          </label>
          <input
            id="editName"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="editPass">
            New password (leave blank to keep current)
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="editPass"
              className="input pl-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
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
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

