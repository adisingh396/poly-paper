// Presentation helpers shared by server and client components.

export function formatUsd(value: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatCents(price: number): string {
  // Outcome prices are 0..1; Polymarket shows them as cents (probability).
  return `${(price * 100).toFixed(1)}¢`;
}

export function formatProbability(price: number): string {
  return `${Math.round(price * 100)}%`;
}

export function formatCompact(value: number): string {
  return value.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

export function formatShares(shares: number): string {
  return shares.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
