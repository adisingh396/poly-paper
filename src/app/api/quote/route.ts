import { NextResponse } from "next/server";
import { fetchSidePrice } from "@/lib/polymarket";

// Live executable price used by the trade panel before a user confirms.
// Returns null-as-409 for illiquid books; the panel then falls back to the
// aggregate outcome price it already holds from the market data.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("tokenId");
  const side = searchParams.get("side") === "sell" ? "sell" : "buy";
  if (!tokenId) return NextResponse.json({ error: "tokenId is required" }, { status: 400 });

  const price = await fetchSidePrice(tokenId, side);
  if (price === null) return NextResponse.json({ error: "No live price" }, { status: 409 });
  return NextResponse.json({ price, side });
}
