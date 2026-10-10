"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ponytail: Coinbase spot polling, Polymarket charts for history
export function BtcTicker() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot", { cache: "no-store" });
        const data = await res.json();
        const p = parseFloat(data?.data?.amount);
        if (!cancelled && Number.isFinite(p)) setPrice(p);
      } catch {
        /* keep last */
      }
    }
    void load();
    const t = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <Link
      href="/?tag=bitcoin"
      className="flex items-center gap-2 rounded-lg border border-pk-border bg-pk-card px-3 py-2 text-[13px] transition hover:border-pk-border-strong"
    >
      <span className="flex items-center gap-1.5 font-semibold text-pk-content-primary">
        <span className="pk-live-dot inline-block size-1.5 rounded-full bg-pk-green" />
        BTC
      </span>
      <span className="tabular-nums text-pk-content-primary">
        {price !== null ? `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "…"}
      </span>
      <span className="text-pk-content-secondary">· trade Bitcoin markets →</span>
    </Link>
  );
}
