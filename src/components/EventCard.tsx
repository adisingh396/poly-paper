import Link from "next/link";
import type { EventSummary, MarketSummary } from "@/lib/types";
import { formatCompact } from "@/lib/format";
import { BookmarkIcon, GiftIcon } from "./icons";

function leadPercent(market: MarketSummary): number {
  const best = [...market.outcomes].sort((a, b) => b.price - a.price)[0];
  return Math.round((best?.price ?? 0) * 100);
}

function YesNoPills({ compact = false }: { compact?: boolean }) {
  const base = "flex items-center justify-center rounded-md font-semibold";
  const size = compact ? "h-7 min-w-[44px] px-2 text-[12px]" : "h-9 flex-1 text-[13px]";
  return (
    <div className={compact ? "flex shrink-0 gap-1.5" : "flex w-full gap-1.5"}>
      <span className={`${base} ${size} bg-pk-green-tint text-pk-green`}>Yes</span>
      <span className={`${base} ${size} bg-pk-red-tint text-pk-red`}>No</span>
    </div>
  );
}

function endsIn(endDate: string | null): string | null {
  if (!endDate) return null;
  const ms = new Date(endDate).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `Ends in ${Math.max(1, Math.round(ms / 60_000))}m`;
  if (h < 24) return `Ends in ${h}h`;
  const d = Math.round(h / 24);
  return `Ends in ${d}d`;
}

export function EventCard({ event }: { event: EventSummary }) {
  const primary = event.markets[0];
  const isBinary = event.markets.length === 1 && primary.outcomes.length === 2;
  const yesLabel = primary.outcomes[0]?.label ?? "Yes";
  const soon = endsIn(event.endDate);
  const isLive = event.endDate ? new Date(event.endDate).getTime() - Date.now() < 24 * 3_600_000 : false;

  return (
    <Link
      href={`/event/${event.slug}`}
      className="group flex h-full min-h-[168px] cursor-pointer flex-col rounded-lg border border-pk-border bg-pk-card p-4 transition hover:border-pk-border-strong hover:shadow-pk-card-hover"
    >
      <div className="flex items-start gap-2.5">
        {event.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.icon}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-md bg-pk-elevated object-cover"
          />
        ) : (
          <div className="size-10 shrink-0 rounded-md bg-pk-elevated" />
        )}
        <p className="line-clamp-2 flex-1 text-[15px] font-semibold leading-tight text-pk-content-primary">
          {event.title}
        </p>
      </div>

      {isBinary ? (
        <>
          <div className="mt-3 flex items-end justify-end">
            <div className="flex flex-col items-end leading-none">
              <span className="text-[28px] font-semibold tabular-nums text-pk-content-primary">
                {leadPercent(primary)}%
              </span>
              <span className="mt-1 text-[12px] font-medium text-pk-content-secondary">{yesLabel}</span>
            </div>
          </div>
          <div className="mt-3">
            <YesNoPills />
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-col gap-1.5">
          {event.markets.slice(0, 4).map((market) => (
            <div key={market.id} className="flex items-center gap-2">
              <span className="flex-1 truncate text-[13px] text-pk-content-secondary">{market.question}</span>
              <span className="w-9 text-right text-[13px] font-semibold tabular-nums text-pk-content-primary">
                {leadPercent(market)}%
              </span>
              <YesNoPills compact />
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-3 text-[12px] text-pk-content-secondary">
        <span>${formatCompact(event.volume)} Vol.</span>
        <span className="flex items-center gap-2">
          {soon ? (
            <span className="flex items-center gap-1 font-medium text-pk-content-secondary">
              {isLive ? <span className="pk-live-dot inline-block size-1.5 rounded-full bg-pk-green" /> : null}
              {soon}
            </span>
          ) : null}
        <span className="flex items-center gap-1.5 text-pk-content-tertiary">
          <GiftIcon className="size-[18px]" />
          <BookmarkIcon className="size-[18px]" />
        </span>
        </span>
      </div>
    </Link>
  );
}
