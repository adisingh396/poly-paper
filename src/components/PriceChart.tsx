"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps
} from "recharts";
import { cn } from "@/lib/utils";
import type { PricePoint } from "@/lib/types";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  tokenId: string;
}

const INTERVALS: { label: string; interval: string; fidelity: number }[] = [
  { label: "1H", interval: "1h", fidelity: 1 },
  { label: "6H", interval: "6h", fidelity: 5 },
  { label: "1D", interval: "1d", fidelity: 15 },
  { label: "1W", interval: "1w", fidelity: 60 },
  { label: "1M", interval: "1m", fidelity: 180 },
  { label: "ALL", interval: "max", fidelity: 720 }
];

type Row = { time: number } & Record<string, number>;

function mergeSeries(histories: { key: string; points: PricePoint[] }[]): Row[] {
  const times = Array.from(new Set(histories.flatMap((h) => h.points.map((p) => p.t)))).sort((a, b) => a - b);
  const byKey: Record<string, Map<number, number>> = {};
  histories.forEach((h) => {
    const map = new Map<number, number>();
    h.points.forEach((p) => map.set(p.t, p.p * 100));
    byKey[h.key] = map;
  });

  const last: Record<string, number> = {};
  return times.map((t) => {
    const row: Row = { time: t * 1000 };
    histories.forEach((h) => {
      const v = byKey[h.key].get(t);
      if (v !== undefined) last[h.key] = v;
      if (last[h.key] !== undefined) row[h.key] = last[h.key];
    });
    return row;
  });
}

function ChartTooltip({ active, payload, series }: TooltipProps<number, string> & { series: ChartSeries[] }) {
  if (!active || !payload?.length) return null;
  const time = (payload[0].payload as Row).time;
  return (
    <div className="rounded-md border border-pk-border bg-pk-elevated px-2.5 py-1.5 text-[12px]">
      <div className="mb-1 text-pk-content-secondary">{new Date(time).toLocaleString()}</div>
      {series.map((s) => {
        const v = (payload[0].payload as Row)[s.key];
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full" style={{ background: s.color }} />
            <span className="text-pk-content-primary">
              {s.label}: {v !== undefined ? `${v.toFixed(1)}%` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PriceChart({ series }: { series: ChartSeries[] }) {
  const [selected, setSelected] = useState(INTERVALS[3]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const seriesKey = series.map((s) => s.tokenId).join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      series.map(async (s) => {
        const params = new URLSearchParams({
          tokenId: s.tokenId,
          interval: selected.interval,
          fidelity: String(selected.fidelity)
        });
        try {
          const res = await fetch(`/api/prices-history?${params.toString()}`, { cache: "no-store" });
          const data = await res.json();
          return { key: s.key, points: Array.isArray(data.history) ? (data.history as PricePoint[]) : [] };
        } catch {
          return { key: s.key, points: [] as PricePoint[] };
        }
      })
    )
      .then((histories) => {
        if (!cancelled) setRows(mergeSeries(histories));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey, selected]);

  const latest = useMemo(() => {
    const out: Record<string, number | null> = {};
    series.forEach((s) => {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i][s.key] !== undefined) {
          out[s.key] = rows[i][s.key];
          return;
        }
      }
      out[s.key] = null;
    });
    return out;
  }, [rows, series]);

  return (
    <div className="rounded-lg border border-pk-border bg-pk-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-[13px] text-pk-content-secondary">{s.label}</span>
              <span className="text-[15px] font-semibold tabular-nums" style={{ color: s.color }}>
                {latest[s.key] !== null && latest[s.key] !== undefined ? `${latest[s.key]!.toFixed(0)}%` : "—"}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv.label}
              onClick={() => setSelected(iv)}
              className={cn(
                "rounded-md px-2 py-1 text-[12px] font-medium transition-colors",
                selected.label === iv.label
                  ? "bg-pk-elevated text-pk-content-primary"
                  : "text-pk-content-secondary hover:text-pk-content-primary"
              )}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        {loading ? (
          <div className="grid h-full place-items-center text-[13px] text-pk-content-secondary">Loading chart…</div>
        ) : rows.length === 0 ? (
          <div className="grid h-full place-items-center text-[13px] text-pk-content-secondary">No price history</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--pk-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                stroke="var(--pk-content-tertiary)"
                fontSize={11}
                minTickGap={40}
              />
              <YAxis
                domain={[0, 100]}
                stroke="var(--pk-content-tertiary)"
                fontSize={11}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip content={<ChartTooltip series={series} />} />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
