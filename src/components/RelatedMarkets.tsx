"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { EventSummary } from "@/lib/types";

function topPercent(event: EventSummary): number {
  const primary = event.markets[0];
  const best = primary ? [...primary.outcomes].sort((a, b) => b.price - a.price)[0] : null;
  return Math.round((best?.price ?? 0) * 100);
}

export function RelatedMarkets({
  currentSlug,
  category,
  categorySlug
}: {
  currentSlug: string;
  category: string | null;
  categorySlug: string | null;
}) {
  const tabs = [{ label: "All", slug: "" }, ...(categorySlug ? [{ label: category ?? "Category", slug: categorySlug }] : [])];
  const [tab, setTab] = useState(categorySlug ?? "");
  const [events, setEvents] = useState<EventSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    const qs = tab ? `?tag=${encodeURIComponent(tab)}&limit=12` : "?limit=12";
    fetch(`/api/markets${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          const list = Array.isArray(d.events) ? (d.events as EventSummary[]) : [];
          setEvents(list.filter((e) => e.slug !== currentSlug).slice(0, 8));
        }
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, currentSlug]);

  if (events.length === 0) return null;

  return (
    <div className="rounded-lg border border-pk-border bg-pk-card p-3">
      <div className="mb-2 flex items-center gap-2 border-b border-pk-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.label}
            onClick={() => setTab(t.slug)}
            className={cn(
              "rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
              tab === t.slug ? "bg-pk-elevated text-pk-content-primary" : "text-pk-content-secondary hover:text-pk-content-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col">
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/event/${e.slug}`}
            className="flex items-center gap-3 rounded-md px-1 py-2 transition-colors hover:bg-pk-elevated"
          >
            {e.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.icon} alt="" className="size-9 shrink-0 rounded-md bg-pk-elevated object-cover" />
            ) : (
              <div className="size-9 shrink-0 rounded-md bg-pk-elevated" />
            )}
            <span className="line-clamp-2 flex-1 text-[13px] font-medium text-pk-content-primary">{e.title}</span>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-pk-content-primary">
              {topPercent(e)}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
