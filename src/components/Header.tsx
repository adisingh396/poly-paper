"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "./UserProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/format";
import { BellIcon, ChevronDownIcon, LogoutIcon, SearchIcon, TrendingIcon } from "./icons";

const CATEGORIES: { label: string; href: string; trending?: boolean }[] = [
  { label: "Trending", href: "/", trending: true },
  { label: "Bitcoin", href: "/?tag=bitcoin" },
  { label: "Live", href: "/?live=1" },
  { label: "⚡ Fast", href: "/?search=up%20or%20down" },
  { label: "Politics", href: "/?tag=politics" },
  { label: "Sports", href: "/?tag=sports" },
  { label: "Crypto", href: "/?tag=crypto" },
  { label: "Economics", href: "/?tag=economy" },
  { label: "Tech", href: "/?tag=tech" },
  { label: "World", href: "/?tag=world" },
  { label: "Culture", href: "/?tag=pop-culture" }
];

function Balances({ portfolioValue, cash }: { portfolioValue: number | null; cash: number }) {
  return (
    <div className="hidden items-center gap-5 pr-1 lg:flex">
      <div className="text-right leading-tight">
        <p className="text-[15px] font-semibold tabular-nums text-pk-green">
          {formatUsd(portfolioValue ?? cash)}
        </p>
        <p className="text-[11px] text-pk-content-secondary">Portfolio</p>
      </div>
      <div className="text-right leading-tight">
        <p className="text-[15px] font-semibold tabular-nums text-pk-content-primary">{formatUsd(cash)}</p>
        <p className="text-[11px] text-pk-content-secondary">Cash</p>
      </div>
    </div>
  );
}

export function Header() {
  const { user, loading, refresh } = useUser();
  const router = useRouter();
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const cashBalance = user?.cashBalance ?? 0;

  const loadPortfolioValue = useCallback(async () => {
    if (!user) {
      setPortfolioValue(null);
      return;
    }
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPortfolioValue(data.portfolio?.portfolioValue ?? null);
      }
    } catch {
      /* keep last known */
    }
  }, [user]);

  useEffect(() => {
    void loadPortfolioValue();
  }, [loadPortfolioValue, cashBalance]);

  async function logout() {
    setMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
    router.refresh();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/?search=${encodeURIComponent(q)}` : "/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-pk-border bg-pk-surface">
      {/* Row 1 — utility bar */}
      <div className="pk-container flex h-[68px] items-center gap-4">
        <Link href="/" aria-label="PolyPaper home" className="flex shrink-0 items-center">
          <Logo />
        </Link>

        <form
          onSubmit={submitSearch}
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-pk-elevated px-3 md:max-w-[520px]"
        >
          <SearchIcon className="size-[18px] shrink-0 text-pk-content-secondary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets"
            aria-label="Search markets"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-pk-content-primary outline-none placeholder:text-pk-content-secondary"
          />
        </form>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {loading ? null : user ? (
            <>
              <Balances portfolioValue={portfolioValue} cash={cashBalance} />
              <Link
                href="/portfolio"
                className="hidden rounded-full bg-pk-blue px-4 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 sm:inline-flex"
              >
                Portfolio
              </Link>
              <button
                type="button"
                aria-label="Notifications"
                className="hidden size-9 items-center justify-center rounded-full text-pk-content-secondary transition-colors hover:bg-pk-elevated hover:text-pk-content-primary md:flex"
              >
                <BellIcon className="size-[18px]" />
              </button>
              <ThemeToggle />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-pk-elevated"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-pk-blue text-[13px] font-semibold uppercase text-white">
                    {user.username.slice(0, 1)}
                  </span>
                  <ChevronDownIcon className="size-4 text-pk-content-secondary" />
                </button>
                {menuOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Close menu"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-pk-border bg-pk-card py-1 shadow-pk-card-hover">
                      <div className="px-3 py-2 text-[13px] text-pk-content-secondary">@{user.username}</div>
                      <Link
                        href="/portfolio"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2 text-[14px] text-pk-content-primary hover:bg-pk-elevated"
                      >
                        Portfolio
                      </Link>
                      <button
                        type="button"
                        onClick={logout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] text-pk-red hover:bg-pk-elevated"
                      >
                        <LogoutIcon className="size-4" />
                        Log out
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-[14px] font-semibold text-pk-content-primary transition-colors hover:bg-pk-elevated"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-pk-blue px-4 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Row 2 — category bar */}
      <nav className="pk-container flex h-12 items-center gap-1 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[14px] transition-colors",
              cat.trending
                ? "font-semibold text-pk-content-primary"
                : "font-medium text-pk-content-secondary hover:text-pk-content-primary"
            )}
          >
            {cat.trending ? <TrendingIcon className="size-[18px] shrink-0" /> : null}
            {cat.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
