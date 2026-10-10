"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/components/UserProvider";
import { cn } from "@/lib/utils";
import type { Portfolio } from "@/lib/trading";
import { formatCents, formatShares, formatUsd } from "@/lib/format";

interface TradeRow {
  id: string;
  marketSlug: string;
  marketQuestion: string;
  outcome: string;
  side: string;
  shares: number;
  price: number;
  cost: number;
  realizedPnl: number;
  createdAt: string;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const color = tone === "green" ? "text-pk-green" : tone === "red" ? "text-pk-red" : "text-pk-content-primary";
  return (
    <div className="rounded-lg border border-pk-border bg-pk-card p-4">
      <div className="text-[12px] text-pk-content-secondary">{label}</div>
      <div className={cn("mt-1 text-[18px] font-semibold tabular-nums", color)}>{value}</div>
    </div>
  );
}

function pnlTone(value: number): "green" | "red" | undefined {
  if (value > 0) return "green";
  if (value < 0) return "red";
  return undefined;
}

export default function PortfolioPage() {
  const { user, loading: userLoading, refresh } = useUser();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data.portfolio);
        setTrades(data.trades ?? []);
      }
    } finally {
      setLoading(false);
    }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (userLoading) {
    return <p className="pk-container py-8 text-[14px] text-pk-content-secondary">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="pk-container py-8">
        <div className="mx-auto max-w-md rounded-lg border border-pk-border bg-pk-card p-8 text-center">
          <p className="text-[14px] text-pk-content-secondary">Log in to view your portfolio.</p>
          <Link
            href="/login"
            className="mt-3 inline-block rounded-full bg-pk-blue px-4 py-2 text-[14px] font-semibold text-white"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pk-container flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold tracking-tight text-pk-content-primary">Portfolio</h1>
        <button
          onClick={load}
          className="rounded-full border border-pk-border px-4 py-1.5 text-[14px] text-pk-content-secondary transition-colors hover:bg-pk-elevated hover:text-pk-content-primary"
        >
          Refresh
        </button>
      </div>

      {portfolio ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Portfolio value" value={formatUsd(portfolio.portfolioValue)} />
            <Stat label="Cash" value={formatUsd(portfolio.cashBalance)} />
            <Stat label="Positions value" value={formatUsd(portfolio.positionsValue)} />
            <Stat
              label="Unrealized P&L"
              value={formatUsd(portfolio.totalUnrealizedPnl, { sign: true })}
              tone={pnlTone(portfolio.totalUnrealizedPnl)}
            />
            <Stat
              label="Realized P&L"
              value={formatUsd(portfolio.totalRealizedPnl, { sign: true })}
              tone={pnlTone(portfolio.totalRealizedPnl)}
            />
          </div>

          <section>
            <h2 className="mb-2 text-[14px] font-semibold text-pk-content-secondary">Open positions</h2>
            {portfolio.positions.length === 0 ? (
              <p className="rounded-lg border border-pk-border bg-pk-card p-6 text-center text-[14px] text-pk-content-secondary">
                No open positions yet.{" "}
                <Link href="/" className="text-pk-blue">
                  Browse markets →
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-pk-border">
                <table className="w-full min-w-[640px] text-[14px]">
                  <thead className="bg-pk-elevated text-left text-[11px] uppercase tracking-wide text-pk-content-tertiary">
                    <tr>
                      <th className="px-3 py-2">Market</th>
                      <th className="px-3 py-2">Outcome</th>
                      <th className="px-3 py-2 text-right">Shares</th>
                      <th className="px-3 py-2 text-right">Avg</th>
                      <th className="px-3 py-2 text-right">Mark</th>
                      <th className="px-3 py-2 text-right">Value</th>
                      <th className="px-3 py-2 text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.positions.map((p) => (
                      <tr key={p.tokenId} className="border-t border-pk-border">
                        <td className="max-w-[240px] truncate px-3 py-2">
                          <Link href={`/event/${p.marketSlug}`} className="hover:text-pk-blue">
                            {p.marketQuestion}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-pk-content-secondary">{p.outcome}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatShares(p.shares)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCents(p.avgCost)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCents(p.markPrice)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatUsd(p.marketValue)}</td>
                        <td
                          className={cn(
                            "px-3 py-2 text-right tabular-nums",
                            p.unrealizedPnl >= 0 ? "text-pk-green" : "text-pk-red"
                          )}
                        >
                          {formatUsd(p.unrealizedPnl, { sign: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-[14px] font-semibold text-pk-content-secondary">Recent activity</h2>
            {trades.length === 0 ? (
              <p className="rounded-lg border border-pk-border bg-pk-card p-6 text-center text-[14px] text-pk-content-secondary">
                No trades yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-pk-border">
                <table className="w-full min-w-[640px] text-[14px]">
                  <thead className="bg-pk-elevated text-left text-[11px] uppercase tracking-wide text-pk-content-tertiary">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Side</th>
                      <th className="px-3 py-2">Market</th>
                      <th className="px-3 py-2">Outcome</th>
                      <th className="px-3 py-2 text-right">Shares</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Cash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => (
                      <tr key={t.id} className="border-t border-pk-border">
                        <td className="whitespace-nowrap px-3 py-2 text-pk-content-secondary">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 font-semibold",
                            t.side === "BUY" ? "text-pk-green" : t.side === "SELL" ? "text-pk-red" : "text-pk-blue"
                          )}
                        >
                          {t.side}
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-2">{t.marketQuestion}</td>
                        <td className="px-3 py-2 text-pk-content-secondary">{t.outcome}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatShares(t.shares)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCents(t.price)}</td>
                        <td
                          className={cn(
                            "px-3 py-2 text-right tabular-nums",
                            t.cost >= 0 ? "text-pk-green" : "text-pk-content-primary"
                          )}
                        >
                          {formatUsd(t.cost, { sign: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <p className="text-[14px] text-pk-content-secondary">{loading ? "Loading portfolio…" : "No data."}</p>
      )}
    </div>
  );
}
