import { NextResponse } from "next/server";
import { fetchEvents } from "@/lib/polymarket";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const offset = Number(searchParams.get("offset") ?? 0);
  const limit = Number(searchParams.get("limit") ?? 40);

  try {
    const events = await fetchEvents({
      search,
      tag,
      offset: Number.isFinite(offset) ? offset : 0,
      limit: Number.isFinite(limit) ? Math.min(limit, 60) : 40
    });
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: "Failed to load markets" }, { status: 502 });
  }
}
