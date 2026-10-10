import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { startSession } from "@/lib/session";

const RegisterSchema = z.object({
  email: z.string().email().max(120),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers and underscores"),
  password: z.string().min(6).max(200)
});

function startingBalance(): number {
  const raw = Number(process.env.STARTING_BALANCE);
  return Number.isFinite(raw) && raw > 0 ? raw : 1000;
}

export async function POST(req: Request) {
  const parsed = RegisterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { email, username, password } = parsed.data;
  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        passwordHash: await hashPassword(password),
        cashBalance: startingBalance()
      },
      select: { id: true, email: true, username: true, cashBalance: true }
    });
    await startSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Email or username is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
