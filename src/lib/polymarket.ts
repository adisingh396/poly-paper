import { z } from "zod";
import type {
  EventSummary,
  MarketSummary,
  OrderBook,
  OrderBookLevel,
  OutcomeToken,
  PricePoint
} from "./types";

// Public, read-only Polymarket endpoints. No auth needed for market data.
const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

const DEFAULT_TIMEOUT_MS = 12_000;

async function httpGet(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "poly-paper/1.0" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---- Boundary schemas ----------------------------------------------------

const numeric = z.union([z.number(), z.string()]);

// num() and parseStringArray() are shared coercion helpers with many call
// sites; they encapsulate Gamma's mixed number/string + stringified-array quirks.
function num(value: number | string | undefined | null, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : fallback;
}

// Gamma stringifies array fields (outcomes / outcomePrices / clobTokenIds).
function parseStringArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const GammaMarketSchema = z
  .object({
    id: numeric,
    conditionId: z.string().optional(),
    question: z.string().optional(),
    groupItemTitle: z.string().optional(),
    slug: z.string().optional(),
    icon: z.string().optional(),
    image: z.string().optional(),
    active: z.boolean().optional(),
    closed: z.boolean().optional(),
    endDate: z.string().nullish(),
    volume: numeric.optional(),
    volumeNum: z.number().optional(),
    liquidity: numeric.optional(),
    liquidityNum: z.number().optional(),
    outcomes: z.string().optional(),
    outcomePrices: z.string().optional(),
    clobTokenIds: z.string().optional(),
    description: z.string().optional(),
    oneDayPriceChange: numeric.optional(),
    volume24hr: numeric.optional(),
  })
  .passthrough();

const GammaEventSchema = z
  .object({
    id: numeric,
    title: z.string().optional(),
    slug: z.string().optional(),
    icon: z.string().optional(),
    image: z.string().optional(),
    active: z.boolean().optional(),
    closed: z.boolean().optional(),
    endDate: z.string().nullish(),
    volume: numeric.optional(),
    liquidity: numeric.optional(),
    description: z.string().optional(),
    tags: z
      .array(z.object({ slug: z.string().optional(), label: z.string().optional() }).passthrough())
      .optional(),
    markets: z.array(z.unknown()).optional()
  })
  .passthrough();

const EventsResponseSchema = z.union([
  z.array(z.unknown()),
  z.object({ events: z.array(z.unknown()).optional() }).passthrough()
]);

const BookLevelSchema = z.object({ price: numeric, size: numeric });
const BookSchema = z
  .object({ bids: z.array(BookLevelSchema).optional(), asks: z.array(BookLevelSchema).optional() })
  .passthrough();

const MidpointSchema = z.object({ mid: z.string().optional() }).passthrough();
const HistorySchema = z
  .object({ history: z.array(z.object({ t: numeric, p: numeric })).optional() })
  .passthrough();

// ---- Normalisation -------------------------------------------------------

function normalizeMarket(raw: unknown): MarketSummary | null {
  const parsed = GammaMarketSchema.safeParse(raw);
  if (!parsed.success) return null;
  const m = parsed.data;

  const labels = parseStringArray(m.outcomes);
  const prices = parseStringArray(m.outcomePrices).map((p) => num(p));
  const tokenIds = parseStringArray(m.clobTokenIds);

  // A tradeable market needs outcome labels mapped 1:1 to CLOB token ids.
  if (labels.length === 0 || tokenIds.length !== labels.length) return null;

  const outcomes: OutcomeToken[] = labels.map((label, i) => ({
    index: i,
    label,
    tokenId: tokenIds[i],
    price: prices[i] ?? 0
  }));

  return {
    id: String(m.id),
    conditionId: m.conditionId ?? "",
    question: m.question ?? m.groupItemTitle ?? "Untitled market",
    shortLabel: m.groupItemTitle ?? m.question ?? "Untitled market",
    slug: m.slug ?? "",
    icon: m.icon ?? m.image ?? null,
    description: m.description ?? "",
    active: m.active ?? false,
    closed: m.closed ?? false,
    endDate: m.endDate ?? null,
    volume: num(m.volumeNum ?? m.volume24hr ?? m.volume),
    liquidity: num(m.liquidityNum ?? m.liquidity),
    oneDayPriceChange: num(m.oneDayPriceChange),
    outcomes
  };
}

function normalizeEvent(raw: unknown): EventSummary | null {
  const parsed = GammaEventSchema.safeParse(raw);
  if (!parsed.success) return null;
  const e = parsed.data;

  const markets = (e.markets ?? [])
    .map(normalizeMarket)
    .filter((m): m is MarketSummary => m !== null);
  if (markets.length === 0) return null;

  const primaryTag = e.tags?.[0];
  return {
    id: String(e.id),
    title: e.title ?? "Untitled event",
    slug: e.slug ?? "",
    icon: e.icon ?? e.image ?? null,
    description: e.description ?? markets[0]?.description ?? "",
    category: primaryTag?.label ?? null,
    categorySlug: primaryTag?.slug ?? null,
    active: e.active ?? false,
    closed: e.closed ?? false,
    endDate: e.endDate ?? null,
    volume: num(e.volume),
    liquidity: num(e.liquidity),
    markets
  };
}

// ---- Gamma (discovery) ---------------------------------------------------

export interface EventQuery {
  limit?: number;
  offset?: number;
  search?: string;
  tag?: string;
  order?: string;
  ascending?: boolean;
}

export async function fetchEvents(query: EventQuery = {}): Promise<EventSummary[]> {
  let url: string;
  if (query.search) {
    const params = new URLSearchParams({ q: query.search, limit_per_type: "40", events_status: "active" });
    url = `${GAMMA}/public-search?${params.toString()}`;
  } else {
    const params = new URLSearchParams();
    params.set("limit", String(query.limit ?? 40));
    params.set("offset", String(query.offset ?? 0));
    params.set("active", "true");
    params.set("closed", "false");
    params.set("archived", "false");
    params.set("order", query.order ?? "volume24hr");
    params.set("ascending", String(query.ascending ?? false));
    if (query.tag) params.set("tag_slug", query.tag);
    url = `${GAMMA}/events?${params.toString()}`;
  }

  const parsed = EventsResponseSchema.safeParse(await httpGet(url));
  if (!parsed.success) return [];
  const list = Array.isArray(parsed.data) ? parsed.data : parsed.data.events ?? [];
  return list.map(normalizeEvent).filter((e): e is EventSummary => e !== null);
}

export async function fetchEventBySlug(slug: string): Promise<EventSummary | null> {
  const data = await httpGet(`${GAMMA}/events?slug=${encodeURIComponent(slug)}`);
  const raw = Array.isArray(data) ? data[0] : data;
  return raw ? normalizeEvent(raw) : null;
}

export async function fetchMarketById(id: string): Promise<MarketSummary | null> {
  return normalizeMarket(await httpGet(`${GAMMA}/markets/${encodeURIComponent(id)}`));
}

// ---- CLOB (live pricing) -------------------------------------------------

function sortLevels(raw: { price: number | string; size: number | string }[], dir: "asc" | "desc"): OrderBookLevel[] {
  const levels = raw
    .map((l) => ({ price: num(l.price), size: num(l.size) }))
    .filter((l) => l.size > 0 && l.price > 0);
  levels.sort((a, b) => (dir === "asc" ? a.price - b.price : b.price - a.price));
  return levels;
}

export async function fetchOrderBook(tokenId: string): Promise<OrderBook> {
  const parsed = BookSchema.safeParse(await httpGet(`${CLOB}/book?token_id=${encodeURIComponent(tokenId)}`));
  const bids = parsed.success ? sortLevels(parsed.data.bids ?? [], "desc") : [];
  const asks = parsed.success ? sortLevels(parsed.data.asks ?? [], "asc") : [];
  const bestBid = bids.length ? bids[0].price : null;
  const bestAsk = asks.length ? asks[0].price : null;
  const midpoint = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;
  return { tokenId, bids: bids.slice(0, 12), asks: asks.slice(0, 12), bestBid, bestAsk, midpoint };
}

// Executable fill price from the live order book: "buy" lifts the best ask,
// "sell" hits the best bid; falls back to the midpoint on a one-sided book.
// Returns null when the book is empty so callers can fall back to the aggregate price.
export async function fetchSidePrice(tokenId: string, side: "buy" | "sell"): Promise<number | null> {
  const book = await fetchOrderBook(tokenId);
  const top = side === "buy" ? book.bestAsk : book.bestBid;
  const price = top ?? book.midpoint;
  return price !== null && price > 0 && price < 1 ? price : null;
}

export async function fetchMidpoint(tokenId: string): Promise<number | null> {
  try {
    const parsed = MidpointSchema.safeParse(
      await httpGet(`${CLOB}/midpoint?token_id=${encodeURIComponent(tokenId)}`)
    );
    if (!parsed.success) return null;
    const p = num(parsed.data.mid, NaN);
    return Number.isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

export async function fetchPriceHistory(tokenId: string, interval = "1w", fidelity = 60): Promise<PricePoint[]> {
  const params = new URLSearchParams({ market: tokenId, interval, fidelity: String(fidelity) });
  try {
    const parsed = HistorySchema.safeParse(await httpGet(`${CLOB}/prices-history?${params.toString()}`));
    if (!parsed.success) return [];
    return (parsed.data.history ?? []).map((h) => ({ t: num(h.t), p: num(h.p) }));
  } catch {
    return [];
  }
}

// Mark-to-market price for many tokens at once (best-effort, bounded parallelism).
export async function fetchMarkPrices(tokenIds: string[]): Promise<Record<string, number>> {
  const unique = Array.from(new Set(tokenIds));
  const out: Record<string, number> = {};
  const batchSize = 8;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((id) => fetchMidpoint(id)));
    batch.forEach((id, idx) => {
      const p = results[idx];
      if (p !== null) out[id] = p;
    });
  }
  return out;
}
