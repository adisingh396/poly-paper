"use client";

import type { MarketSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";

type Side = "BUY" | "SELL";

function cents(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

export function OutcomeRows({
  markets,
  selectedTokenId,
  onPick
}: {
  markets: MarketSummary[];
  selectedTokenId: string;
  onPick: (marketId: string, tokenId: string, side: Side) => void;
}) {
  return (
    <div className="flex flex-col divide-y divide-pk-border rounded-lg border border-pk-border bg-pk-card">
      {markets.map((m) => {
        const yes = m.outcomes[0];
        const no = m.outcomes[1];
        const change = m.oneDayPriceChange;
        const rowSelected = m.outcomes.some((o) => o.tokenId === selectedTokenId);

        return (
          <div
            key={m.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-colors",
              rowSelected ? "bg-pk-elevated/40" : ""
            )}
          >
            {m.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.icon} alt="" className="size-8 shrink-0 rounded-md bg-pk-elevated object-cover" />
            ) : (
              <div className="size-8 shrink-0 rounded-md bg-pk-elevated" />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-pk-content-primary">{m.shortLabel}</p>
              <p className="text-[12px] text-pk-content-secondary">${formatCompact(m.volume)} Vol.</p>
            </div>

            <div className="flex w-20 flex-col items-end">
              <span className="text-[20px] font-semibold tabular-nums text-pk-content-primary">
                {Math.round((yes?.price ?? 0) * 100)}%
              </span>
              {change !== 0 ? (
                <span
                  className={cn(
                    "text-[12px] font-medium tabular-nums",
                    change > 0 ? "text-pk-green" : "text-pk-red"
                  )}
                >
                  {change > 0 ? "▲" : "▼"} {Math.abs(Math.round(change * 100))}%
                </span>
              ) : null}
            </div>

            <div className="hidden shrink-0 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => yes && onPick(m.id, yes.tokenId, "BUY")}
                className={cn(
                  "flex h-11 min-w-[104px] flex-col items-center justify-center rounded-md text-[13px] font-semibold transition-colors",
                  selectedTokenId === yes?.tokenId
                    ? "bg-pk-green text-white"
                    : "bg-pk-green-tint text-pk-green hover:bg-pk-green hover:text-white"
                )}
              >
                <span>Buy Yes</span>
                {yes ? <span className="text-[12px] font-medium opacity-90">{cents(yes.price)}</span> : null}
              </button>
              {no ? (
                <button
                  type="button"
                  onClick={() => onPick(m.id, no.tokenId, "BUY")}
                  className={cn(
                    "flex h-11 min-w-[104px] flex-col items-center justify-center rounded-md text-[13px] font-semibold transition-colors",
                    selectedTokenId === no.tokenId
                      ? "bg-pk-red text-white"
                      : "bg-pk-red-tint text-pk-red hover:bg-pk-red hover:text-white"
                  )}
                >
                  <span>Buy No</span>
                  <span className="text-[12px] font-medium opacity-90">{cents(no.price)}</span>
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
