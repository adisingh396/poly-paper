import Link from "next/link";
import { fetchEvents } from "@/lib/polymarket";
import { EventCard } from "@/components/EventCard";
import { BtcTicker } from "@/components/BtcTicker";
import { BookmarkIcon, SearchIcon, SlidersIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { EventSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Bitcoin = tag feed. Live = ending soonest. Fast = hourly/4h "up or down"
// short-term markets — the closest Polymarket has to 5m/10m.
const TABS = [
  { label: "Trending", href: "/" },
  { label: "Bitcoin", href: "/?tag=bitcoin" },
  { label: "Live", href: "/?live=1" },
  { label: "⚡ Fast: Up/Down", href: "/?search=up%20or%20down" },
  { label: "Politics", href: "/?tag=politics" },
  { label: "Sports", href: "/?tag=sports" },
  { label: "Crypto", href: "/?tag=crypto" },
  { label: "Economics", href: "/?tag=economy" },
  { label: "Tech", href: "/?tag=tech" },
  { label: "World", href: "/?tag=world" },
  { label: "Culture", href: "/?tag=pop-culture" },
  { label: "Elections", href: "/?tag=elections" }
];

function ToolbarButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-md text-pk-content-secondary"
    >
      {children}
    </span>
  );
}

export default async function HomePage({
  searchParams
}: {
  searchParams: { search?: string; tag?: string; live?: string };
}) {
  const search = searchParams.search?.trim() || undefined;
  const tag = searchParams.tag || undefined;
  const live = searchParams.live === "1";

  let events: EventSummary[] = [];
  let loadError = false;
  try {
    events = await fetchEvents({ search, tag, limit: 48 });
    if (live) {
      // Live predictions = resolving soonest first.
      events = [...events].sort((a, b) => {
        const ta = a.endDate ? new Date(a.endDate).getTime() : Number.MAX_SAFE_INTEGER;
        const tb = b.endDate ? new Date(b.endDate).getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
      });
    }
  } catch {
    loadError = true;
  }

  const heading = search
    ? `Results for “${search}”`
    : live
      ? "Live — ending soon"
      : tag === "bitcoin"
        ? "Bitcoin markets"
        : "All markets";
  const activeHref = search ? `/?search=${encodeURIComponent(search)}` : live ? "/?live=1" : tag ? `/?tag=${tag}` : "/";

  return (
    <section className="pk-container pb-16 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[24px] font-semibold tracking-tight text-pk-content-primary">{heading}</h2>
        <div className="flex items-center gap-1">
          <ToolbarButton label="Search">
            <SearchIcon className="size-[18px]" />
          </ToolbarButton>
          <ToolbarButton label="Filters">
            <SlidersIcon className="size-[18px]" />
          </ToolbarButton>
          <ToolbarButton label="Watchlist">
            <BookmarkIcon className="size-[18px]" />
          </ToolbarButton>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors",
              activeHref === t.href
                ? "bg-pk-elevated text-pk-content-primary"
                : "text-pk-content-secondary hover:bg-pk-elevated hover:text-pk-content-primary"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <BtcTicker />
        {live || search?.toLowerCase() === "up or down" ? (
          <p className="text-[12px] text-pk-content-secondary">
            Short-term markets resolve hourly / every 4h — closest to 5m/10m on Polymarket.
          </p>
        ) : null}
      </div>

      {loadError ? (
        <p className="mt-6 rounded-lg border border-pk-red/40 bg-pk-red-tint p-4 text-[14px] text-pk-red">
          Could not reach the market feed right now. Refresh to try again.
        </p>
      ) : events.length === 0 ? (
        <p className="mt-6 rounded-lg border border-pk-border bg-pk-card p-6 text-center text-[14px] text-pk-content-secondary">
          No open markets matched {search ? `“${search}”` : "this filter"}.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
