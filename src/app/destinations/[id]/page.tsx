import { notFound } from "next/navigation";
import { getDestination } from "@/data/destinations";
import {
  climateFor,
  compareWithHome,
  dateWindowClimate,
  interpretConditions,
} from "@/lib/climate";
import { holidaysDuring, HOLIDAY_SOURCE, holidayDataAvailable } from "@/lib/holidays";
import { listPlacesForDestination, listSources } from "@/lib/db/places";
import { getEventsByCity } from "@/lib/integrations/ticketmaster";
import { getRestaurantCategories } from "@/lib/integrations/yelp";
import { getDemographics } from "@/lib/integrations/demographics";
import { getTravelAdvisory } from "@/lib/integrations/travel-warnings";
import { getFlightEstimate } from "@/lib/integrations/flight-links";
import { getWeatherAlerts } from "@/lib/integrations/weather-alerts";
import { HOME } from "@/data/home";
import { DestinationPlaces } from "@/components/DestinationPlaces";
import { EventsGrid } from "@/components/EventCard";
import { RestaurantCategories } from "@/components/RestaurantCard";
import { DemographicsPanel } from "@/components/DemographicsPanel";
import { TravelAdvisoryCard } from "@/components/TravelAdvisoryCard";
import { FlightCard } from "@/components/FlightCard";
import { WeatherAlerts } from "@/components/WeatherAlerts";
import { DailyComfortChart, HomeDeltaChart, MonthlyClimateChart, SuitabilityStrip } from "@/components/charts";
import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  PageHeader,
  ScoreBar,
  StatTile,
  money,
  Provenance,
} from "@/components/ui";
import { MONTH_NAMES, addDays, formatDate, isValidDate, monthsInRange } from "@/lib/dates";
import { defaultDates } from "@/lib/scoring/params";
import { pathsUnder, sectionStatus } from "@/lib/domain/contract";

// Reads saved places from the database, so it must never be prerendered — a statically
// generated page would bake in whichever places existed at build time. This is why there
// is no generateStaticParams here despite the catalog being a fixed, known set.
export const dynamic = "force-dynamic";

export default async function DestinationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const d = getDestination((await params).id);
  if (!d) notFound();

  const sp = await searchParams;
  const fallback = defaultDates();
  const startDate = sp.start && isValidDate(sp.start) ? sp.start : fallback.startDate;
  const endDate =
    sp.end && isValidDate(sp.end) && sp.end > startDate ? sp.end : addDays(startDate, 7);

  const record = climateFor(d.id);
  const window = dateWindowClimate(d, startDate, endDate);
  const reading = interpretConditions(d, window);
  const home = compareWithHome(d, startDate, endDate);
  const tripMonths = monthsInRange(startDate, endDate);
  const { holidays, unavailable } = holidaysDuring(d, startDate, endDate);
  const risks = d.risks.filter((r) => r.months.some((m) => tripMonths.includes(m)));

  const places = await listPlacesForDestination(d.id);
  const placeSources = await listSources(
    places.map((p) => p.sourceId).filter((id): id is number => id !== null),
  );

  // Fetch events, restaurants, demographics, travel advisory, flights, and weather.
  //
  // These catches log rather than swallow. `.catch(() => [])` made a Yelp or Ticketmaster
  // failure indistinguishable from a genuine empty result: the section simply vanished,
  // and nobody could tell whether a city had no notable restaurants or whether the
  // lookup had thrown. An empty array is still the render fallback — neither of these is
  // worth failing a page over — but the failure is no longer invisible.
  const events = await getEventsByCity(d.name, 6).catch((error) => {
    console.error(`[Destination ${d.id}] events lookup failed:`, error);
    return [];
  });
  const restaurants = await getRestaurantCategories(d.name).catch((error) => {
    console.error(`[Destination ${d.id}] restaurant lookup failed:`, error);
    return {};
  });
  const demographics = getDemographics(d.name);
  // Advisories are country-scoped. Keying this by city name is why only ten
  // destinations ever resolved one.
  const travelAdvisory = await getTravelAdvisory(d.country);
  // One clock for every provenance mark on the page, read here rather than in render.
  const asOf = new Date().toISOString().slice(0, 10);

  // Get flight estimates (no API needed, just links + estimates)
  const flightEstimate = getFlightEstimate(d.id);

  // Fetch weather for the trip dates
  const weather = await getWeatherAlerts(d.name, d.lat, d.lon).catch(() => null);

  return (
    <>
      <PageHeader
        title={d.name}
        lede={d.summary}
        breadcrumb={{ href: "/destinations", label: "Destination catalog" }}
        actions={
          <ButtonLink href={`/compare?dest=${d.id}&start=${startDate}&end=${endDate}`} variant="primary">
            Compare with others
          </ButtonLink>
        }
      />

      <div className="mb-6 flex flex-wrap gap-1.5">
        <Badge>{d.archetype}</Badge>
        <Badge>{d.country}</Badge>
        <Badge tone={d.tourismTier === 1 ? "accent" : "neutral"}>Tier {d.tourismTier} destination</Badge>
        {d.travel.nonstop && <Badge tone="accent">nonstop from JFK</Badge>}
        {d.coastal && <Badge>coastal</Badge>}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`${formatDate(startDate, { year: false })}–${formatDate(endDate, { year: false })}`}
          value={`${window.avgHighF}° / ${window.avgLowF}°F`}
          sub={`${Math.round(window.avgHumidityPct)}% humidity`}
        />
        <StatTile
          label="Wet days expected"
          value={`${window.expectedRainDays} of ${window.days}`}
          sub={`${window.totalPrecipIn}in of rain`}
        />
        <StatTile
          label="Daylight"
          value={`${window.avgDaylightHours}h`}
          sub={`${window.sunriseFirstDay} to ${window.sunsetFirstDay}`}
        />
        <StatTile
          label={d.coastal ? "Sea temperature" : "Hotels, 5★"
          }
          value={d.coastal && window.sstF != null ? `${window.sstF}°F` : money(d.lodging.fiveStarUSD)}
          sub={d.coastal && window.sstF != null ? "monthly mean of daily maximum" : "shoulder-season estimate"}
        />
      </div>

      {/* min-w-0 on both tracks: without it a grid item is sized by its min-content, and
          the wide tables inside push the column past the page. */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div className="min-w-0 space-y-6">
          <TravelAdvisoryCard result={travelAdvisory} />

          {flightEstimate && (
            <FlightCard
              estimate={flightEstimate}
              destination={d.name}
              iataCode={d.id}
              departDate={startDate}
              returnDate={endDate}
            />
          )}

          {weather && <WeatherAlerts weather={weather} />}

          <Card>
            <CardHeader
              title="Climate through the year"
              right={<Provenance status="sourced" source="Open-Meteo ERA5" sourceDate={record.source.verifiedOn} asOf={asOf} />}
              note={`${record.source.note}. Highlighted months are the ones your dates fall in.`}
            />
            <div className="px-4 py-4">
              <MonthlyClimateChart monthly={record.monthly} highlightMonths={tripMonths} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Day by day, for these dates"
              right={<Provenance status="sourced" source="Open-Meteo ERA5" sourceDate={record.source.verifiedOn} asOf={asOf} />}
              note="Normals for the exact calendar days — not a forecast."
            />
            <div className="px-4 py-4">
              <DailyComfortChart destination={d} startDate={startDate} endDate={endDate} />

              <form method="get" className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
                <label className="text-[12.5px]">
                  <span className="mb-1 block text-ink-2">From</span>
                  <input type="date" name="start" defaultValue={startDate} />
                </label>
                <label className="text-[12.5px]">
                  <span className="mb-1 block text-ink-2">To</span>
                  <input type="date" name="end" defaultValue={endDate} />
                </label>
                <button
                  type="submit"
                  className="rounded-md border border-line-strong bg-surface-2 px-3 py-1.5 text-[13px] font-medium"
                >
                  Update dates
                </button>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="What that actually means"
              right={<Provenance status="derived" note="from climate normals" />}
              note="Interpretation of the measured values above, not a measurement itself."
            />
            <dl className="divide-y divide-line">
              {[
                ["Sightseeing", reading.sightseeing],
                ["Beach", reading.beach],
                ["Outdoor dining", reading.outdoorDining],
                ["Daylight", reading.daylight],
              ].map(([label, text]) => (
                <div key={label} className="px-4 py-3">
                  <dt className="text-[12px] tracking-wide text-ink-3 uppercase">{label}</dt>
                  <dd className="mt-0.5 text-[13.5px] text-ink-2">{text}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title={`Compared with ${HOME.name}`} note="Over the same dates." />
            <div className="px-4 py-4">
              <HomeDeltaChart
                rows={[
                  {
                    label: "Daytime high",
                    delta: home.highDeltaF,
                    unit: "°F",
                    thereValue: `${window.avgHighF}°F`,
                    homeValue: `${home.homeHighF}°F`,
                  },
                  {
                    label: "Daylight",
                    delta: home.daylightDeltaHours,
                    unit: "h",
                    thereValue: `${window.avgDaylightHours}h`,
                    homeValue: `${home.homeDaylightHours}h`,
                  },
                  {
                    label: "Wet days",
                    delta: home.rainDeltaDays,
                    unit: " days",
                    thereValue: `${window.expectedRainDays}`,
                    homeValue: `${home.homeRainDays}`,
                  },
                ]}
              />
            </div>
          </Card>
          <DestinationPlaces
            places={places}
            sources={placeSources}
            destinationName={d.name}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Season by season"
              note="Curated rating out of 5, with peak/shoulder/low."
              right={<Provenance status="unverified" note="suitability and season labels are hand-entered" />}
            />
            <div className="px-4 py-4">
              <SuitabilityStrip destination={d} highlightMonths={tripMonths} />

              <ul className="mt-4 space-y-2">
                {Object.entries(d.monthNotes).map(([month, note]) => (
                  <li key={month} className="text-[13px]">
                    <span
                      className={`font-medium ${
                        tripMonths.includes(Number(month)) ? "text-accent" : "text-ink"
                      }`}
                    >
                      {MONTH_NAMES[Number(month) - 1]}
                    </span>
                    <span className="text-ink-2"> — {note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {risks.length > 0 && (
            <Card>
              <CardHeader
                title="Risks on these dates"
                right={<Provenance status="unverified" note="hand-written; not derived from climate or advisories" />}
              />
              <ul className="divide-y divide-line">
                {risks.map((r) => (
                  <li key={r.label} className="flex items-start gap-2.5 px-4 py-2.5">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background:
                          r.severity === "high"
                            ? "var(--critical)"
                            : r.severity === "moderate"
                              ? "var(--warning)"
                              : "var(--border-strong)",
                      }}
                    />
                    <div>
                      <div className="text-[13px]">{r.label}</div>
                      <div className="text-[11.5px] text-ink-3">{r.severity} severity</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {demographics && <DemographicsPanel demographics={demographics} />}

          <Card>
            <CardHeader
              title="Public holidays during your dates"
              right={<Provenance status="sourced" source="Nager.Date" sourceDate={HOLIDAY_SOURCE.verifiedOn} asOf={asOf} />}
            />
            <div className="px-4 py-3.5 text-[13px]">
              {unavailable ? (
                <p className="text-ink-2">
                  No holiday data is available for {d.country}. This is a gap in the source, not a statement
                  that there are none — check locally before assuming shops and offices are open.
                </p>
              ) : holidays.length === 0 ? (
                <p className="text-ink-3">No national public holidays fall in this window.</p>
              ) : (
                <ul className="space-y-1">
                  {holidays.map((h) => (
                    <li key={`${h.date}-${h.name}`} className="flex justify-between gap-3">
                      <span>{h.name}</span>
                      <span className="tnum shrink-0 text-ink-3">{formatDate(h.date, { year: false })}</span>
                    </li>
                  ))}
                </ul>
              )}
              {holidayDataAvailable(d) && (
                <p className="mt-2 text-[11.5px] text-ink-3">
                  {HOLIDAY_SOURCE.source}, published {HOLIDAY_SOURCE.verifiedOn}.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Profile"
              note={`Curated ${d.curatedOn}.`}
              right={<Provenance status="unverified" note="archetype, tier and summary are editorial" />}
            />
            <div className="space-y-4 px-4 py-4">
              <RatingGroup
                title="Experience"
                right={
                  <Provenance
                    status={sectionStatus(pathsUnder("experience")) === "editorial" ? "unverified" : "sourced"}
                    note={`${pathsUnder("experience").length} scores, per the data contract`}
                  />
                }
                ratings={[
                  ["Food", d.experience.food],
                  ["Culture", d.experience.culture],
                  ["Beaches", d.experience.beaches],
                  ["Nightlife", d.experience.nightlife],
                  ["Day trips", d.experience.dayTrips],
                  ["Nature", d.experience.nature],
                  ["Shopping", d.experience.shopping],
                ]}
              />
              <RatingGroup
                title="Practicality"
                right={
                  <Provenance
                    status={sectionStatus(pathsUnder("practicality")) === "editorial" ? "unverified" : "sourced"}
                    note={`${pathsUnder("practicality").length} scores, per the data contract`}
                  />
                }
                ratings={[
                  ["Getting around", d.practicality.localTransport],
                  ["Language", d.practicality.languageEase],
                  ["Safety & health", d.practicality.safetyEase],
                  ["Entry & visas", d.practicality.entryEase],
                  ["Trip simplicity", d.practicality.tripSimplicity],
                ]}
              />
              <div>
                <h3 className="mb-1.5 text-[12px] tracking-wide text-ink-3 uppercase">Getting there</h3>
                <p className="text-[13px] text-ink-2">{d.travel.notes}</p>
                <p className="tnum mt-1 text-[13px] text-ink-3">
                  ~{d.travel.typicalTotalHours}h ·{" "}
                  {d.travel.nonstop
                    ? "nonstop"
                    : `${d.travel.typicalConnections} connection${d.travel.typicalConnections === 1 ? "" : "s"}`}
                </p>
              </div>
              <div>
                <h3 className="mb-1.5 text-[12px] tracking-wide text-ink-3 uppercase">
                  Typical nightly rates
                </h3>
                <p className="tnum text-[13px] text-ink-2">
                  Four-star {money(d.lodging.fourStarUSD)} · Five-star {money(d.lodging.fiveStarUSD)}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  ×{d.lodging.peakMultiplier} in peak months, ×{d.lodging.lowMultiplier} in low. Planning
                  estimates, not quotes.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Events & Restaurants Section */}
      <div className="mt-12 space-y-12">
        {events.length > 0 && <EventsGrid events={events} />}
        {Object.values(restaurants).some((r) => Array.isArray(r) && r.length > 0) && (
          <RestaurantCategories categories={restaurants} />
        )}
      </div>
    </>
  );
}

function RatingGroup({
  title,
  ratings,
  right,
}: {
  title: string;
  ratings: [string, number][];
  /** Provenance mark, so a group of hand-entered scores can say so. */
  right?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-[12px] tracking-wide text-ink-3 uppercase">{title}</h3>
        {right}
      </div>
      <ul className="space-y-1">
        {ratings.map(([label, value]) => (
          <li key={label} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-ink-2">{label}</span>
            <span className="flex items-center gap-2">
              <ScoreBar score={(value / 5) * 100} label={label} width={60} showValue={false} />
              <span className="tnum w-8 text-right text-[12.5px]">{value}/5</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
