import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getOrCreateCurrentCycle } from "@/lib/cycle";

export async function POST(request: Request) {
  const session = await requireSession();

  try {
    const body = await request.json();
    const saleDate = new Date(String(body?.saleDate));
    const description = String(body?.description ?? "").trim();
    const clientName = body?.clientName ? String(body.clientName).trim() : null;
    const saleAmount = Number(body?.saleAmount);

    if (!description || !saleAmount || Number.isNaN(saleAmount) || saleAmount <= 0) {
      return NextResponse.json(
        { error: "Description and a positive sale amount are required." },
        { status: 400 }
      );
    }
    if (Number.isNaN(saleDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid sale date." },
        { status: 400 }
      );
    }

    const cycle = await getOrCreateCurrentCycle();

    // Admin may submit on behalf of a user; personnel submit for themselves
    const targetUserId =
      session.role === "ADMIN" && body?.userId
        ? String(body.userId)
        : session.userId;

    const entry = await prisma.entry.create({
      data: {
        userId: targetUserId,
        cycleId: cycle.id,
        saleDate,
        description,
        clientName,
        saleAmount,
        commissionRate: 0.7, // default; admin can change later
        status: "PENDING",
      },
    });

    return NextResponse.json({ entry });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not create entry." },
      { status: 500 }
    );
  }
}
