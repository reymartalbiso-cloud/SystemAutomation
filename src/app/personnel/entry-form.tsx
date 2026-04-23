"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createEntry } from "@/lib/store";

export function EntryForm({ userId }: { userId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [saleDate, setSaleDate] = useState(today);
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = Number(saleAmount);
    if (!description.trim() || !amount || Number.isNaN(amount) || amount <= 0) {
      setError("Description and a positive sale amount are required.");
      return;
    }
    setLoading(true);
    // tiny artificial delay so the spinner is visible; feels more real
    setTimeout(() => {
      createEntry({
        userId,
        saleDate,
        description,
        clientName: clientName || null,
        saleAmount: amount,
      });
      setDescription("");
      setClientName("");
      setSaleAmount("");
      setSaleDate(today);
      setLoading(false);
    }, 150);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="saleDate">
            Sale date
          </label>
          <input
            id="saleDate"
            type="date"
            className="input"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="saleAmount">
            Sale amount (₱)
          </label>
          <input
            id="saleAmount"
            type="number"
            min="0"
            step="1"
            className="input"
            value={saleAmount}
            onChange={(e) => setSaleAmount(e.target.value)}
            placeholder="0"
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <input
          id="description"
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 8kW rooftop solar install"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="clientName">
          Client (optional)
        </label>
        <input
          id="clientName"
          className="input"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="e.g. The Johnson Residence"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Submit for verification
      </button>
      <p className="text-xs text-slate-500">
        New entries are marked <span className="font-medium">Pending</span>{" "}
        until the admin verifies and sets the commission.
      </p>
    </form>
  );
}
