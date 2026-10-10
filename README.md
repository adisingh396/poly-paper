# PolyPaper — Prediction Market Paper Trading

A full-stack clone of the Polymarket experience for **paper trading**. It pulls **live
markets, prices, order books and price history straight from Polymarket's public APIs**,
but users sign into a **local database** and trade a fixed **virtual $1,000** balance.
No real money, wallets, or on-chain orders are ever involved.

## What's real vs. simulated

| Real (live from Polymarket) | Simulated (local) |
| --- | --- |
| Events, markets, outcomes (Gamma API) | User accounts / login (SQLite + JWT cookie) |
| Order books, midpoints (CLOB API) | $1,000 starting balance per account |
| Live prices per side (best bid/ask) | Buy/sell fills against the live price |
| Price history charts (CLOB API) | Positions, cash, realized/unrealized P&L |
| Market resolution / winning outcome | Settlement payout ($1 per winning share) |

Fills use the live order book (`buy` lifts the best ask, `sell` hits the best bid), so a
round trip pays the real spread — just like the real exchange. Illiquid markets fall back
to the aggregate outcome price so buys and sells stay symmetric.

## Stack

- **Next.js 14 (App Router) + TypeScript** — SSR pages + API routes
- **Prisma + SQLite** — local persistence (`prisma/dev.db`)
- **bcryptjs + jose** — password hashing + signed httpOnly session cookie
- **zod** — validation at every API and Polymarket boundary
- **Recharts + Tailwind** — charts and UI

## Setup

```bash
cd poly-paper
npm install
npx prisma db push        # creates prisma/dev.db from the schema
npm run build
npm start                 # http://localhost:3000
```

For development with hot reload: `npm run dev`.

`.env` holds the local config (already provided for local use):

- `DATABASE_URL` — SQLite file path
- `SESSION_SECRET` — signing key for session JWTs (change for any shared deploy)
- `STARTING_BALANCE` — virtual balance granted to new accounts (default `1000`)

## How it works

1. **Sign up** → account created in SQLite with a $1,000 virtual balance and a signed
   session cookie.
2. **Browse markets** (`/`) → live events from the Gamma API, searchable and tag-filtered.
3. **Open a market** (`/event/[slug]`) → live price chart, polling order book, and a
   Buy/Sell trade panel per outcome.
4. **Trade** → the engine fetches the live price, checks your balance/holdings inside a
   DB transaction, and records the fill in an immutable trade ledger.
5. **Portfolio** (`/portfolio`) → cash, positions marked to the live midpoint, and
   realized/unrealized P&L. Resolved markets settle automatically on load.

## Project layout

```
src/lib/          polymarket.ts (API client), trading.ts (engine), auth.ts, session.ts, db.ts
src/app/api/      auth/*, markets, events/[slug], book, prices-history, quote, trade, portfolio
src/app/          page.tsx (markets), event/[slug], portfolio, login, register
src/components/   Header, EventCard, MarketWorkspace, PriceChart, OrderBook, TradePanel, AuthForm
prisma/           schema.prisma (User, Position, Trade)
```

## Notes

- Market data comes from Polymarket's **public read-only** endpoints (no API key needed).
- Authentication is intended for local single-user paper trading; harden the session
  secret and add rate limiting/HTTPS before exposing it on a network.
