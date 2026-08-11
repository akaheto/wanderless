import Link from "next/link";
import type { Trip, TripCandidate } from "@/lib/domain/types";
import { getDestination } from "@/data/destinations";
import { formatDateRange, nightsBetween, daysUntil } from "@/lib/dates";
import { Badge, StatusBadge } from "./ui";

export function TripCard({ trip, candidates }: { trip: Trip; candidates: TripCandidate[] }) {
  const nights = trip.startDate && trip.endDate ? nightsBetween(trip.startDate, trip.endDate) : null;
  const countdown = trip.startDate ? daysUntil(trip.startDate) : null;
  const selected = candidates.find((c) => c.status === "selected");
  const shortlisted = candidates.filter((c) => c.status === "shortlisted");
  const active = candidates.filter((c) => c.status !== "rejected");

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block rounded-lg border border-line bg-surface-1 px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight">{trip.name}</h3>
          <p className="tnum mt-0.5 text-[13px] text-ink-2">
            {formatDateRange(trip.startDate, trip.endDate)}
            {nights !== null && <span className="text-ink-3"> · {nights} nights</span>}
            {trip.travelers > 1 && <span className="text-ink-3"> · {trip.travelers} travellers</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={trip.status} />
          {countdown !== null && countdown >= 0 && countdown <= 400 && (
            <span className="tnum text-[11.5px] text-ink-3">
              {countdown === 0 ? "leaves today" : `in ${countdown} days`}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {selected ? (
          <Badge tone="good">{getDestination(selected.destinationId)?.name ?? selected.destinationId}</Badge>
        ) : shortlisted.length > 0 ? (
          shortlisted.slice(0, 3).map((c) => (
            <Badge key={c.id} tone="accent">
              {getDestination(c.destinationId)?.name ?? c.destinationId}
            </Badge>
          ))
        ) : active.length > 0 ? (
          <span className="text-[12.5px] text-ink-3">
            {active.length} destination{active.length === 1 ? "" : "s"} in play
          </span>
        ) : (
          <span className="text-[12.5px] text-ink-3">No destinations added yet</span>
        )}
        {shortlisted.length > 3 && (
          <span className="text-[12px] text-ink-3">+{shortlisted.length - 3} more</span>
        )}
      </div>
    </Link>
  );
}
