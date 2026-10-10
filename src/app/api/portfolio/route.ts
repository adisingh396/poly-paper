import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getPortfolio } from "@/lib/trading";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your portfolio" }, { status: 401 });

  const [portfolio, trades] = await Promise.all([
    getPortfolio(user.id),
    prisma.trade.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 })
  ]);
  return NextResponse.json({ portfolio, trades });
}
