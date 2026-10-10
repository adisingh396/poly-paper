"use client";

import { useEffect, useState } from "react";
import type { OrderBook as Book } from "@/lib/types";
import { formatCents, formatShares } from "@/lib/format";

const POLL_MS = 6000;

function Row({ level, side, max }: { level: { price: number; size: number }; side: "bid" | "ask"; max: number }) {
  const pct = max > 0 ? Math.min((level.size / max) * 100, 100) : 0;
  const barColor = side === "bid" ? "bg-pk-green-tint" : "bg-pk-red-tint";
  const priceColor = side === "bid" ? "text-pk-green" : "text-pk-red";
  return (
    <div className="relative flex items-center justify-between px-2 py-0.5 text-[12px]">
      <div className={`absolute inset-y-0 right-0 ${barColor}`} style={{ width: `${pct}%` }} />
      <span className={`relative font-semibold tabular-nums ${priceColor}`}>{formatCents(level.price)}</span>
      <span className="relative tabular-nums text-pk-content-secondary">{formatShares(level.size)}</span>
    </div>
  );
}

export function OrderBook({ tokenId }: { tokenId: string }) {
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/book?tokenId=${encodeURIComponent(tokenId)}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.book) setBook(data.book);
      } catch {
        /* keep last snapshot */
      }
    }
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tokenId]);

  if (!book) {
    return (
      <div className="rounded-lg border border-pk-border bg-pk-card p-4 text-[13px] text-pk-content-secondary">
        Loading order book…
      </div>
    );
  }

  const maxSize = Math.max(1, ...book.bids.map((b) => b.size), ...book.asks.map((a) => a.size));
  const spread = book.bestBid !== null && book.bestAsk !== null ? book.bestAsk - book.bestBid : null;

  return (
    <div className="rounded-lg border border-pk-border bg-pk-card p-4">
      <div className="mb-2 flex items-center justify-between text-[14px]">
        <span className="font-semibold text-pk-content-primary">Order book</span>
        <span className="text-[12px] text-pk-content-secondary">
          Spread {spread !== null ? formatCents(spread) : "—"}
        </span>
      </div>
      <div className="flex justify-between px-2 pb-1 text-[11px] uppercase tracking-wide text-pk-content-tertiary">
        <span>Price</span>
        <span>Shares</span>
      </div>

      <div className="flex flex-col-reverse">
        {book.asks.slice(0, 8).map((lvl, i) => (
          <Row key={`a-${i}`} level={lvl} side="ask" max={maxSize} />
        ))}
      </div>

      <div className="my-1 border-y border-pk-border py-1 text-center text-[12px] text-pk-content-secondary">
        {book.midpoint !== null ? `${formatCents(book.midpoint)} mid` : "no midpoint"}
      </div>

      <div className="flex flex-col">
        {book.bids.slice(0, 8).map((lvl, i) => (
          <Row key={`b-${i}`} level={lvl} side="bid" max={maxSize} />
        ))}
      </div>
    </div>
  );
}
