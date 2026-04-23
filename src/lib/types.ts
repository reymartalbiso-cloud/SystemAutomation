export type Role = "ADMIN" | "PERSONNEL";
export type EntryStatus = "PENDING" | "PAID";

export type User = {
  id: string;
  username: string;
  password: string; // plaintext; prototype only
  fullName: string;
  role: Role;
};

export type Cycle = {
  id: string;
  endsOn: string; // ISO date (Friday that closes the cycle)
  label: string;
};

export type Entry = {
  id: string;
  userId: string;
  cycleId: string;
  saleDate: string; // ISO
  description: string;
  clientName: string | null;
  saleAmount: number;
  commissionRate: number;
  status: EntryStatus;
  notes: string | null;
  rolledFromCycleId: string | null;
  paidAt: string | null; // ISO
  createdAt: string; // ISO
};

export type StoreData = {
  version: 1;
  users: User[];
  cycles: Cycle[];
  entries: Entry[];
};
