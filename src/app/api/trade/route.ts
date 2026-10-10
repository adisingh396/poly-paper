import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { executeTrade, TradeError } from "@/lib/trading";

const TradeSchema = z.object({
  marketId: z.string().min(1),
  tokenId: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  shares: z.number().positive().max(1_000_000)
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to trade" }, { status: 401 });

  const parsed = TradeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid trade" }, { status: 400 });
  }

  try {
    const result = await executeTrade(user.id, parsed.data);
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof TradeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Trade failed" }, { status: 500 });
  }
}
