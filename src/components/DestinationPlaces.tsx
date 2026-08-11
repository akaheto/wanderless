import Link from "next/link";
import type { Place, Source } from "@/lib/domain/types";
import { PLACE_CATEGORY_LABELS, PLACE_PRIORITY_LABELS } from "@/lib/domain/types";
import { FRESHNESS_LABELS, comparePlaces, describeAge, freshnessOf } from "@/lib/places";
import { Badge, Card, CardHeader, Empty } from "./ui";

/**
 * Places saved for a destination, across every trip.
 *
 * This is where the standing-note idea pays off: a restaurant found on one trip is still
 * here for the next one. Read-only — editing happens on the trip the place belongs to, so
 * there is one place to change a thing rather than two.
 */
export function DestinationPlaces({
  places,
  sources,
  destinationName,
}: {
  places: Place[];
  sources: Map<number, Source>;
  destinationName: string;
}) {
  if (places.length === 0) {
    return (
      <Card>
        <CardHeader title="Places" note="Saved across every trip here." />
        <div className="px-4 py-5">
          <Empty
            title="Nothing saved yet"
            body={`Places you save for ${destinationName} on any trip show up here, and are offered again the next time you come back.`}
          />
        </div>
      </Card>
    );
  }

  const sorted = [...places].sort(comparePlaces);
  const standing = sorted.filter((p) => p.tripId === null).length;

  return (
    <Card>
      <CardHeader
        title="Places"
        note={`${places.length} saved across every trip here${
          standing > 0 ? `, ${standing} kept as standing notes` : ""
        }.`}
      />
      <ul className="divide-y divide-line">
        {sorted.map((place) => {
          const source = place.sourceId ? sources.get(place.sourceId) : undefined;
          return (
            <li
              key={place.id}
              className={`px-4 py-2.5 ${place.priority === "ruled_out" ? "opacity-55" : ""}`}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[13.5px] font-medium">{place.name}</span>
                <Badge>{PLACE_CATEGORY_LABELS[place.category]}</Badge>
                {place.priority === "must" && <Badge tone="accent">Must do</Badge>}
                {place.priority === "ruled_out" && (
                  <Badge>{PLACE_PRIORITY_LABELS.ruled_out}</Badge>
                )}
                <Badge
                  tone={
                    { fresh: "good", aging: "neutral", stale: "warning", unverified: "serious" }[
                      freshnessOf(place)
                    ] as "good" | "neutral" | "warning" | "serious"
                  }
                >
                  {FRESHNESS_LABELS[freshnessOf(place)]}
                </Badge>
              </div>

              {place.whyItMatters && (
                <p className="mt-0.5 text-[13px] text-ink-2">{place.whyItMatters}</p>
              )}

              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-ink-3">
                {place.neighborhood && <span>{place.neighborhood}</span>}
                <span>{source ? source.label : "no source recorded"}</span>
                <span>{describeAge(place)}</span>
                {place.tripId !== null && (
                  <Link href={`/trips/${place.tripId}`} className="text-accent hover:underline">
                    on a trip →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
