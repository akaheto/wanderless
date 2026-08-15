/**
 * Provider health check — what is actually reachable right now.
 *
 * The catalog draws on a dozen external sources, and until this existed there was no way
 * to answer "which of them work?" without reading each client. That gap is how the hotel
 * provider came to serve invented inventory in production for weeks: nothing reported
 * that it had no credentials.
 *
 * Three outcomes, and the distinction matters:
 *
 *   LIVE       reachable, returned plausible data
 *   DORMANT    integrated in code, no credentials — cannot run, and should never pretend to
 *   THROTTLED  the source is up and answering; we are being rate limited
 *   BROKEN     credentials present or none needed, but the call failed
 *
 * DORMANT is not a failure. It is a supported state, and the point is that it be visible
 * rather than silently substituted for.
 *
 *   npx tsx scripts/check-providers.ts
 */

import "dotenv/config";

type Status = "LIVE" | "DORMANT" | "THROTTLED" | "BROKEN";

interface Result {
  name: string;
  status: Status;
  detail: string;
  ms?: number;
  keyless: boolean;
}

const results: Result[] = [];

/** Identifies us to sources whose policies require it, matching what the app sends. */
const USER_AGENT = "Wanderless/1.0 (provider health check)";

async function probe(
  name: string,
  opts: { envKeys?: string[]; url?: string; check?: (body: string) => string | null },
) {
  const { envKeys = [], url, check } = opts;
  const keyless = envKeys.length === 0;

  const missing = envKeys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    results.push({
      name,
      status: "DORMANT",
      detail: `needs ${missing.join(", ")}`,
      keyless,
    });
    return;
  }

  if (!url) {
    results.push({ name, status: "LIVE", detail: "credentials present", keyless });
    return;
  }

  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(25_000),
      // Required by the OpenStreetMap and Wikimedia usage policies, and sent by the real
      // clients. Omitting it here produced a 403 that looked like a broken source.
      headers: { "User-Agent": USER_AGENT },
    });
    if (res.status === 429) {
      results.push({
        name,
        status: "THROTTLED",
        detail: "rate limited — source is up",
        ms: Date.now() - started,
        keyless,
      });
      return;
    }
    const ms = Date.now() - started;
    if (!res.ok) {
      results.push({ name, status: "BROKEN", detail: `HTTP ${res.status}`, ms, keyless });
      return;
    }
    const body = await res.text();
    const problem = check?.(body) ?? null;
    results.push(
      problem
        ? { name, status: "BROKEN", detail: problem, ms, keyless }
        : { name, status: "LIVE", detail: `${(body.length / 1024).toFixed(0)} KB`, ms, keyless },
    );
  } catch (error) {
    results.push({
      name,
      status: "BROKEN",
      detail: error instanceof Error ? error.message.slice(0, 60) : String(error),
      ms: Date.now() - started,
      keyless,
    });
  }
}

async function main() {
  console.log("Probing external providers...\n");

  await Promise.all([
    // --- Keyless, and load-bearing -----------------------------------------
    probe("Open-Meteo (climate archive)", {
      url:
        "https://archive-api.open-meteo.com/v1/archive?latitude=48.85&longitude=2.35" +
        "&start_date=2024-01-01&end_date=2024-01-07&daily=temperature_2m_max",
      check: (b) => (b.includes("temperature_2m_max") ? null : "no temperature field"),
    }),
    probe("Open-Meteo (marine)", {
      // Mirrors build-reference-data.ts: the field is sea_surface_temperature_max and the
      // archive endpoint requires date bounds. The shorter form returns 400.
      url:
        "https://marine-api.open-meteo.com/v1/marine?latitude=41.39&longitude=2.16" +
        "&start_date=2024-06-01&end_date=2024-06-07" +
        "&daily=sea_surface_temperature_max&timezone=auto&temperature_unit=fahrenheit",
      check: (b) => (b.includes("sea_surface_temperature_max") ? null : "no SST field"),
    }),
    probe("Nager.Date (holidays)", {
      url: "https://date.nager.at/api/v3/PublicHolidays/2027/FR",
      check: (b) => (b.trim().startsWith("[") ? null : "not a JSON array"),
    }),
    probe("Frankfurter (ECB rates)", {
      url: "https://api.frankfurter.app/latest?from=USD&to=EUR",
      check: (b) => (b.includes("EUR") ? null : "no EUR rate"),
    }),
    probe("Nominatim (geocoding)", {
      url: "https://nominatim.openstreetmap.org/search?q=Lisbon&format=json&limit=1",
      check: (b) => (b.trim().startsWith("[") ? null : "not a JSON array"),
    }),
    probe("US State Dept (advisories)", {
      url: "https://travel.state.gov/_res/rss/TAsTWs.xml",
      check: (b) => {
        const n = (b.match(/<item>/g) ?? []).length;
        return n > 150 ? null : `only ${n} advisories`;
      },
    }),
    probe("CDC (health notices)", {
      url: "https://wwwnc.cdc.gov/travel/rss/notices.xml",
      check: (b) => (b.includes("<item>") ? null : "no items"),
    }),
    probe("OurAirports (airport reference)", {
      url: "https://davidmegginson.github.io/ourairports-data/airports.csv",
      check: (b) => (b.includes("iata_code") ? null : "no iata_code column"),
    }),
    probe("Wikipedia / MediaWiki (route tables)", {
      url:
        "https://en.wikipedia.org/w/api.php?action=parse&page=John%20F.%20Kennedy%20" +
        "International%20Airport&prop=wikitext&format=json",
      check: (b) => (b.includes("Airlines and destinations") ? null : "section missing"),
    }),

    // --- Keyed ---------------------------------------------------------------
    probe("Yelp Fusion (restaurants)", { envKeys: ["YELP_API_KEY"] }),
    probe("Ticketmaster (events)", { envKeys: ["TICKETMASTER_API_KEY"] }),
    probe("Booking via RapidAPI (hotels)", { envKeys: ["RAPIDAPI_KEY", "RAPIDAPI_HOST"] }),
    probe("OpenWeatherMap (alerts)", { envKeys: ["OPENWEATHERMAP_API_KEY"] }),
    probe("Google Maps (ground transit)", { envKeys: ["GOOGLE_MAPS_API_KEY"] }),
    probe("Kiwi Tequila (flights)", { envKeys: ["KIWI_API_KEY"] }),
    probe("Anthropic (research drafting)", { envKeys: ["ANTHROPIC_API_KEY"] }),
    probe("Tavily (web search)", { envKeys: ["TAVILY_API_KEY"] }),
  ]);

  const order: Record<Status, number> = { BROKEN: 0, THROTTLED: 1, LIVE: 2, DORMANT: 3 };
  results.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));

  const mark = {
    LIVE: "  LIVE     ",
    DORMANT: "  DORMANT  ",
    THROTTLED: "  THROTTLED",
    BROKEN: "  BROKEN   ",
  };
  for (const r of results) {
    const ms = r.ms !== undefined ? `${String(r.ms).padStart(5)}ms` : "       ";
    console.log(`${mark[r.status]} ${r.name.padEnd(38)} ${ms}  ${r.detail}`);
  }

  const live = results.filter((r) => r.status === "LIVE").length;
  const dormant = results.filter((r) => r.status === "DORMANT").length;
  const broken = results.filter((r) => r.status === "BROKEN").length;
  const throttled = results.filter((r) => r.status === "THROTTLED").length;
  console.log(
    `\n${live} live · ${dormant} dormant · ${throttled} throttled · ${broken} broken`,
  );

  if (broken > 0) {
    console.error("\nBroken providers are a real failure — either the source moved or we did.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("check failed:", e);
  process.exit(1);
});
