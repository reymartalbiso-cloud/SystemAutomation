import { prisma } from "./db";

export function nextFriday(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun ... 5 = Fri ... 6 = Sat
  const diff = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function cycleLabel(endsOn: Date): string {
  const start = new Date(endsOn);
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(endsOn)}`;
}

/**
 * Get or create the current billing cycle (ending on next/this Friday).
 */
export async function getOrCreateCurrentCycle() {
  const ends = nextFriday();
  const existing = await prisma.billingCycle.findUnique({
    where: { endsOn: ends },
  });
  if (existing) return existing;
  return prisma.billingCycle.create({
    data: { endsOn: ends, label: cycleLabel(ends) },
  });
}

/**
 * Get or create the cycle following a given cycle.
 */
export async function getOrCreateNextCycleAfter(endsOn: Date) {
  const next = new Date(endsOn);
  next.setDate(next.getDate() + 7);
  const existing = await prisma.billingCycle.findUnique({
    where: { endsOn: next },
  });
  if (existing) return existing;
  return prisma.billingCycle.create({
    data: { endsOn: next, label: cycleLabel(next) },
  });
}
