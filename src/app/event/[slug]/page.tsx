import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchEventBySlug } from "@/lib/polymarket";
import { MarketWorkspace } from "@/components/MarketWorkspace";
import { formatCompact } from "@/lib/format";
import { BookmarkIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await fetchEventBySlug(params.slug);
  if (!event) notFound();

  return (
    <div className="pk-container flex flex-col gap-6 py-6">
      <Link href="/" className="text-[13px] text-pk-content-secondary transition-colors hover:text-pk-content-primary">
        ← Back to markets
      </Link>

      <div className="flex items-start gap-4">
        {event.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.icon} alt="" className="size-14 shrink-0 rounded-lg bg-pk-elevated object-cover" />
        ) : (
          <div className="size-14 shrink-0 rounded-lg bg-pk-elevated" />
        )}
        <div className="min-w-0 flex-1">
          {event.category ? (
            <p className="text-[13px] font-medium text-pk-content-secondary">{event.category}</p>
          ) : null}
          <h1 className="text-[22px] font-semibold leading-snug tracking-tight text-pk-content-primary">
            {event.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-[12px] text-pk-content-secondary">
            <span>${formatCompact(event.volume)} Vol.</span>
            {event.endDate ? <span>Ends {new Date(event.endDate).toLocaleDateString()}</span> : null}
            {event.closed ? (
              <span className="text-pk-red">Closed</span>
            ) : (
              <span className="flex items-center gap-1.5 text-pk-green">
                <span className="pk-live-dot inline-block size-1.5 rounded-full bg-pk-green" /> Live
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Bookmark"
          className="hidden size-9 items-center justify-center rounded-full text-pk-content-tertiary transition-colors hover:bg-pk-elevated hover:text-pk-content-primary sm:flex"
        >
          <BookmarkIcon className="size-[18px]" />
        </button>
      </div>

      <MarketWorkspace event={event} />

      {event.description ? (
        <section className="max-w-3xl">
          <h2 className="mb-3 text-[18px] font-semibold text-pk-content-primary">Rules</h2>
          <div className="rounded-lg border border-pk-border bg-pk-card p-4">
            <p className="mb-2 text-[13px] font-medium text-pk-content-secondary">Additional context</p>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-pk-content-secondary">
              {event.description}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
