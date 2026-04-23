import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getOrCreateNextCycleAfter } from "@/lib/cycle";

function formatNoteDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function composeRolloverNote(
  previousNotes: string | null,
  fromLabel: string,
  reason: string
): string {
  const today = formatNoteDate(new Date());
  const line = `[Rolled from ${fromLabel} · ${today}] ${reason}`;
  return previousNotes ? `${previousNotes}\n${line}` : line;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  await requireRole("ADMIN");

  try {
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required when rolling an entry over." },
        { status: 400 }
      );
    }

    const entry = await prisma.entry.findUnique({
      where: { id: params.id },
      include: { cycle: true },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }
    if (entry.status === "PAID") {
      return NextResponse.json(
        { error: "Paid entries cannot be rolled over." },
        { status: 400 }
      );
    }

    const nextCycle = await getOrCreateNextCycleAfter(entry.cycle.endsOn);

    const updated = await prisma.entry.update({
      where: { id: entry.id },
      data: {
        cycleId: nextCycle.id,
        rolledFromCycleId: entry.cycleId,
        notes: composeRolloverNote(entry.notes, entry.cycle.label, reason),
      },
    });

    return NextResponse.json({ entry: updated, nextCycle });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not roll over entry." },
      { status: 500 }
    );
  }
}
