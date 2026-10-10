// Original PolyPaper wordmark — not derived from any third-party brand asset.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={className ?? "flex items-center gap-2"}>
      <span className="grid size-7 place-items-center rounded-md bg-pk-blue text-[15px] font-bold text-white">
        P
      </span>
      <span className="text-[17px] font-bold tracking-tight text-pk-content-primary">
        Poly<span className="text-pk-blue">Paper</span>
      </span>
    </span>
  );
}
