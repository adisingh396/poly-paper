import { cookies } from "next/headers";
import { prisma } from "./db";
import { signSession, verifySession } from "./auth";
import type { PublicUser } from "./types";

const SESSION_COOKIE = "pp_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function startSession(userId: string): Promise<void> {
  const token = await signSession(userId);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS
  });
}

export function endSession(): void {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySession(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, cashBalance: true }
  });
  return user;
}
