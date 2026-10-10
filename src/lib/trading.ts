import { prisma } from "./db";
import { fetchMarketById, fetchMarkPrices, fetchSidePrice } from "./polymarket";
import type { MarketSummary, OutcomeToken } from "./types";

const EPS = 1e-6;
const RESOLVED_THRESHOLD = 0.98; // an outcome priced above this in a closed market is the winner

export type TradeSide = "BUY" | "SELL";

export interface TradeInput {
  marketId: string;
  tokenId: string;
  side: TradeSide;
  shares: number;
}

export interface TradeResult {
  side: TradeSide;
  shares: number;
  price: number;
  cashDelta: number;
  realizedPnl: number;
  cashBalance: number;
  position: { tokenId: string; shares: number; avgCost: number };
}

export class TradeError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "TradeError";
  }
}

function resolveOutcome(market: MarketSummary, tokenId: string): OutcomeToken {
  const outcome = market.outcomes.find((o) => o.tokenId === tokenId);
  if (!outcome) throw new TradeError("Outcome token does not belong to this market", 400);
  return outcome;
}

async function priceForSide(outcome: OutcomeToken, side: TradeSide): Promise<number> {
  const direction = side === "BUY" ? "buy" : "sell";
  // Prefer the live order book; fall back to the aggregate outcome price on an
  // illiquid market so buys and sells stay symmetric instead of hitting the
  // degenerate 0/1 values the /price endpoint returns for an empty book.
  const live = await fetchSidePrice(outcome.tokenId, direction);
  const price = live ?? outcome.price;
  if (!Number.isFinite(price) || price <= 0 || price >= 1) {
    throw new TradeError("No tradeable price available for this outcome right now", 409);
  }
  return price;
}

export async function executeTrade(userId: string, input: TradeInput): Promise<TradeResult> {
  if (!(input.shares > 0)) throw new TradeError("Share quantity must be positive");

  const market = await fetchMarketById(input.marketId);
  if (!market) throw new TradeError("Market not found", 404);
  if (market.closed || !market.active) throw new TradeError("Market is not open for trading", 409);

  const outcome = resolveOutcome(market, input.tokenId);
  const price = await priceForSide(outcome, input.side);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new TradeError("User not found", 401);

    const existing = await tx.position.findUnique({
      where: { userId_tokenId: { userId, tokenId: input.tokenId } }
    });

    if (input.side === "BUY") {
      const cost = input.shares * price;
      if (cost > user.cashBalance + EPS) throw new TradeError("Insufficient cash balance", 409);

      const priorShares = existing?.shares ?? 0;
      const priorAvg = existing?.avgCost ?? 0;
      const newShares = priorShares + input.shares;
      const newAvg = (priorShares * priorAvg + input.shares * price) / newShares;

      const position = await tx.position.upsert({
        where: { userId_tokenId: { userId, tokenId: input.tokenId } },
        create: {
          userId,
          marketId: market.id,
          conditionId: market.conditionId,
          tokenId: input.tokenId,
          marketSlug: market.slug,
          marketQuestion: market.question,
          outcome: outcome.label,
          outcomeIndex: outcome.index,
          shares: input.shares,
          avgCost: price,
          settled: false
        },
        update: { shares: newShares, avgCost: newAvg, settled: false }
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { cashBalance: { decrement: cost } }
      });

      await tx.trade.create({
        data: {
          userId,
          marketId: market.id,
          conditionId: market.conditionId,
          tokenId: input.tokenId,
          marketSlug: market.slug,
          marketQuestion: market.question,
          outcome: outcome.label,
          outcomeIndex: outcome.index,
          side: "BUY",
          shares: input.shares,
          price,
          cost: -cost,
          realizedPnl: 0
        }
      });

      return {
        side: "BUY" as const,
        shares: input.shares,
        price,
        cashDelta: -cost,
        realizedPnl: 0,
        cashBalance: updatedUser.cashBalance,
        position: { tokenId: input.tokenId, shares: position.shares, avgCost: position.avgCost }
      };
    }

    // SELL
    if (!existing || existing.shares + EPS < input.shares) {
      throw new TradeError("You do not own enough shares to sell", 409);
    }
    const proceeds = input.shares * price;
    const realized = input.shares * (price - existing.avgCost);
    const newShares = Math.max(existing.shares - input.shares, 0);

    const position = await tx.position.update({
      where: { userId_tokenId: { userId, tokenId: input.tokenId } },
      data: { shares: newShares }
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { cashBalance: { increment: proceeds } }
    });

    await tx.trade.create({
      data: {
        userId,
        marketId: market.id,
        conditionId: market.conditionId,
        tokenId: input.tokenId,
        marketSlug: market.slug,
        marketQuestion: market.question,
        outcome: outcome.label,
        outcomeIndex: outcome.index,
        side: "SELL",
        shares: input.shares,
        price,
        cost: proceeds,
        realizedPnl: realized
      }
    });

    return {
      side: "SELL" as const,
      shares: input.shares,
      price,
      cashDelta: proceeds,
      realizedPnl: realized,
      cashBalance: updatedUser.cashBalance,
      position: { tokenId: input.tokenId, shares: position.shares, avgCost: position.avgCost }
    };
  });
}

// ---- Settlement of resolved markets --------------------------------------

export interface SettlementResult {
  settledPositions: number;
  cashCredited: number;
}

export async function settleResolvedPositions(userId: string): Promise<SettlementResult> {
  const open = await prisma.position.findMany({
    where: { userId, settled: false, shares: { gt: EPS } }
  });
  if (open.length === 0) return { settledPositions: 0, cashCredited: 0 };

  const marketIds = Array.from(new Set(open.map((p) => p.marketId)));
  const markets = await Promise.all(marketIds.map((id) => fetchMarketById(id)));
  const marketById: Record<string, MarketSummary> = {};
  markets.forEach((m) => {
    if (m) marketById[m.id] = m;
  });

  let settledPositions = 0;
  let cashCredited = 0;

  for (const pos of open) {
    const market = marketById[pos.marketId];
    if (!market || !market.closed) continue;
    const winner = market.outcomes.find((o) => o.price >= RESOLVED_THRESHOLD);
    if (!winner) continue; // closed but not decisively resolved yet

    const won = winner.tokenId === pos.tokenId;
    const payout = won ? pos.shares : 0;
    const realized = payout - pos.shares * pos.avgCost;

    await prisma.$transaction(async (tx) => {
      await tx.position.update({ where: { id: pos.id }, data: { shares: 0, settled: true } });
      if (payout > 0) {
        await tx.user.update({ where: { id: userId }, data: { cashBalance: { increment: payout } } });
      }
      await tx.trade.create({
        data: {
          userId,
          marketId: pos.marketId,
          conditionId: pos.conditionId,
          tokenId: pos.tokenId,
          marketSlug: pos.marketSlug,
          marketQuestion: pos.marketQuestion,
          outcome: pos.outcome,
          outcomeIndex: pos.outcomeIndex,
          side: "SETTLE",
          shares: pos.shares,
          price: won ? 1 : 0,
          cost: payout,
          realizedPnl: realized
        }
      });
    });

    settledPositions += 1;
    cashCredited += payout;
  }

  return { settledPositions, cashCredited };
}

// ---- Portfolio view ------------------------------------------------------

export interface PortfolioPosition {
  tokenId: string;
  marketId: string;
  marketSlug: string;
  marketQuestion: string;
  outcome: string;
  shares: number;
  avgCost: number;
  markPrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedPnl: number;
}

export interface Portfolio {
  cashBalance: number;
  positionsValue: number;
  portfolioValue: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  positions: PortfolioPosition[];
}

export async function getPortfolio(userId: string): Promise<Portfolio> {
  await settleResolvedPositions(userId);

  const [user, rawPositions, realizedAgg] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.position.findMany({ where: { userId, shares: { gt: EPS } }, orderBy: { updatedAt: "desc" } }),
    prisma.trade.aggregate({ where: { userId }, _sum: { realizedPnl: true } })
  ]);
  if (!user) throw new TradeError("User not found", 401);

  const marks = await fetchMarkPrices(rawPositions.map((p) => p.tokenId));

  let positionsValue = 0;
  let totalUnrealizedPnl = 0;
  const positions: PortfolioPosition[] = rawPositions.map((p) => {
    const markPrice = marks[p.tokenId] ?? p.avgCost;
    const costBasis = p.shares * p.avgCost;
    const marketValue = p.shares * markPrice;
    const unrealizedPnl = marketValue - costBasis;
    positionsValue += marketValue;
    totalUnrealizedPnl += unrealizedPnl;
    return {
      tokenId: p.tokenId,
      marketId: p.marketId,
      marketSlug: p.marketSlug,
      marketQuestion: p.marketQuestion,
      outcome: p.outcome,
      shares: p.shares,
      avgCost: p.avgCost,
      markPrice,
      costBasis,
      marketValue,
      unrealizedPnl
    };
  });

  return {
    cashBalance: user.cashBalance,
    positionsValue,
    portfolioValue: user.cashBalance + positionsValue,
    totalUnrealizedPnl,
    totalRealizedPnl: realizedAgg._sum.realizedPnl ?? 0,
    positions
  };
}
