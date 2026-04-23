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

/**
 * Bulk-rollover every pending entry in the given cycle into the following cycle.
 * A reason is required and gets appended to each moved entry's notes.
 */
export async function POST(request: Request) {
  await requireRole("ADMIN");

  try {
    const body = await request.json();
    const cycleId = String(body?.cycleId ?? "");
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!cycleId) {
      return NextResponse.json({ error: "cycleId is required." }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required when closing a cycle." },
        { status: 400 }
      );
    }

    const cycle = await prisma.billingCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found." }, { status: 404 });
    }

    const nextCycle = await getOrCreateNextCycleAfter(cycle.endsOn);
    const pending = await prisma.entry.findMany({
      where: { cycleId, status: "PENDING" },
      select: { id: true, notes: true },
    });

    const today = formatNoteDate(new Date());
    const line = `[Rolled from ${cycle.label} · ${today}] ${reason}`;

    await prisma.$transaction(
      pending.map((p) =>
        prisma.entry.update({
          where: { id: p.id },
          data: {
            cycleId: nextCycle.id,
            rolledFromCycleId: cycleId,
            notes: p.notes ? `${p.notes}\n${line}` : line,
          },
        })
      )
    );

    return NextResponse.json({ movedCount: pending.length, nextCycle });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not roll over cycle." },
      { status: 500 }
    );
  }
}
