import { NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "");
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const user = await verifyCredentials(username, password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    await createSession({
      userId: user.id,
      username: user.username,
      role: user.role as "ADMIN" | "PERSONNEL",
      fullName: user.fullName,
    });

    return NextResponse.json({
      redirect: user.role === "ADMIN" ? "/admin" : "/personnel",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
