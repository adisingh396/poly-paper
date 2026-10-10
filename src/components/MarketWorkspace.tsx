"use client";

import { useMemo, useState } from "react";
import type { EventSummary } from "@/lib/types";
import { PriceChart, type ChartSeries } from "./PriceChart";
import { OutcomeRows } from "./OutcomeRows";
import { OrderBook } from "./OrderBook";
import { TradePanel } from "./TradePanel";
import { RelatedMarkets } from "./RelatedMarkets";
import { ChevronDownIcon } from "./icons";
import { cn } from "@/lib/utils";

type Side = "BUY" | "SELL";
const PALETTE = ["var(--pk-blue)", "var(--pk-red)", "var(--pk-green)", "var(--pk-yellow)", "#a855f7", "#06b6d4"];

export function MarketWorkspace({ event }: { event: EventSummary }) {
  const isMulti = event.markets.length > 1;

  const [marketId, setMarketId] = useState(event.markets[0].id);
  const [tokenId, setTokenId] = useState(event.markets[0].outcomes[0].tokenId);
  const [side, setSide] = useState<Side>("BUY");
  const [showBook, setShowBook] = useState(false);

  const market = useMemo(
    () => event.markets.find((m) => m.id === marketId) ?? event.markets[0],
    [event.markets, marketId]
  );

  // Chart overlays candidate "Yes" lines for multi-market events, or Yes/No for a binary market.
  const series = useMemo<ChartSeries[]>(() => {
    if (isMulti) {
      return event.markets.slice(0, 6).map((m, i) => ({
        key: `s${i}`,
        label: m.shortLabel,
        color: PALETTE[i % PALETTE.length],
        tokenId: m.outcomes[0].tokenId
      }));
    }
    return market.outcomes.slice(0, 2).map((o, i) => ({
      key: `s${i}`,
      label: o.label,
      color: i === 0 ? "var(--pk-blue)" : "var(--pk-red)",
      tokenId: o.tokenId
    }));
  }, [isMulti, event.markets, market.outcomes]);

  function pick(nextMarketId: string, nextTokenId: string, nextSide: Side) {
    setMarketId(nextMarketId);
    setTokenId(nextTokenId);
    setSide(nextSide);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <PriceChart series={series} />
        <OutcomeRows markets={event.markets} selectedTokenId={tokenId} onPick={pick} />

        <div>
          <button
            onClick={() => setShowBook((v) => !v)}
            className="flex items-center gap-1.5 text-[14px] font-medium text-pk-content-secondary transition-colors hover:text-pk-content-primary"
          >
            <ChevronDownIcon className={cn("size-4 transition-transform", showBook ? "" : "-rotate-90")} />
            Order book
          </button>
          {showBook ? (
            <div className="mt-2">
              <OrderBook tokenId={tokenId} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-[92px] flex flex-col gap-4">
          <TradePanel
            market={market}
            tokenId={tokenId}
            side={side}
            onSelectToken={setTokenId}
            onSetSide={setSide}
          />
          <RelatedMarkets
            currentSlug={event.slug}
            category={event.category}
            categorySlug={event.categorySlug}
          />
        </div>
      </div>
    </div>
  );
}
