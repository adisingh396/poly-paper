import Link from "next/link";
import { Logo } from "./Logo";

const CATEGORY_LINKS: { label: string; slug: string }[] = [
  { label: "Politics", slug: "politics" },
  { label: "Sports", slug: "sports" },
  { label: "Crypto", slug: "crypto" },
  { label: "Economics", slug: "economy" },
  { label: "Tech", slug: "tech" },
  { label: "World", slug: "world" },
  { label: "Culture", slug: "pop-culture" },
  { label: "Elections", slug: "elections" }
];

const RESOURCE_LINKS = ["How it works", "Markets", "Portfolio", "Leaderboard"];
const ABOUT_LINKS = ["About PolyPaper", "Paper trading", "FAQ", "Terms"];

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-pk-border bg-pk-surface">
      <div className="pk-container py-12">
        <div className="mb-10">
          <Logo />
          <p className="mt-3 max-w-md text-[14px] text-pk-content-secondary">
            Practice trading real prediction markets with a virtual balance. Live data, zero risk.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h3 className="text-[15px] font-semibold text-pk-content-primary">Browse by category</h3>
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 xl:grid-cols-4">
              {CATEGORY_LINKS.map((c) => (
                <Link
                  key={c.label}
                  href={`/?tag=${c.slug}`}
                  className="text-[14px] font-medium text-pk-content-primary transition-colors hover:text-pk-blue"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 lg:gap-16">
            <div className="min-w-[120px]">
              <h3 className="text-[15px] font-semibold text-pk-content-primary">Product</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {RESOURCE_LINKS.map((l) => (
                  <li key={l}>
                    <span className="text-[14px] text-pk-content-secondary">{l}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-[120px]">
              <h3 className="text-[15px] font-semibold text-pk-content-primary">About</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {ABOUT_LINKS.map((l) => (
                  <li key={l}>
                    <span className="text-[14px] text-pk-content-secondary">{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-pk-border pt-6">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-pk-content-secondary">
            <span>© {new Date().getFullYear()} PolyPaper</span>
            <span className="text-pk-content-tertiary">·</span>
            <span>Educational paper trading</span>
          </div>
          <p className="max-w-4xl text-[12px] leading-relaxed text-pk-content-tertiary">
            PolyPaper is an educational paper-trading app. Market data is sourced live from Polymarket&apos;s
            public APIs. Balances are virtual — no real funds, orders, or wallets are involved. Not affiliated
            with or endorsed by Polymarket.
          </p>
        </div>
      </div>
    </footer>
  );
}
