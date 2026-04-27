export type Role = "ADMIN" | "PERSONNEL";
export type EntryStatus = "PENDING" | "PAID";

export type User = {
  id: string;
  username: string;
  password: string; // plaintext; prototype only
  fullName: string;
  role: Role;
  active: boolean;
  createdAt: string; // ISO
};

export type Cycle = {
  id: string;
  endsOn: string; // ISO date (Friday that closes the cycle)
  label: string;
};

/** A file attached to an entry — base64-encoded into the store for the
 *  prototype. Real production should store the binary in S3/Blob and
 *  keep only a URL here. */
export type Attachment = {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // bytes (original, not base64)
  dataUrl: string; // data:<mime>;base64,...
  uploadedAt: string;
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
  attachments: Attachment[];
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
