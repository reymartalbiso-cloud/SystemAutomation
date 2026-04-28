/**
 * System-computed commission breakdown.
 *
 * Showcase rules — replace with the client's real rules when they finalize:
 *
 *   1. Base commission: 10% of the gross sale
 *   2. Tier bonus: +2% on the portion above ₱500k, +3% on the portion above ₱1M
 *   3. Battery uplift: +2% on the gross sale if the entry mentions a battery
 *      backup product (Powerwall, Enphase, etc.)
 *
 * Pure function — recompute on demand from entry data so changing the
 * rules later instantly reflects on every entry.
 */

import type { Entry } from "./types";

export type BreakdownLine = {
  id: string;
  label: string;
  detail: string;
  amount: number;
  /** True for the base; false for additive bonuses */
  base?: boolean;
};

export type CommissionBreakdown = {
  saleAmount: number;
  lines: BreakdownLine[];
  total: number;
  effectiveRate: number;
};

export const RULES = {
  basePercent: 0.10,
  tier1Threshold: 500_000,
  tier1Bonus: 0.02,
  tier2Threshold: 1_000_000,
  tier2Bonus: 0.03,
  batteryUpliftPercent: 0.02,
};

const BATTERY_REGEX = /battery|powerwall|backup\s*power|enphase\s*iq/i;

function looksLikeBatteryDeal(entry: Pick<Entry, "description" | "notes">): boolean {
  const haystack = `${entry.description ?? ""} ${entry.notes ?? ""}`;
  return BATTERY_REGEX.test(haystack);
}

export function computeBreakdown(
  entry: Pick<Entry, "description" | "notes" | "saleAmount">
): CommissionBreakdown {
  const sale = Math.max(0, entry.saleAmount);
  const lines: BreakdownLine[] = [];

  // 1. Base
  const base = sale * RULES.basePercent;
  lines.push({
    id: "base",
    label: "Base commission",
    detail: `${(RULES.basePercent * 100).toFixed(0)}% × ${money(sale)}`,
    amount: base,
    base: true,
  });

  // 2. Tier 1
  const tier1Excess = Math.max(0, Math.min(sale, RULES.tier2Threshold) - RULES.tier1Threshold);
  const tier1 = tier1Excess * RULES.tier1Bonus;
  lines.push({
    id: "tier1",
    label: `Tier 1 bonus`,
    detail:
      tier1Excess > 0
        ? `+${(RULES.tier1Bonus * 100).toFixed(0)}% on ${money(tier1Excess)} above ${money(RULES.tier1Threshold)}`
        : `Sale below ${money(RULES.tier1Threshold)} — no bonus`,
    amount: tier1,
  });

  // 3. Tier 2
  const tier2Excess = Math.max(0, sale - RULES.tier2Threshold);
  const tier2 = tier2Excess * RULES.tier2Bonus;
  lines.push({
    id: "tier2",
    label: `Tier 2 bonus`,
    detail:
      tier2Excess > 0
        ? `+${(RULES.tier2Bonus * 100).toFixed(0)}% on ${money(tier2Excess)} above ${money(RULES.tier2Threshold)}`
        : `Sale below ${money(RULES.tier2Threshold)} — no bonus`,
    amount: tier2,
  });

  // 4. Battery uplift
  const isBattery = looksLikeBatteryDeal(entry);
  const battery = isBattery ? sale * RULES.batteryUpliftPercent : 0;
  lines.push({
    id: "battery",
    label: "Battery / backup uplift",
    detail: isBattery
      ? `+${(RULES.batteryUpliftPercent * 100).toFixed(0)}% — battery product detected in description`
      : `No battery / backup detected`,
    amount: battery,
  });

  const total = lines.reduce((s, l) => s + l.amount, 0);
  const effectiveRate = sale > 0 ? total / sale : 0;

  return {
    saleAmount: sale,
    lines,
    total,
    effectiveRate,
  };
}

function money(n: number): string {
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}
