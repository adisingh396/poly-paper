import { NextResponse } from "next/server";
import { fetchEventBySlug } from "@/lib/polymarket";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const event = await fetchEventBySlug(params.slug);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ error: "Failed to load event" }, { status: 502 });
  }
}
