import { DESTINATIONS } from "@/data/destinations";
import { climateFor } from "@/lib/climate";
import { HOLIDAY_SOURCE } from "@/lib/holidays";
import { Badge, Card, CardHeader, PageHeader, TierMark } from "@/components/ui";
import manifest from "@/data/generated/manifest.json";
import holidays from "@/data/generated/holidays.json";

export const metadata = { title: "Data & sources · Travel Intelligence Hub" };

/**
 * Provenance page.
 *
 * The product principle is that time-sensitive facts carry a source and a verification
 * date, and that measurements, judgements and your own opinions never blur together.
 * That principle is only real if it is inspectable, which is what this page is for.
 */
export default function SourcesPage() {
  const sample = climateFor(DESTINATIONS[0].id);
  const unsupported = (holidays as { unsupportedCountries: string[] }).unsupportedCountries;

  return (
    <>
      <PageHeader
        title="Data & sources"
        lede="What every number in this app rests on, where it came from, and when it was last checked."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Three tiers, kept separate" />
          <div className="divide-y divide-line">
            {[
              {
                tier: "objective" as const,
                title: "Measured",
                body: "Fetched from a named external source with a date. Regenerated wholesale by `npm run build:data` and never edited by hand. Climate normals, sea temperatures and public holidays.",
              },
              {
                tier: "curated" as const,
                title: "Curated",
                body: "Editorial judgement shipped with the app — seasonal ratings, hotel cost bands, how easy a place is to travel in, how long the flight really takes. Each destination carries the date it was last reviewed. Defensible, but not measured.",
              },
              {
                tier: "personal" as const,
                title: "Yours",
                body: "Trips, notes, shortlists, rejections and the weights you set. Stored separately in the database. A data refresh cannot touch it, and nothing generated ever overwrites it.",
              },
            ].map((row) => (
              <div key={row.title} className="flex flex-wrap gap-3 px-4 py-3.5">
                <div className="w-24 shrink-0">
                  <TierMark tier={row.tier} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13.5px] font-medium">{row.title}</h3>
                  <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-2">{row.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Live sources" note={`Reference data last generated ${manifest.generatedOn}.`} />
          <div className="scroll-x">
            <table className="w-full min-w-[680px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-2.5 font-medium text-ink-3">Source</th>
                  <th className="px-4 py-2.5 font-medium text-ink-3">Provides</th>
                  <th className="px-4 py-2.5 font-medium text-ink-3">Period</th>
                  <th className="px-4 py-2.5 font-medium text-ink-3">Fetched</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line">
                  <td className="px-4 py-3">
                    <a
                      href={sample.source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent hover:underline"
                    >
                      Open-Meteo ERA5 archive
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    Daily high, low, rainfall, humidity and sunshine for all {manifest.destinations}{" "}
                    destinations plus a home-city baseline
                  </td>
                  <td className="tnum px-4 py-3 text-ink-2">{manifest.climatePeriod}</td>
                  <td className="tnum px-4 py-3 text-ink-2">{sample.source.verifiedOn}</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="px-4 py-3">
                    <a
                      href="https://open-meteo.com/en/docs/marine-weather-api"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent hover:underline"
                    >
                      Open-Meteo marine archive
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    Sea surface temperature for the {manifest.coastalDestinations} coastal destinations
                  </td>
                  <td className="tnum px-4 py-3 text-ink-2">{manifest.climatePeriod}</td>
                  <td className="tnum px-4 py-3 text-ink-2">{sample.source.verifiedOn}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <a
                      href={HOLIDAY_SOURCE.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent hover:underline"
                    >
                      Nager.Date
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-2">National public holidays</td>
                  <td className="tnum px-4 py-3 text-ink-2">2026–2028</td>
                  <td className="tnum px-4 py-3 text-ink-2">{HOLIDAY_SOURCE.verifiedOn}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Known gaps" note="Stated rather than papered over." />
          <ul className="divide-y divide-line text-[13px]">
            <li className="px-4 py-3">
              <span className="font-medium">No holiday data for {unsupported.join(", ")}.</span>{" "}
              <span className="text-ink-2">
                Nager.Date does not cover them. Destinations in those countries show the gap explicitly rather
                than rendering as “no holidays”, and their comparison confidence is reduced.
              </span>
            </li>
            <li className="px-4 py-3">
              <span className="font-medium">Holiday coverage is national and thin in places.</span>{" "}
              <span className="text-ink-2">
                Nager.Date lists only four public holidays a year for Vietnam and does not include Tết, which
                is the single most disruptive week in the Vietnamese calendar. Lunar and regional holidays are
                generally missing. The curated month notes carry these where they matter, but do not treat an
                empty holiday list as a quiet week.
              </span>
            </li>
            <li className="px-4 py-3">
              <span className="font-medium">Reanalysis is coarse over small islands.</span>{" "}
              <span className="text-ink-2">
                ERA5 works on a grid of roughly 30 km. For a small island the nearest cell is largely ocean,
                which tends to overstate drizzle days. Where the measured rainfall and the curated seasonal
                rating disagree, both are shown — the disagreement is information.
              </span>
            </li>
            <li className="px-4 py-3">
              <span className="font-medium">Hotel costs are estimates, not quotes.</span>{" "}
              <span className="text-ink-2">
                Curated nightly bands scaled by a seasonal multiplier. Good enough to compare destinations
                against each other, not good enough to budget from.
              </span>
            </li>
            <li className="px-4 py-3">
              <span className="font-medium">Flight times are typical, not searched.</span>{" "}
              <span className="text-ink-2">
                Curated journey lengths and connection counts. No live availability or pricing — that arrives
                with the flight-search integration in a later release.
              </span>
            </li>
            <li className="px-4 py-3">
              <span className="font-medium">Normals are not forecasts.</span>{" "}
              <span className="text-ink-2">
                Everything date-specific describes what a decade of history says about those calendar days.
                Forecasts only become meaningful about two weeks out and are deliberately not shown.
              </span>
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader title="Planned integrations" note="Keyed services, wired up as later phases need them." />
          <div className="scroll-x">
            <table className="w-full min-w-[620px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-2.5 font-medium text-ink-3">Capability</th>
                  <th className="px-4 py-2.5 font-medium text-ink-3">Intended provider</th>
                  <th className="px-4 py-2.5 font-medium text-ink-3">Needed for</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Maps and place details", "Google Maps Platform", "Release 3 — places and dossiers"],
                  ["Destination places", "Google Places → Foursquare", "Release 3"],
                  ["Attractions and tours", "Amadeus Activities → Viator", "Release 4"],
                  ["Events", "Ticketmaster Discovery → PredictHQ", "Release 4"],
                  ["Ground routes", "Google Routes", "Release 2 — transfer burden"],
                  ["Flight search", "Amadeus Self-Service → Duffel", "Release 5"],
                  ["Flight status", "AeroDataBox → FlightAware", "Release 5"],
                  ["Hotels", "Amadeus Hotels → Expedia Rapid", "Release 5"],
                  ["Current forecasts", "Open-Meteo", "Release 5 — near-departure only"],
                  ["Currency conversion", "Frankfurter", "Release 6 — budgets"],
                  ["Entry requirements", "Official sources → Sherpa", "Release 5"],
                ].map(([capability, provider, need]) => (
                  <tr key={capability} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-medium">{capability}</td>
                    <td className="px-4 py-2.5 text-ink-2">{provider}</td>
                    <td className="px-4 py-2.5">
                      <Badge>{need}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-3 text-[12.5px] text-ink-3">
            None of these are called today. Every source currently in use is free and keyless, so the app has
            no secrets to manage and no per-request cost.
          </p>
        </Card>
      </div>
    </>
  );
}
