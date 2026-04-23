import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  await requireRole("ADMIN");

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.status === "PAID" || body.status === "PENDING") {
      data.status = body.status;
      data.paidAt = body.status === "PAID" ? new Date() : null;
    }

    // Admin edits the commission AMOUNT directly — rate is derived from
    // commission / saleAmount. We still store the rate (schema field) so
    // commission * rate remains consistent everywhere.
    if (body.commissionAmount !== undefined) {
      const amount = Number(body.commissionAmount);
      const existing = await prisma.entry.findUnique({
        where: { id: params.id },
        select: { saleAmount: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Entry not found." }, { status: 404 });
      }
      if (Number.isNaN(amount) || amount < 0) {
        return NextResponse.json(
          { error: "Commission must be a non-negative number." },
          { status: 400 }
        );
      }
      if (existing.saleAmount <= 0) {
        return NextResponse.json(
          { error: "Sale amount must be positive to compute a rate." },
          { status: 400 }
        );
      }
      const rate = amount / existing.saleAmount;
      data.commissionRate = Math.round(rate * 10000) / 10000;
    } else if (body.commissionRate !== undefined) {
      const rate = Number(body.commissionRate);
      if (!Number.isNaN(rate) && rate >= 0 && rate <= 5) {
        data.commissionRate = Math.round(rate * 10000) / 10000;
      }
    }

    if (body.notes !== undefined) {
      const raw = typeof body.notes === "string" ? body.notes.trim() : "";
      data.notes = raw.length > 0 ? raw : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const entry = await prisma.entry.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ entry });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not update entry." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await requireRole("ADMIN");
  try {
    await prisma.entry.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not delete entry." },
      { status: 500 }
    );
  }
}
