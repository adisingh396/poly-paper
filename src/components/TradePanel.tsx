"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "./UserProvider";
import { cn } from "@/lib/utils";
import type { MarketSummary } from "@/lib/types";
import { formatShares, formatUsd } from "@/lib/format";

type Side = "BUY" | "SELL";
const INCREMENTS = [1, 5, 10, 100];
const QUOTE_POLL_MS = 5000;

interface Feedback {
  ok: boolean;
  text: string;
}

function cents(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

export function TradePanel({
  market,
  tokenId,
  side,
  onSelectToken,
  onSetSide,
  onTraded
}: {
  market: MarketSummary;
  tokenId: string;
  side: Side;
  onSelectToken: (tokenId: string) => void;
  onSetSide: (side: Side) => void;
  onTraded?: () => void;
}) {
  const { user, refresh } = useUser();
  const outcome = market.outcomes.find((o) => o.tokenId === tokenId) ?? market.outcomes[0];
  const [usd, setUsd] = useState("0");
  const [shareQty, setShareQty] = useState("");
  const [quote, setQuote] = useState<number | null>(null);
  const [owned, setOwned] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const direction = side === "BUY" ? "buy" : "sell";

  useEffect(() => {
    let cancelled = false;
    async function loadQuote() {
      try {
        const res = await fetch(`/api/quote?tokenId=${encodeURIComponent(tokenId)}&side=${direction}`, {
          cache: "no-store"
        });
        const data = await res.json();
        if (!cancelled) setQuote(typeof data.price === "number" ? data.price : null);
      } catch {
        if (!cancelled) setQuote(null);
      }
    }
    void loadQuote();
    const timer = setInterval(loadQuote, QUOTE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tokenId, direction]);

  const loadOwned = useCallback(async () => {
    if (!user) {
      setOwned(0);
      return;
    }
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      const data = await res.json();
      const pos = data.portfolio?.positions?.find(
        (p: { tokenId: string; shares: number }) => p.tokenId === tokenId
      );
      setOwned(pos ? pos.shares : 0);
    } catch {
      setOwned(0);
    }
  }, [user, tokenId]);

  useEffect(() => {
    void loadOwned();
  }, [loadOwned]);

  const price = quote ?? outcome.price;
  const usdNum = parseFloat(usd) || 0;
  const shareNum = parseFloat(shareQty) || 0;
  const estBuyShares = price > 0 && usdNum > 0 ? usdNum / price : 0;
  const estSellProceeds = shareNum > 0 ? shareNum * price : 0;

  const canSubmit = useMemo(() => {
    if (!user || busy || !(price > 0)) return false;
    if (side === "BUY") return usdNum > 0 && usdNum <= user.cashBalance + 1e-6;
    return shareNum > 0 && shareNum <= owned + 1e-6;
  }, [user, busy, price, side, usdNum, shareNum, owned]);

  async function submit() {
    if (!canSubmit || !user) return;
    setBusy(true);
    setFeedback(null);
    const shares = side === "BUY" ? estBuyShares : shareNum;
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketId: market.id, tokenId, side, shares })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, text: data.error ?? "Trade failed" });
      } else {
        const r = data.result;
        setFeedback({
          ok: true,
          text:
            side === "BUY"
              ? `Bought ${formatShares(r.shares)} ${outcome.label} @ ${cents(r.price)}`
              : `Sold ${formatShares(r.shares)} @ ${cents(r.price)} · P&L ${formatUsd(r.realizedPnl, { sign: true })}`
        });
        setUsd("0");
        setShareQty("");
        await refresh();
        await loadOwned();
        onTraded?.();
      }
    } catch {
      setFeedback({ ok: false, text: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-pk-border bg-pk-card p-4">
      {/* header */}
      <div className="mb-3 flex items-center gap-2.5">
        {market.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={market.icon} alt="" className="size-9 shrink-0 rounded-md bg-pk-elevated object-cover" />
        ) : (
          <div className="size-9 shrink-0 rounded-md bg-pk-elevated" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[13px] text-pk-content-secondary">{market.question}</p>
          <p className="truncate text-[14px] font-semibold text-pk-content-primary">
            {market.shortLabel} · {outcome.label}
          </p>
        </div>
      </div>

      {/* buy/sell + market type */}
      <div className="mb-3 flex items-center justify-between border-b border-pk-border">
        <div className="flex gap-4">
          {(["BUY", "SELL"] as Side[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                onSetSide(s);
                setFeedback(null);
              }}
              className={cn(
                "-mb-px border-b-2 pb-2 text-[15px] font-semibold transition-colors",
                side === s ? "border-pk-blue text-pk-content-primary" : "border-transparent text-pk-content-secondary"
              )}
            >
              {s === "BUY" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>
        <span className="pb-2 text-[13px] font-medium text-pk-content-secondary">Market</span>
      </div>

      {/* outcome (Yes/No) selector */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {market.outcomes.slice(0, 2).map((o, i) => {
          const active = o.tokenId === tokenId;
          const isYes = i === 0;
          return (
            <button
              key={o.tokenId}
              onClick={() => onSelectToken(o.tokenId)}
              className={cn(
                "flex h-12 items-center justify-center rounded-md border text-[15px] font-semibold transition-colors",
                active
                  ? isYes
                    ? "border-pk-green bg-pk-green text-white"
                    : "border-pk-red bg-pk-red text-white"
                  : "border-pk-border text-pk-content-primary hover:border-pk-border-strong"
              )}
            >
              {o.label} {cents(o.price)}
            </button>
          );
        })}
      </div>

      {side === "BUY" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-pk-content-primary">Amount</span>
            <input
              inputMode="decimal"
              value={usd}
              onChange={(e) => setUsd(e.target.value)}
              className="w-28 bg-transparent text-right text-[26px] font-semibold tabular-nums text-pk-content-primary outline-none"
            />
          </div>
          <div className="flex gap-2">
            {INCREMENTS.map((inc) => (
              <button
                key={inc}
                onClick={() => setUsd(String(Math.round(((parseFloat(usd) || 0) + inc) * 100) / 100))}
                className="flex-1 rounded-md bg-pk-elevated py-1.5 text-[13px] font-medium text-pk-content-primary transition-colors hover:bg-pk-elevated-hover"
              >
                +${inc}
              </button>
            ))}
            <button
              onClick={() => user && setUsd(user.cashBalance.toFixed(2))}
              className="flex-1 rounded-md bg-pk-elevated py-1.5 text-[13px] font-medium text-pk-content-primary transition-colors hover:bg-pk-elevated-hover"
            >
              Max
            </button>
          </div>
          <div className="space-y-1 text-[12px] text-pk-content-secondary">
            <div className="flex justify-between">
              <span>Est. shares</span>
              <span className="tabular-nums text-pk-content-primary">{formatShares(estBuyShares)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payout if {outcome.label} wins</span>
              <span className="tabular-nums text-pk-green">{formatUsd(estBuyShares)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-pk-content-primary">Shares</span>
            <input
              inputMode="decimal"
              value={shareQty}
              onChange={(e) => setShareQty(e.target.value)}
              placeholder="0"
              className="w-28 bg-transparent text-right text-[26px] font-semibold tabular-nums text-pk-content-primary outline-none placeholder:text-pk-content-tertiary"
            />
          </div>
          <button
            onClick={() => setShareQty(owned > 0 ? String(owned) : "")}
            className="rounded-md bg-pk-elevated py-1.5 text-[13px] font-medium text-pk-content-primary transition-colors hover:bg-pk-elevated-hover"
          >
            Sell max ({formatShares(owned)})
          </button>
          <div className="flex justify-between text-[12px] text-pk-content-secondary">
            <span>Est. proceeds</span>
            <span className="tabular-nums text-pk-content-primary">{formatUsd(estSellProceeds)}</span>
          </div>
        </div>
      )}

      {feedback ? (
        <p
          className={cn(
            "mt-3 rounded-md px-3 py-2 text-[12px]",
            feedback.ok ? "bg-pk-green-tint text-pk-green" : "bg-pk-red-tint text-pk-red"
          )}
        >
          {feedback.text}
        </p>
      ) : null}

      {user ? (
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="mt-4 w-full rounded-lg bg-pk-blue py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Placing…" : "Trade"}
        </button>
      ) : (
        <Link
          href="/login"
          className="mt-4 block w-full rounded-lg bg-pk-blue py-3 text-center text-[15px] font-semibold text-white"
        >
          Log in to trade
        </Link>
      )}

      <p className="mt-3 text-center text-[11px] text-pk-content-tertiary">
        Paper trading · virtual balance · no real funds
      </p>
    </div>
  );
}
