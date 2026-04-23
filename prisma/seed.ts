import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const personnelPassword = await bcrypt.hash("personnel123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      fullName: "Sarah Reyes",
      role: "ADMIN",
    },
  });

  const personnelData = [
    { username: "maria", fullName: "Maria Santos" },
    { username: "james", fullName: "James Dela Cruz" },
    { username: "anna", fullName: "Anna Lim" },
    { username: "paulo", fullName: "Paulo Mendoza" },
    { username: "teresa", fullName: "Teresa Aquino" },
  ];

  const personnel: Record<string, { id: string; fullName: string }> = {};
  for (const p of personnelData) {
    const user = await prisma.user.upsert({
      where: { username: p.username },
      update: {},
      create: {
        username: p.username,
        passwordHash: personnelPassword,
        fullName: p.fullName,
        role: "PERSONNEL",
      },
    });
    personnel[p.username] = { id: user.id, fullName: user.fullName };
  }

  // 8 Friday cycles: 6 past, current, next
  const currentFriday = nextFriday(new Date());
  const cycleOffsets = [-6, -5, -4, -3, -2, -1, 0, 1];
  const cycleDates = cycleOffsets.map((w) => addDays(currentFriday, w * 7));

  const cycles = await Promise.all(
    cycleDates.map((endsOn) =>
      prisma.billingCycle.upsert({
        where: { endsOn },
        update: {},
        create: { endsOn, label: cycleLabel(endsOn) },
      })
    )
  );

  const OLDEST = 0;
  const LAST_WEEK = 5;
  const CURRENT = 6;

  await prisma.entry.deleteMany({});

  // Solar-themed sales entries
  const seeds: EntrySeed[] = [
    // ===== 6 weeks ago =====
    { username: "maria", cycleIndex: 0, daysBeforeCycleEnd: 5, description: "8kW residential rooftop solar install", clientName: "The Johnson Residence", saleAmount: 420000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 0, daysBeforeCycleEnd: 3, description: "12kW system + Tesla Powerwall", clientName: "Riverside Bakery", saleAmount: 680000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "anna", cycleIndex: 0, daysBeforeCycleEnd: 4, description: "Solar consultation & site survey", clientName: "Hernandez Family", saleAmount: 8500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "paulo", cycleIndex: 0, daysBeforeCycleEnd: 6, description: "6kW rooftop + 2x battery storage", clientName: "Maple Ridge Apartments", saleAmount: 520000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "teresa", cycleIndex: 0, daysBeforeCycleEnd: 2, description: "Net metering application + filing", clientName: "Green Valley Farm", saleAmount: 12000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },

    // ===== 5 weeks ago =====
    { username: "maria", cycleIndex: 1, daysBeforeCycleEnd: 5, description: "Annual solar monitoring service", clientName: "Oak Street Medical", saleAmount: 28000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "maria", cycleIndex: 1, daysBeforeCycleEnd: 2, description: "5kW rooftop solar install", clientName: "Dela Rosa Household", saleAmount: 285000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "james", cycleIndex: 1, daysBeforeCycleEnd: 4, description: "20kW commercial solar array — phase 1", clientName: "Bayview Logistics", saleAmount: 950000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "anna", cycleIndex: 1, daysBeforeCycleEnd: 3, description: "Site assessment + panel layout plan", clientName: "Sunrise Daycare Center", saleAmount: 9500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "paulo", cycleIndex: 1, daysBeforeCycleEnd: 5, description: "Inverter upgrade — Enphase IQ8", clientName: "The Williams Residence", saleAmount: 65000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 3 },
    { username: "teresa", cycleIndex: 1, daysBeforeCycleEnd: 4, description: "10kW rooftop + 13.5kWh Powerwall", clientName: "Pinecrest Lodge", saleAmount: 780000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 3 },

    // ===== 4 weeks ago =====
    { username: "maria", cycleIndex: 2, daysBeforeCycleEnd: 6, description: "8kW rooftop install + monitoring", clientName: "Cedar Cafe & Bakery", saleAmount: 445000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 2, daysBeforeCycleEnd: 3, description: "Commercial solar — 30kW array", clientName: "Harbor Goods Warehouse", saleAmount: 1250000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 2, daysBeforeCycleEnd: 1, description: "Battery backup expansion (3x Powerwall)", clientName: "Bayside Fitness Center", saleAmount: 420000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "anna", cycleIndex: 2, daysBeforeCycleEnd: 5, description: "Solar quote + proposal package", clientName: "Hillside Bed & Breakfast", saleAmount: 7500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "paulo", cycleIndex: 2, daysBeforeCycleEnd: 4, description: "Annual maintenance & panel cleaning", clientName: "Mango Orchard Homes HOA", saleAmount: 18000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "teresa", cycleIndex: 2, daysBeforeCycleEnd: 2, description: "4kW entry-level rooftop install", clientName: "The Cortez Residence", saleAmount: 215000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },

    // ===== 3 weeks ago =====
    { username: "maria", cycleIndex: 3, daysBeforeCycleEnd: 4, description: "15kW rooftop + monitoring suite", clientName: "Northwind Studio", saleAmount: 820000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 3 },
    { username: "james", cycleIndex: 3, daysBeforeCycleEnd: 5, description: "50kW commercial ground-mount", clientName: "Bayview Logistics", saleAmount: 2100000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 3 },
    { username: "anna", cycleIndex: 3, daysBeforeCycleEnd: 2, description: "Net metering paperwork & utility liaison", clientName: "Greenleaf Grocers", saleAmount: 11000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 4 },
    { username: "paulo", cycleIndex: 3, daysBeforeCycleEnd: 3, description: "6kW rooftop + Enphase microinverters", clientName: "The Gutierrez Household", saleAmount: 355000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 4 },
    { username: "teresa", cycleIndex: 3, daysBeforeCycleEnd: 6, description: "10kW rooftop w/ ground-mount extension", clientName: "Pinecrest Lodge", saleAmount: 650000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 3, notes: "Referred by Maria Santos — split credit agreed verbally." },

    // ===== 2 weeks ago (one rolled from 3 weeks ago) =====
    { username: "maria", cycleIndex: 4, daysBeforeCycleEnd: 5, description: "8kW rooftop + battery backup", clientName: "Acme Retail HQ", saleAmount: 625000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "maria", cycleIndex: 4, daysBeforeCycleEnd: 1, description: "System inspection + re-certification", clientName: "Cedar Cafe & Bakery", saleAmount: 8500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "james", cycleIndex: 4, daysBeforeCycleEnd: 3, description: "25kW commercial solar — phase 1", clientName: "Harbor Goods Warehouse", saleAmount: 1080000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "anna", cycleIndex: 4, daysBeforeCycleEnd: 4, description: "Solar savings analysis report", clientName: "Pinecrest Lodge", saleAmount: 9000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "paulo", cycleIndex: 4, daysBeforeCycleEnd: 6, description: "Panel repair — 2 units replaced under warranty", clientName: "Bloom Floral Retail", saleAmount: 7500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 3, rolledFromCycleIndex: 3, notes: "[Rolled from 3 weeks ago] Warranty paperwork pending at time of original cycle." },
    { username: "teresa", cycleIndex: 4, daysBeforeCycleEnd: 2, description: "6kW rooftop solar — standard install", clientName: "Mango Orchard Homes HOA", saleAmount: 325000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },

    // ===== LAST WEEK =====
    { username: "maria", cycleIndex: 5, daysBeforeCycleEnd: 4, description: "Solar + battery backup — 10kW system", clientName: "Acme Retail HQ", saleAmount: 695000, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 5, daysBeforeCycleEnd: 3, description: "Commercial solar — 40kW expansion", clientName: "Bayside Fitness Center", saleAmount: 1650000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "james", cycleIndex: 5, daysBeforeCycleEnd: 6, description: "Monitoring platform setup (annual)", clientName: "Harbor Goods Warehouse", saleAmount: 32000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "anna", cycleIndex: 5, daysBeforeCycleEnd: 2, description: "Site survey + proposal — residential", clientName: "Greenleaf Grocers", saleAmount: 6500, commissionRate: 0.3, status: "PAID", paidDaysAfterCycleEnd: 1 },
    { username: "paulo", cycleIndex: 5, daysBeforeCycleEnd: 5, description: "8kW rooftop + microinverters", clientName: "Cedar Cafe & Bakery", saleAmount: 465000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 2 },
    { username: "teresa", cycleIndex: 5, daysBeforeCycleEnd: 3, description: "Battery backup upgrade (Powerwall 3)", clientName: "Pinecrest Lodge", saleAmount: 380000, commissionRate: 0.7, status: "PAID", paidDaysAfterCycleEnd: 1 },

    // ===== CURRENT CYCLE (pending; two rolled from last week) =====
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

  for (const s of seeds) {
    const user = personnel[s.username];
    if (!user) continue;
    const cycle = cycles[s.cycleIndex];
    const saleDate = addDays(cycle.endsOn, -s.daysBeforeCycleEnd);
    const paidAt =
      s.status === "PAID" && s.paidDaysAfterCycleEnd !== undefined
        ? addDays(cycle.endsOn, s.paidDaysAfterCycleEnd)
        : null;
    const rolledFromCycleId =
      s.rolledFromCycleIndex !== undefined
        ? cycles[s.rolledFromCycleIndex].id
        : null;

    await prisma.entry.create({
      data: {
        userId: user.id,
        cycleId: cycle.id,
        saleDate,
        description: s.description,
        clientName: s.clientName,
        saleAmount: s.saleAmount,
        commissionRate: s.commissionRate,
        status: s.status,
        notes: s.notes ?? null,
        paidAt,
        rolledFromCycleId,
      },
    });
  }

  console.log(`Seeded:
  - Admin:       ${admin.fullName}  (admin / admin123)
  - Personnel:
      ${personnel.maria.fullName}       (maria   / personnel123)
      ${personnel.james.fullName}     (james   / personnel123)
      ${personnel.anna.fullName}           (anna    / personnel123)
      ${personnel.paulo.fullName}       (paulo   / personnel123)
      ${personnel.teresa.fullName}       (teresa  / personnel123)
  - Cycles:       ${cycles.length} (${cycleLabel(cycles[OLDEST].endsOn)}  →  ${cycleLabel(cycles[cycles.length - 1].endsOn)})
  - Entries:      ${seeds.length}
  - Current cycle pending: ${seeds.filter((s) => s.cycleIndex === CURRENT && s.status === "PENDING").length}
  - Rolled-over:  ${seeds.filter((s) => s.rolledFromCycleIndex !== undefined).length}
  - Last week:    ${seeds.filter((s) => s.cycleIndex === LAST_WEEK).length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
