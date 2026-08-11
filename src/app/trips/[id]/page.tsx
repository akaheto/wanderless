import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrip, listCandidates, listLinks, getPreferences } from "@/lib/db/trips";
import { listStops } from "@/lib/db/stops";
import { listPlacesForTrip, listSources } from "@/lib/db/places";
import { getCurrentUser } from "@/lib/auth";
import { getUserById } from "@/lib/db/users";
import { listFlightSearches, listHotelSearches } from "@/lib/db/searches";
import { listEvents } from "@/lib/db/events";
import { listFlightBookings, listHotelBookings } from "@/lib/db/bookings";
import { listBudgetItems } from "@/lib/db/budget";
import { listSharesForTrip, listCollaborators, listInvitesForTrip } from "@/lib/db/users";
import { DESTINATIONS, getDestination, destinationsByRegion } from "@/data/destinations";
import {
  addCandidateAction,
  addLinkAction,
  removeCandidateAction,
  removeLinkAction,
  setCandidateStatusAction,
  setTripStatusAction,
  duplicateTripAction,
} from "@/app/actions";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Empty,
  PageHeader,
  StatTile,
  StatusBadge,
  money,
} from "@/components/ui";
import {
  CANDIDATE_STATUS_LABELS,
  DATE_FLEXIBILITY_LABELS,
  PLANNING_STATUSES,
  PLANNING_STATUS_LABELS,
  type CandidateStatus,
  type Trip,
  type TripCandidate,
} from "@/lib/domain/types";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { PlacesPanel } from "@/components/PlacesPanel";
import { PlaceSearchForm } from "@/components/PlaceSearchForm";
import { ForecastPanel } from "@/components/ForecastPanel";
import { FlightSearchesPanel } from "@/components/FlightSearchesPanel";
import { FlightSearchForm } from "@/components/FlightSearchForm";
import { HotelSearchForm } from "@/components/HotelSearchForm";
import { FlightBookingsPanel } from "@/components/FlightBookingsPanel";
import { HotelBookingsPanel } from "@/components/HotelBookingsPanel";
import { HotelSearchesPanel } from "@/components/HotelSearchesPanel";
import { SearchComparisonPanel } from "@/components/SearchComparisonPanel";
import { TripBudgetPanel } from "@/components/TripBudgetPanel";
import { EventsPanel } from "@/components/EventsPanel";
import { SharingPanel } from "@/components/SharingPanel";
import { compareForecastWithNormal, fetchForecast } from "@/lib/climate/forecast";
import { buildItinerary } from "@/lib/itinerary";
import { comparisonQueryString } from "@/lib/scoring/params";
import { scoreDestination } from "@/lib/scoring/engine";
import { formatDateRange, nightsBetween, daysUntil } from "@/lib/dates";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const trip = Number.isFinite(id) ? await getTrip(id) : null;
  if (!trip) notFound();

  const [candidates, links, preferences, stops, flightSearches, hotelSearches, events, flightBookings, hotelBookings, budgetItems, shares, owner, collaborators, invites] =
    await Promise.all([
      listCandidates(trip.id),
      listLinks(trip.id),
      getPreferences(trip.id),
      listStops(trip.id),
      listFlightSearches(trip.id),
      listHotelSearches(trip.id),
      listEvents(trip.id),
      listFlightBookings(trip.id),
      listHotelBookings(trip.id),
      listBudgetItems(trip.id),
      listSharesForTrip(trip.id),
      getUserById(trip.ownerId),
      listCollaborators(trip.id),
      listInvitesForTrip(trip.id),
    ]);
  
  const currentUser = await getCurrentUser();

  // Null when the trip has no dates — stops are laid out from the departure date, so
  // without them there is nothing to derive.
  const itinerary = buildItinerary(trip, stops);

  // Destinations this trip touches: its stops, plus any candidate still in play. Both are
  // places a saved recommendation could reasonably belong to.
  const tripDestinationIds = [
    ...new Set([
      ...stops.map((s) => s.destinationId),
      ...candidates.filter((c) => c.status !== "rejected").map((c) => c.destinationId),
    ]),
  ];

  const { attached: places, standing } = await listPlacesForTrip(trip.id, tripDestinationIds);
  const sources = await listSources(
    [...places, ...standing].map((p) => p.sourceId).filter((id): id is number => id !== null),
  );

  // The trip's own airports win over whatever the saved preferences hold — they are a
  // property of the trip, not of the comparison being run.
  const tripPreferences = { ...preferences, origins: trip.origins };

  const hasDates = Boolean(trip.startDate && trip.endDate);
  const nights = hasDates ? nightsBetween(trip.startDate!, trip.endDate!) : null;
  const selected = candidates.find((c) => c.status === "selected");
  const active = candidates.filter((c) => c.status !== "rejected");

  // Only scored once dates exist — a cost estimate without dates would be a guess
  // dressed up as a number.
  const selectedScore =
    selected && hasDates && getDestination(selected.destinationId)
      ? scoreDestination(
          getDestination(selected.destinationId)!,
          tripPreferences,
          trip.startDate!,
          trip.endDate!,
        )
      : null;

  /*
   * Forecast for the chosen destination, once the trip is inside the horizon.
   *
   * This is the one place the app fetches during a render, and it is deliberately narrow
   * (ADR 0012): one destination, only when a trip is within 16 days, only when a
   * destination has actually been chosen. A failure degrades to the normals with an
   * explanation rather than throwing the page away.
   */
  const forecastComparison = await (async () => {
    if (!selected || !trip.startDate || !trip.endDate) return null;
    const destination = getDestination(selected.destinationId);
    if (!destination) return null;
    try {
      const forecast = await fetchForecast(destination, trip.startDate, trip.endDate);
      return forecast ? compareForecastWithNormal(destination, forecast) : null;
    } catch {
      // Surfaced in the panel as "could not be retrieved" — never as a normal wearing a
      // forecast's label.
      return null;
    }
  })();

  const compareHref = `/trips/${trip.id}/compare?${comparisonQueryString({
    startDate: trip.startDate ?? "",
    endDate: trip.endDate ?? "",
    destinationIds: active.map((c) => c.destinationId),
    preferences: tripPreferences,
  })}`;

  return (
    <>
      <PageHeader
        title={trip.name}
        lede={trip.purpose || undefined}
        breadcrumb={{ href: "/trips", label: "Trips" }}
        actions={
          <>
            {hasDates && <ButtonLink href={compareHref}>Compare destinations</ButtonLink>}
            <ButtonLink href={`/trips/${trip.id}/edit`}>Edit</ButtonLink>
            <form action={duplicateTripAction}>
              <input type="hidden" name="tripId" value={trip.id} />
              <Button type="submit" variant="ghost">
                Duplicate
              </Button>
            </form>
          </>
        }
      />

      {trip.archived && (
        <div className="mb-5 rounded-md border border-line px-4 py-2.5 text-[13px] text-ink-2">
          This trip is archived.
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Dates"
          value={formatDateRange(trip.startDate, trip.endDate)}
          sub={
            nights !== null
              ? `${nights} nights · ${DATE_FLEXIBILITY_LABELS[trip.flexibility].toLowerCase()}`
              : DATE_FLEXIBILITY_LABELS[trip.flexibility]
          }
        />
        <StatTile
          label="Destination"
          value={selected ? (getDestination(selected.destinationId)?.name ?? "—") : "Not chosen"}
          sub={
            selected
              ? "decided"
              : `${active.length} candidate${active.length === 1 ? "" : "s"} in play`
          }
        />
        <StatTile
          label="Hotels, estimated"
          value={selectedScore ? money(selectedScore.estimatedLodgingUSD) : "—"}
          sub={
            selectedScore
              ? `${money(selectedScore.estimatedNightlyUSD)} a night, catalog estimate`
              : "needs a destination and dates"
          }
        />
        <StatTile
          label="Departs from"
          value={trip.origins.join(" · ")}
          sub={
            trip.startDate && daysUntil(trip.startDate) >= 0
              ? `in ${daysUntil(trip.startDate)} days`
              : "no departure date"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="min-w-0 space-y-6">
          <CandidatesCard trip={trip} candidates={candidates} hasDates={hasDates} compareHref={compareHref} />

          <ItineraryPanel
            tripId={trip.id}
            itinerary={itinerary}
            catalog={DESTINATIONS}
            selectedDestination={selected ? (getDestination(selected.destinationId) ?? null) : null}
            tripNights={nights ?? 0}
          />

          {selected && hasDates && getDestination(selected.destinationId) && (
            <ForecastPanel
              startDate={trip.startDate!}
              endDate={trip.endDate!}
              comparison={forecastComparison}
            />
          )}

          {flightSearches.length > 0 && <FlightSearchesPanel searches={flightSearches} tripId={trip.id} />}
          {hotelSearches.length > 0 && <HotelSearchesPanel searches={hotelSearches} tripId={trip.id} />}

          <EventsPanel events={events} tripId={trip.id} trip={trip} />

          <TripBudgetPanel
            flightBookings={flightBookings}
            hotelBookings={hotelBookings}
            budgetItems={budgetItems}
            stops={stops}
            estimatedNightlyUsd={selectedScore?.estimatedNightlyUSD}
            tripCurrency={trip.currency}
          />


          <FlightBookingsPanel tripId={trip.id} bookings={flightBookings} />

          <HotelBookingsPanel tripId={trip.id} bookings={hotelBookings} />
          {selected && hasDates && getDestination(selected.destinationId) && (
            <FlightSearchForm
              tripId={trip.id}
              tripOrigins={trip.origins}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
              tripTravellers={trip.travelers}
              destinationAirportCode={null}
            />
          )}

          {selected && hasDates && (
            <HotelSearchForm
              tripId={trip.id}
              destinationId={selected.destinationId}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
              tripTravellers={trip.travelers}
            />
          )}

          <SharingPanel shares={shares} tripId={trip.id} tripName={trip.name} owner={owner} currentUser={currentUser} collaborators={collaborators} invites={invites} />

          {flightSearches.length > 0 &&
            flightSearches[0].result.itineraries.length > 0 &&
            selected &&
            selectedScore && (
              <SearchComparisonPanel
                itinerary={flightSearches[0].result.itineraries[0]}
                estimate={selectedScore.route.route}
              />
            )}

          <PlacesPanel
            tripId={trip.id}
            places={places}
            standing={standing}
            itinerary={itinerary}
            destinationIds={tripDestinationIds.map((id) => ({
              id,
              name: getDestination(id)?.name ?? id,
            }))}
            tripStartDate={trip.startDate}
            sources={sources}
          />

          {selected && hasDates && getDestination(selected.destinationId) && (
            <PlaceSearchForm destinationId={selected.destinationId} tripId={trip.id} />
          )}

          {(trip.priorities || trip.notes) && (
            <Card>
              <CardHeader title="Your notes" note="Written by you. Nothing generated ever edits this." />
              <div className="space-y-4 px-4 py-4">
                {trip.priorities && (
                  <div>
                    <h3 className="mb-1 text-[12px] tracking-wide text-ink-3 uppercase">Priorities</h3>
                    <p className="text-[13.5px] whitespace-pre-wrap text-ink-2">{trip.priorities}</p>
                  </div>
                )}
                {trip.notes && (
                  <div>
                    <h3 className="mb-1 text-[12px] tracking-wide text-ink-3 uppercase">Notes</h3>
                    <p className="text-[13.5px] whitespace-pre-wrap text-ink-2">{trip.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <NotYetBuilt />
        </div>

        <div className="min-w-0 space-y-6">
          <NextActions trip={trip} candidates={candidates} hasDates={hasDates} compareHref={compareHref} />
          <StatusCard trip={trip} />
          <LinksCard trip={trip} links={links} />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function CandidatesCard({
  trip,
  candidates,
  hasDates,
  compareHref,
}: {
  trip: Trip;
  candidates: TripCandidate[];
  hasDates: boolean;
  compareHref: string;
}) {
  const order: CandidateStatus[] = ["selected", "shortlisted", "considering", "rejected"];
  const sorted = [...candidates].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  );
  const regions = destinationsByRegion();
  const alreadyAdded = new Set(candidates.map((c) => c.destinationId));

  return (
    <Card>
      <CardHeader
        title="Destinations in play"
        note="Shortlist, reject or choose. Rejections are kept so you can see what you already ruled out."
        right={hasDates ? <ButtonLink href={compareHref}>Compare these</ButtonLink> : undefined}
      />

      <div className="px-4 py-4">
        {sorted.length === 0 ? (
          <Empty
            title="No destinations yet"
            body="Add the places you are weighing up. You can also rank the whole catalog first and add the ones that come out well."
            action={<ButtonLink href="/compare">Rank the whole catalog</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {sorted.map((c) => {
              const d = getDestination(c.destinationId);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/destinations/${c.destinationId}`}
                      className={`text-[14px] font-medium hover:text-accent ${
                        c.status === "rejected" ? "text-ink-3 line-through" : ""
                      }`}
                    >
                      {d?.name ?? c.destinationId}
                    </Link>
                    {d && <span className="ml-2 text-[12.5px] text-ink-3">{d.area}</span>}
                    {c.note && <p className="mt-0.5 text-[12.5px] text-ink-3">{c.note}</p>}
                  </div>

                  <Badge
                    tone={
                      c.status === "selected"
                        ? "good"
                        : c.status === "shortlisted"
                          ? "accent"
                          : c.status === "rejected"
                            ? "neutral"
                            : "neutral"
                    }
                  >
                    {CANDIDATE_STATUS_LABELS[c.status]}
                  </Badge>

                  <div className="flex gap-1">
                    {(["shortlisted", "selected", "rejected"] as const)
                      .filter((s) => s !== c.status)
                      .map((s) => (
                        <form key={s} action={setCandidateStatusAction}>
                          <input type="hidden" name="tripId" value={trip.id} />
                          <input type="hidden" name="destinationId" value={c.destinationId} />
                          <input type="hidden" name="status" value={s} />
                          <Button type="submit" variant="ghost" className="px-2 py-1 text-[12px]">
                            {s === "shortlisted" ? "Shortlist" : s === "selected" ? "Choose" : "Reject"}
                          </Button>
                        </form>
                      ))}
                    <form action={removeCandidateAction}>
                      <input type="hidden" name="tripId" value={trip.id} />
                      <input type="hidden" name="destinationId" value={c.destinationId} />
                      <Button type="submit" variant="ghost" className="px-2 py-1 text-[12px]" aria-label="Remove">
                        ×
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form action={addCandidateAction} className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <input type="hidden" name="tripId" value={trip.id} />
          <select name="destinationId" className="max-w-xs flex-1" defaultValue="" required>
            <option value="" disabled>
              Add a destination…
            </option>
            {regions.map((group) => (
              <optgroup key={group.region} label={group.region}>
                {group.items
                  .filter((d) => !alreadyAdded.has(d.id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.area}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <Button type="submit">Add</Button>
        </form>
      </div>
    </Card>
  );
}

function NextActions({
  trip,
  candidates,
  hasDates,
  compareHref,
}: {
  trip: Trip;
  candidates: TripCandidate[];
  hasDates: boolean;
  compareHref: string;
}) {
  const active = candidates.filter((c) => c.status !== "rejected");
  const selected = candidates.find((c) => c.status === "selected");

  const actions: { label: string; href?: string; done: boolean }[] = [
    { label: "Set the travel dates", href: `/trips/${trip.id}/edit`, done: hasDates },
    { label: "Add destinations to weigh up", done: active.length > 0 },
    {
      label: "Run the comparison",
      href: hasDates ? compareHref : undefined,
      done: trip.status !== "idea" && trip.status !== "comparing" ? true : Boolean(selected),
    },
    { label: "Choose a destination", done: Boolean(selected) },
  ];

  const next = actions.find((a) => !a.done);

  return (
    <Card>
      <CardHeader title="Next actions" />
      <ul className="space-y-2 px-4 py-4">
        {actions.map((a) => (
          <li key={a.label} className="flex items-start gap-2.5 text-[13.5px]">
            <span
              aria-hidden
              className="mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border text-[9px]"
              style={{
                borderColor: a.done ? "var(--good)" : "var(--border-strong)",
                background: a.done ? "var(--good)" : "transparent",
                color: "#fff",
              }}
            >
              {a.done ? "✓" : ""}
            </span>
            <span className={a.done ? "text-ink-3 line-through" : a === next ? "font-medium" : "text-ink-2"}>
              {a.href && !a.done ? (
                <Link href={a.href} className="hover:text-accent">
                  {a.label}
                </Link>
              ) : (
                a.label
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
        Flights, hotels and itinerary come in later releases.
      </p>
    </Card>
  );
}

function StatusCard({ trip }: { trip: Trip }) {
  return (
    <Card>
      <CardHeader title="Planning status" right={<StatusBadge status={trip.status} />} />
      <form action={setTripStatusAction} className="flex gap-2 px-4 py-4">
        <input type="hidden" name="tripId" value={trip.id} />
        <select name="status" defaultValue={trip.status} className="flex-1">
          {PLANNING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PLANNING_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit">Update</Button>
      </form>
    </Card>
  );
}

function LinksCard({ trip, links }: { trip: Trip; links: { id: number; label: string; url: string }[] }) {
  return (
    <Card>
      <CardHeader title="Links" note="Anything worth keeping — a hotel page, an article, a booking." />
      <div className="px-4 py-4">
        {links.length === 0 ? (
          <p className="text-[13px] text-ink-3">No links yet.</p>
        ) : (
          <ul className="mb-3 space-y-1.5">
            {links.map((l) => (
              <li key={l.id} className="flex items-center gap-2">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="min-w-0 flex-1 truncate text-[13.5px] text-accent hover:underline"
                >
                  {l.label}
                </a>
                <form action={removeLinkAction}>
                  <input type="hidden" name="tripId" value={trip.id} />
                  <input type="hidden" name="linkId" value={l.id} />
                  <Button type="submit" variant="ghost" className="px-1.5 py-0.5 text-[12px]" aria-label="Remove link">
                    ×
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addLinkAction} className="space-y-2 border-t border-line pt-3">
          <input type="hidden" name="tripId" value={trip.id} />
          <input type="text" name="label" placeholder="Label" required maxLength={200} />
          <input type="url" name="url" placeholder="https://…" required />
          <Button type="submit">Add link</Button>
        </form>
      </div>
    </Card>
  );
}

/**
 * Honest placeholders. Phase 0 asks for the shell of the whole product; showing these as
 * empty sections with a release note is more useful than pretending the trip record is
 * complete, and stops "no flights listed" reading as "no flights booked".
 */
function NotYetBuilt() {
  const sections = [
    { title: "Flights and hotels", note: "Options, bookings, upgrade status and card benefits.", release: "Release 5" },
    { title: "Budget", note: "Estimated against booked, refundable exposure and payment deadlines.", release: "Release 6" },
  ];

  return (
    <Card>
      <CardHeader title="Not built yet" note="These attach to the trip in later releases." />
      <ul className="divide-y divide-line">
        {sections.map((s) => (
          <li key={s.title} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
            <div>
              <div className="text-[13.5px] font-medium text-ink-2">{s.title}</div>
              <div className="text-[12.5px] text-ink-3">{s.note}</div>
            </div>
            <Badge>{s.release}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
