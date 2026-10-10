import { NextResponse } from "next/server";
import { fetchOrderBook } from "@/lib/polymarket";

export async function GET(req: Request) {
  const tokenId = new URL(req.url).searchParams.get("tokenId");
  if (!tokenId) return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
  try {
    return NextResponse.json({ book: await fetchOrderBook(tokenId) });
  } catch {
    return NextResponse.json({ error: "Failed to load order book" }, { status: 502 });
  }
}
