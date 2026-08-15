/**
 * Generate the route table from published airport destination tables.
 *
 * Closes the gap that made 26 of 46 destinations score travel from hand-written figures:
 * they had no route entry, so `selectRoute` fell back to a synthetic JFK-only option.
 *
 * Why this source. Kiwi's Tequila API went invitation-only and Amadeus decommissioned its
 * self-service portal in July 2026, so there is no flight API left to sign up for. The
 * airport articles publish exactly what the route table needs — which destinations each
 * New York airport reaches nonstop, and which of those are seasonal — and they do it in
 * three requests that cover the whole catalog however large it grows. Per-destination
 * querying scales linearly; this does not.
 *
 * Matching is deliberately targeted rather than bulk. Joining every link in the section
 * against an airport dataset resolved only 137 of 342; looking up our own 46 airports by
 * several name forms each agrees with all 20 curated entries, 40 of 40 across both
 * origins. The same lesson as the advisory country aliases: match a small known set
 * precisely instead of a large unknown one loosely.
 *
 *   npm run build:routes
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { DESTINATIONS } from "../src/data/destinations";
// The hand-written specs, not ROUTES — which now reads the file this script writes, so
// comparing against it would diff each run against its own previous output.
import { CURATED_SPECS } from "../src/data/routes";
import type { Origin } from "../src/lib/domain/types";

const ORIGINS: Origin[] = ["JFK", "EWR", "LGA"];

const ARTICLES: Record<Origin, string> = {
  JFK: "John F. Kennedy International Airport",
  EWR: "Newark Liberty International Airport",
  LGA: "LaGuardia Airport",
};

const AIRPORTS_CSV = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const USER_AGENT = "Wanderless/1.0 (route table build)";
const OUT = path.join(process.cwd(), "src/data/generated/routes.json");

interface Airport {
  iata: string;
  name: string;
  municipality: string;
  country: string;
  lat: number;
  lon: number;
}

function parseCsv(text: string): Airport[] {
  const lines = text.split("\n");
  const head = lines[0].split(",").map((h) => h.replace(/"/g, ""));
  const out: Airport[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    const row: Record<string, string> = {};
    head.forEach((h, i) => (row[h] = cells[i] ?? ""));
    if (!row.iata_code.trim()) continue;
    out.push({
      iata: row.iata_code,
      name: row.name,
      municipality: row.municipality,
      country: row.iso_country,
      lat: Number(row.latitude_deg),
      lon: Number(row.longitude_deg),
    });
  }
  return out;
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

async function destinationSection(article: string): Promise<string> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=parse&page=" +
    encodeURIComponent(article) +
    "&prop=wikitext&format=json";
  const wikitext = (JSON.parse(await get(url)) as { parse: { wikitext: { "*": string } } })
    .parse.wikitext["*"];
  const m = /==\s*Airlines and destinations\s*==([\s\S]*?)(?=\n==[^=])/.exec(wikitext);
  if (!m) throw new Error(`${article}: no "Airlines and destinations" section`);
  return m[1];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const SEASONAL_MARKER = "'''Seasonal:'''";

/** Words that identify no airport in particular. */
const GENERIC = new Set([
  "airport",
  "international",
  "regional",
  "municipal",
  "field",
  "airfield",
  "intl",
]);

/** Distinctive words in a name, lowercased and unaccented. */
function tokens(name: string): Set<string> {
  return new Set(
    norm(name)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !GENERIC.has(w)),
  );
}

/**
 * Every place a chunk of table links to, taking both halves of a piped link.
 *
 * Both forms occur — [[Athens International Airport|Athens]] and a bare
 * [[Rome–Fiumicino]] — and either may be the one that names our airport.
 */
function linkedPlaces(chunk: string): string[] {
  return [...chunk.matchAll(/\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/g)].flatMap((m) =>
    [m[1], m[2]].filter((x): x is string => Boolean(x)),
  );
}

/**
 * Does this link refer to our airport?
 *
 * Two distinctive words must be shared, and that threshold is load-bearing in both
 * directions.
 *
 * Matching a single word produced transatlantic nonstops from LaGuardia: "London" hit
 * London, Ontario and "Naples" hit Naples, Florida, both of which it genuinely serves.
 * Matching the last distinctive word instead was no better — OurAirports calls Fiumicino
 * "Rome–Fiumicino Leonardo da Vinci", whose last word is "Vinci", while Wikipedia calls
 * it "Rome–Fiumicino", so Rome silently lost every nonstop it has.
 *
 * Two words survives both. "Rome–Fiumicino" shares Rome and Fiumicino with the full name;
 * "London International Airport" shares only London with Heathrow, because International
 * and Airport identify nothing.
 */
function refersTo(
  link: string,
  airportTokens: Set<string>,
  ambiguous: Set<string>,
): boolean {
  const t = tokens(link);
  if (t.size === 0) return false;

  let shared = 0;
  for (const w of t) if (airportTokens.has(w)) shared++;
  if (shared === 0) return false;
  if (shared >= 2) return true;

  /*
   * One word in common is enough only when the link says nothing our airport does not.
   *
   * The two sources name airports differently — OurAirports gives the full official name,
   * "Dubrovnik Ruđer Bošković Airport" or "Lisbon Humberto Delgado Airport", where the
   * tables say simply "Dubrovnik Airport" or "Lisbon". Demanding two words in common lost
   * every one of those, which is a false negative that quietly deletes real nonstops.
   *
   * Accepting a subset instead recovers them, but would also accept "London International
   * Airport" for Heathrow, since London is all it contributes. So a word shared by
   * airports in more than one country cannot carry a match alone — for those, two words
   * are still required. That set is computed from the airport data rather than listed by
   * hand, so a new collision is handled without anyone noticing it first.
   */
  const linkTokens = [...t];
  const subset = linkTokens.every((w) => airportTokens.has(w));
  const anyAmbiguous = linkTokens.some((w) => ambiguous.has(w));
  return subset && !anyAmbiguous;
}

/**
 * Words that name a city in more than one country, and so cannot identify an airport
 * on their own. "London" is the obvious one; LaGuardia genuinely flies to London, Ontario.
 */
function ambiguousTokens(airports: Airport[]): Set<string> {
  const countries = new Map<string, Set<string>>();
  for (const a of airports) {
    if (!a.municipality) continue;
    for (const w of tokens(a.municipality)) {
      if (!countries.has(w)) countries.set(w, new Set());
      countries.get(w)!.add(a.country);
    }
  }
  return new Set([...countries].filter(([, c]) => c.size > 1).map(([w]) => w));
}

/** Does `origin` reach this airport nonstop, and only seasonally? */
function serviceFrom(section: string, airportName: string, ambiguous: Set<string>) {
  const want = tokens(airportName);
  let yearRound = false;
  let seasonal = false;

  for (const cell of section.split("\n|")) {
    const parts = cell.split(SEASONAL_MARKER);
    if (linkedPlaces(parts[0]).some((l) => refersTo(l, want, ambiguous))) yearRound = true;
    if (parts.length > 1 && linkedPlaces(parts.slice(1).join(" ")).some((l) => refersTo(l, want, ambiguous))) {
      seasonal = true;
    }
  }
  return { nonstop: yearRound || seasonal, seasonal: seasonal && !yearRound };
}

const km = (a: [number, number], b: [number, number]) => {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * Journey length, rounded to the half hour.
 *
 * Only the band this lands in is claimed as accurate — that agreed with all 20 curated
 * entries across both origins. The figure exists because the schema still carries one.
 */
function hours(
  from: Airport,
  to: Airport,
  nonstop: boolean,
  connections: number,
  origin: Origin,
) {
  const air = km([from.lat, from.lon], [to.lat, to.lon]) / 840 + 0.6;
  let total = nonstop ? air : air + 2.65 * Math.max(1, connections);
  // LaGuardia's perimeter rule means every long-haul routes through another hub, so the
  // journey is strictly longer than the same connection from JFK — never merely equal.
  // Great-circle distance alone cannot see this, since the three airports are minutes
  // apart, and it left Hanoi identical from LGA and JFK.
  if (origin === "LGA") total += 1.5;
  return Math.round(total * 2) / 2;
}

async function main() {
  console.log("Reading airport reference data...");
  const parsed = parseCsv(await get(AIRPORTS_CSV));
  const airports = new Map(parsed.map((a) => [a.iata, a]));
  const ambiguous = ambiguousTokens(parsed);
  console.log(`  ${airports.size} airports; ${ambiguous.size} city words are ambiguous across countries`);

  console.log("Reading published destination tables...");
  const sections = {} as Record<Origin, string>;
  for (const o of ORIGINS) {
    sections[o] = await destinationSection(ARTICLES[o]);
    console.log(`  ${o}: ${(sections[o].length / 1024).toFixed(0)} KB`);
  }

  const origins = ORIGINS.map((o) => {
    const a = airports.get(o);
    if (!a) throw new Error(`no reference data for origin ${o}`);
    return [o, a] as const;
  });

  const table: Record<string, unknown> = {};
  let disagreements = 0;

  for (const d of DESTINATIONS) {
    const arrival = airports.get(d.arrivalAirport);
    if (!arrival) {
      console.error(`  ! no reference data for ${d.id} (${d.arrivalAirport})`);
      continue;
    }
    const byOrigin: Record<string, unknown> = {};

    for (const [o, originAirport] of origins) {
      const { nonstop, seasonal } = serviceFrom(sections[o], arrival.name, ambiguous);

      // Airlines are not extracted: attributing a destination to a carrier needs the
      // table's row structure, which the interleaved citations make fragile. Existing
      // entries keep theirs; new ones start empty, which is exactly what the previous
      // no-route-entry fallback already gave them.
      const existing = CURATED_SPECS[d.id]?.byOrigin[o];

      /*
       * A curated entry wins a disagreement, and is reported rather than overwritten.
       *
       * The parse produces false negatives where Wikipedia and OurAirports disagree about
       * an airport's name: OurAirports calls Lisbon "Lisbon Humberto Delgado Airport"
       * while the tables say "Lisbon Airport", and Singapore appears as a bare city name.
       * Neither shares the two distinctive words the matcher requires — and loosening that
       * threshold is what let LaGuardia fly to London, Ontario.
       *
       * So a generated `false` is weaker evidence than a human-verified `true`. Silently
       * replacing verified data with a parser's miss would be a regression dressed as a
       * refresh. Disagreements print, for a person to adjudicate.
       */
      const resolvedNonstop = existing && existing.nonstop !== nonstop ? existing.nonstop : nonstop;
      const resolvedConnections = resolvedNonstop ? 0 : 1;

      if (existing && existing.nonstop !== nonstop) {
        disagreements++;
        console.log(
          `  ! ${d.id}/${o} (${d.arrivalAirport}): curated nonstop=${existing.nonstop}, ` +
            `parsed=${nonstop} — keeping the curated value`,
        );
      }

      byOrigin[o] = {
        origin: o,
        nonstop: resolvedNonstop,
        typicalTotalHours: hours(originAirport, arrival, resolvedNonstop, resolvedConnections, o),
        typicalConnections: resolvedConnections,
        airlines: existing?.airlines ?? [],
        seasonal,
      };
    }

    table[d.id] = { destinationId: d.id, arrivalAirport: d.arrivalAirport, byOrigin };
  }

  const covered = Object.keys(table).length;
  console.log(`\nGenerated ${covered}/${DESTINATIONS.length} destinations`);
  console.log(`Disagreements with existing curated entries: ${disagreements}`);

  if (covered < DESTINATIONS.length) {
    console.error("Refusing to write a partial table.");
    process.exit(1);
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(
    OUT,
    `${JSON.stringify(
      {
        generatedOn: new Date().toISOString().slice(0, 10),
        source: "Wikipedia airport 'Airlines and destinations' tables",
        sourceKind: "crowdsourced",
        note: "Nonstop status and seasonality are read from the tables. Journey length is derived from great-circle distance and is only claimed accurate to its band. Airlines are not extracted.",
        origins: ORIGINS,
        count: covered,
        routes: table,
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error("build:routes failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
