import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE_NAME = "ct_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-insecure-secret-please-change"
);

export type SessionPayload = {
  userId: string;
  username: string;
  role: "ADMIN" | "PERSONNEL";
  fullName: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(
  role: "ADMIN" | "PERSONNEL"
): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== role) {
    redirect(session.role === "ADMIN" ? "/admin" : "/personnel");
  }
  return session;
}

export async function verifyCredentials(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase().trim() },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}
