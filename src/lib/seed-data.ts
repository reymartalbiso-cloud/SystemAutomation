import type { StoreData, Entry, User, Cycle } from "./types";

function nextFriday(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function cycleLabel(endsOn: Date): string {
  const start = new Date(endsOn);
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(endsOn)}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function id(prefix: string, n: number) {
  return `${prefix}_${n.toString(36)}`;
}

type EntrySeed = {
  username: string;
  cycleIndex: number;
  daysBeforeCycleEnd: number;
  description: string;
  clientName: string;
  saleAmount: number;
  commissionRate: number;
  status: "PAID" | "PENDING";
  notes?: string;
  paidDaysAfterCycleEnd?: number;
  rolledFromCycleIndex?: number;
};

export function buildSeed(): StoreData {
  const now = new Date().toISOString();

  const users: User[] = [
    { id: "u_admin", username: "admin", password: "admin123", fullName: "Sarah Reyes", role: "ADMIN" },
    { id: "u_maria", username: "maria", password: "personnel123", fullName: "Maria Santos", role: "PERSONNEL" },
    { id: "u_james", username: "james", password: "personnel123", fullName: "James Dela Cruz", role: "PERSONNEL" },
    { id: "u_anna", username: "anna", password: "personnel123", fullName: "Anna Lim", role: "PERSONNEL" },
    { id: "u_paulo", username: "paulo", password: "personnel123", fullName: "Paulo Mendoza", role: "PERSONNEL" },
    { id: "u_teresa", username: "teresa", password: "personnel123", fullName: "Teresa Aquino", role: "PERSONNEL" },
  ];

  const currentFriday = nextFriday(new Date());
  const cycleOffsets = [-6, -5, -4, -3, -2, -1, 0, 1];
  const cycleDates = cycleOffsets.map((w) => addDays(currentFriday, w * 7));

  const cycles: Cycle[] = cycleDates.map((endsOn, i) => ({
    id: id("c", i),
    endsOn: endsOn.toISOString(),
    label: cycleLabel(endsOn),
  }));

  const userByUsername: Record<string, string> = Object.fromEntries(
    users.map((u) => [u.username, u.id])
  );

  const seeds: EntrySeed[] = [
    // 6 weeks ago
    { username: "maria", cycleIndex: 0, daysBeforeCycleEnd: 5, description: "8kW residential rooftop solar install", clientName: "The Johnson Residence", saleAmount: 420000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 0, daysBeforeCycleEnd: 3, description: "12kW system + Tesla Powerwall", clientName: "Riverside Bakery", saleAmount: 680000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "anna", cycleIndex: 0, daysBeforeCycleEnd: 4, description: "Solar consultation & site survey", clientName: "Hernandez Family", saleAmount: 8500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "paulo", cycleIndex: 0, daysBeforeCycleEnd: 6, description: "6kW rooftop + 2x battery storage", clientName: "Maple Ridge Apartments", saleAmount: 520000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "teresa", cycleIndex: 0, daysBeforeCycleEnd: 2, description: "Net metering application + filing", clientName: "Green Valley Farm", saleAmount: 12000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },

    // 5 weeks ago
    { username: "maria", cycleIndex: 1, daysBeforeCycleEnd: 5, description: "Annual solar monitoring service", clientName: "Oak Street Medical", saleAmount: 28000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "maria", cycleIndex: 1, daysBeforeCycleEnd: 2, description: "5kW rooftop solar install", clientName: "Dela Rosa Household", saleAmount: 285000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "james", cycleIndex: 1, daysBeforeCycleEnd: 4, description: "20kW commercial solar array — phase 1", clientName: "Bayview Logistics", saleAmount: 950000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "anna", cycleIndex: 1, daysBeforeCycleEnd: 3, description: "Site assessment + panel layout plan", clientName: "Sunrise Daycare Center", saleAmount: 9500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "paulo", cycleIndex: 1, daysBeforeCycleEnd: 5, description: "Inverter upgrade — Enphase IQ8", clientName: "The Williams Residence", saleAmount: 65000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 3 },
    { username: "teresa", cycleIndex: 1, daysBeforeCycleEnd: 4, description: "10kW rooftop + 13.5kWh Powerwall", clientName: "Pinecrest Lodge", saleAmount: 780000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 3 },

    // 4 weeks ago
    { username: "maria", cycleIndex: 2, daysBeforeCycleEnd: 6, description: "8kW rooftop install + monitoring", clientName: "Cedar Cafe & Bakery", saleAmount: 445000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 2, daysBeforeCycleEnd: 3, description: "Commercial solar — 30kW array", clientName: "Harbor Goods Warehouse", saleAmount: 1250000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 2, daysBeforeCycleEnd: 1, description: "Battery backup expansion (3x Powerwall)", clientName: "Bayside Fitness Center", saleAmount: 420000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "anna", cycleIndex: 2, daysBeforeCycleEnd: 5, description: "Solar quote + proposal package", clientName: "Hillside Bed & Breakfast", saleAmount: 7500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "paulo", cycleIndex: 2, daysBeforeCycleEnd: 4, description: "Annual maintenance & panel cleaning", clientName: "Mango Orchard Homes HOA", saleAmount: 18000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "teresa", cycleIndex: 2, daysBeforeCycleEnd: 2, description: "4kW entry-level rooftop install", clientName: "The Cortez Residence", saleAmount: 215000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },

    // 3 weeks ago
    { username: "maria", cycleIndex: 3, daysBeforeCycleEnd: 4, description: "15kW rooftop + monitoring suite", clientName: "Northwind Studio", saleAmount: 820000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 3 },
    { username: "james", cycleIndex: 3, daysBeforeCycleEnd: 5, description: "50kW commercial ground-mount", clientName: "Bayview Logistics", saleAmount: 2100000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 3 },
    { username: "anna", cycleIndex: 3, daysBeforeCycleEnd: 2, description: "Net metering paperwork & utility liaison", clientName: "Greenleaf Grocers", saleAmount: 11000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 4 },
    { username: "paulo", cycleIndex: 3, daysBeforeCycleEnd: 3, description: "6kW rooftop + Enphase microinverters", clientName: "The Gutierrez Household", saleAmount: 355000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 4 },
    { username: "teresa", cycleIndex: 3, daysBeforeCycleEnd: 6, description: "10kW rooftop w/ ground-mount extension", clientName: "Pinecrest Lodge", saleAmount: 650000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 3, notes: "Referred by Maria Santos — split credit agreed verbally." },

    // 2 weeks ago
    { username: "maria", cycleIndex: 4, daysBeforeCycleEnd: 5, description: "8kW rooftop + battery backup", clientName: "Acme Retail HQ", saleAmount: 625000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "maria", cycleIndex: 4, daysBeforeCycleEnd: 1, description: "System inspection + re-certification", clientName: "Cedar Cafe & Bakery", saleAmount: 8500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "james", cycleIndex: 4, daysBeforeCycleEnd: 3, description: "25kW commercial solar — phase 1", clientName: "Harbor Goods Warehouse", saleAmount: 1080000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "anna", cycleIndex: 4, daysBeforeCycleEnd: 4, description: "Solar savings analysis report", clientName: "Pinecrest Lodge", saleAmount: 9000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "paulo", cycleIndex: 4, daysBeforeCycleEnd: 6, description: "Panel repair — 2 units replaced under warranty", clientName: "Bloom Floral Retail", saleAmount: 7500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 3, rolledFromCycleIndex: 3, notes: "[Rolled from 3 weeks ago] Warranty paperwork pending at time of original cycle." },
    { username: "teresa", cycleIndex: 4, daysBeforeCycleEnd: 2, description: "6kW rooftop solar — standard install", clientName: "Mango Orchard Homes HOA", saleAmount: 325000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },

    // last week
    { username: "maria", cycleIndex: 5, daysBeforeCycleEnd: 4, description: "Solar + battery backup — 10kW system", clientName: "Acme Retail HQ", saleAmount: 695000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 5, daysBeforeCycleEnd: 3, description: "Commercial solar — 40kW expansion", clientName: "Bayside Fitness Center", saleAmount: 1650000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 5, daysBeforeCycleEnd: 6, description: "Monitoring platform setup (annual)", clientName: "Harbor Goods Warehouse", saleAmount: 32000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "anna", cycleIndex: 5, daysBeforeCycleEnd: 2, description: "Site survey + proposal — residential", clientName: "Greenleaf Grocers", saleAmount: 6500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "paulo", cycleIndex: 5, daysBeforeCycleEnd: 5, description: "8kW rooftop + microinverters", clientName: "Cedar Cafe & Bakery", saleAmount: 465000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "teresa", cycleIndex: 5, daysBeforeCycleEnd: 3, description: "Battery backup upgrade (Powerwall 3)", clientName: "Pinecrest Lodge", saleAmount: 380000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },

    // current cycle
    { username: "maria", cycleIndex: 6, daysBeforeCycleEnd: 6, description: "12kW rooftop + 2x Powerwall install", clientName: "Orchid Hills Subdivision", saleAmount: 820000, commissionRate: 0.7, status: "PENDING" },
    { username: "maria", cycleIndex: 6, daysBeforeCycleEnd: 3, description: "Panel cleaning + annual inspection", clientName: "Bloom Floral Retail", saleAmount: 8500, commissionRate: 0.3, status: "PENDING" },
    { username: "maria", cycleIndex: 6, daysBeforeCycleEnd: 1, description: "Solar consultation (free) → upsell quote", clientName: "The Reyes Family", saleAmount: 7000, commissionRate: 0.3, status: "PENDING" },

    { username: "james", cycleIndex: 6, daysBeforeCycleEnd: 5, description: "80kW commercial solar — kickoff deposit", clientName: "Bayview Logistics", saleAmount: 1450000, commissionRate: 0.7, status: "PENDING" },
    { username: "james", cycleIndex: 6, daysBeforeCycleEnd: 2, description: "Ground-mount permitting & engineering", clientName: "Harbor Goods Warehouse", saleAmount: 42000, commissionRate: 0.3, status: "PENDING" },
    { username: "james", cycleIndex: 6, daysBeforeCycleEnd: 7, description: "Inverter performance diagnostic", clientName: "Greenleaf Grocers", saleAmount: 22000, commissionRate: 0.3, status: "PENDING", rolledFromCycleIndex: 5, notes: "[Rolled from last week] Customer requested invoice reissue — delayed to current cycle." },

    { username: "anna", cycleIndex: 6, daysBeforeCycleEnd: 4, description: "Proposal package + financing options", clientName: "Northwind Studio", saleAmount: 12500, commissionRate: 0.3, status: "PENDING" },
    { username: "anna", cycleIndex: 6, daysBeforeCycleEnd: 1, description: "Solar savings workshop — 12 attendees", clientName: "Sunrise Daycare Center", saleAmount: 18000, commissionRate: 0.7, status: "PENDING" },

    { username: "paulo", cycleIndex: 6, daysBeforeCycleEnd: 3, description: "15kW rooftop + Enphase IQ8 inverters", clientName: "Maple Ridge Apartments", saleAmount: 875000, commissionRate: 0.7, status: "PENDING" },
    { username: "paulo", cycleIndex: 6, daysBeforeCycleEnd: 2, description: "Roof reinforcement + panel mount coordination", clientName: "The Villanueva Residence", saleAmount: 95000, commissionRate: 0.3, status: "PENDING" },
    { username: "paulo", cycleIndex: 6, daysBeforeCycleEnd: 6, description: "Solar panel replacement (wind damage)", clientName: "Riverside Bakery", saleAmount: 58000, commissionRate: 0.7, status: "PENDING", rolledFromCycleIndex: 5, notes: "[Rolled from last week] Insurance claim documentation in progress." },

    { username: "teresa", cycleIndex: 6, daysBeforeCycleEnd: 5, description: "6kW rooftop solar install", clientName: "The Garcia Household", saleAmount: 345000, commissionRate: 0.7, status: "PENDING" },
    { username: "teresa", cycleIndex: 6, daysBeforeCycleEnd: 0, description: "Battery backup consultation", clientName: "Oak Street Medical", saleAmount: 6500, commissionRate: 0.7, status: "PENDING" },
  ];

  const entries: Entry[] = seeds.map((s, i) => {
    const cycle = cycles[s.cycleIndex];
    const cycleEnd = new Date(cycle.endsOn);
    const saleDate = addDays(cycleEnd, -s.daysBeforeCycleEnd);
    const paidAt =
      s.status === "PAID" && s.paidDaysAfterCycleEnd !== undefined
        ? addDays(cycleEnd, s.paidDaysAfterCycleEnd).toISOString()
        : null;
    const rolledFromCycleId =
      s.rolledFromCycleIndex !== undefined
        ? cycles[s.rolledFromCycleIndex].id
        : null;

    return {
      id: id("e", i),
      userId: userByUsername[s.username]!,
      cycleId: cycle.id,
      saleDate: saleDate.toISOString(),
      description: s.description,
      clientName: s.clientName,
      saleAmount: s.saleAmount,
      commissionRate: s.commissionRate,
      status: s.status,
      notes: s.notes ?? null,
      rolledFromCycleId,
      paidAt,
      createdAt: now,
    };
  });

  return { version: 1, users, cycles, entries };
}
