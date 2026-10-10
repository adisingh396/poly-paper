import { NextResponse } from "next/server";
import { fetchPriceHistory } from "@/lib/polymarket";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("tokenId");
  const interval = searchParams.get("interval") ?? "1w";
  const fidelity = Number(searchParams.get("fidelity") ?? 60);
  if (!tokenId) return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
  try {
    const history = await fetchPriceHistory(tokenId, interval, Number.isFinite(fidelity) ? fidelity : 60);
    return NextResponse.json({ history });
  } catch {
    return NextResponse.json({ error: "Failed to load price history" }, { status: 502 });
  }
}
