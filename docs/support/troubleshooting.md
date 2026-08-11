# Troubleshooting

Symptom → cause → fix.

## The itinerary panel says to set the trip dates first

**Cause:** Stops are laid out from the departure date, so without dates there is nothing to
derive (ADR 0010).

**Fix:** Add a start and end date on the trip's edit page.

## I can't set a stop's arrival date

**Cause:** There is no per-stop date field by design. Nights are the source of truth and
dates are derived, which is what makes gaps and overlaps impossible.

**Fix:** Change the night counts, or reorder the stops. To move the whole itinerary, change
the trip's start date — every stop shifts with it.

## The itinerary says nights are unallocated or over

**Cause:** The nights across your stops do not add up to the trip's own length.

**Fix:** Intended behaviour — it is reported, not corrected, because guessing which stop to
stretch would be wrong as often as right. Adjust a night count, or add or remove a stop.

## A stop I added disappeared

**Cause:** Its destination is no longer in the catalog, so it is skipped when the itinerary
is built rather than crashing the page.

**Fix:** Remove and re-add the stop. If a destination was deliberately removed from
`src/data/destinations.ts`, this is expected.

## Transfer hours look too high for a short flight

**Cause:** The estimate is door to door, not gate to gate. It includes roughly 3.5 hours of
airport overhead — getting there, clearing it, waiting, and getting out — which dominates any
short sector.

**Fix:** Working as intended, and the point of the feature. Overland transfers under 250 km
are modelled separately and do not carry the overhead. Real flight timings arrive with
Release 5 — external road routing was withdrawn (ADR 0011) because it would not have
touched flight legs, which are 99% of the catalog. Specific legs known to be wrong can be
corrected in `CURATED_OVERRIDES` in `src/lib/itinerary/transfers.ts`.

## A destination with a lower score is ranked above one with a higher score

**Cause:** The higher-scoring destination exceeds your maximum travel time. Over-limit
destinations are ranked below everything that fits, whatever they score (ADR 0009).

**Fix:** Working as intended. Raise *Maximum travel time* to bring them into contention.
The demoted rows carry an *over travel limit* badge and a note appears under the table.

## A score is lower than the category scores suggest

**Cause:** The seasonal viability gate. The catalog rates that destination a poor time to
visit in your months, so the total is scaled down (ADR 0004).

**Fix:** Working as intended. The row shows `×N seasonal gate (was M)`, and the
destination's *Season by season* panel explains the rating. If you think the rating is
wrong, that is a curated judgement — change `suitability` in `src/data/destinations.ts`.

## "No climate data for <id>. Run `npm run build:data`"

**Cause:** A destination was added to the catalog but the generated climate corpus was not
rebuilt. Deliberate failure rather than a silent gap.

**Fix:**

```bash
npm run build:data
```

Only the new destination is fetched; existing ones are skipped.

## `npm run build:data` fails or hangs

**Cause:** Open-Meteo rate limiting. Ten years of daily data per destination is a large
request, and the archive API throttles aggressively.

**Fix:** The script already backs off and retries up to five times with a 65-second wait.
Let it run — a full rebuild takes several minutes. If it exits, re-run it: completed
destinations are skipped, so it resumes rather than restarting.

To force a full refetch:

```bash
npm run build:data -- --force
```

## The dashboard shows no trips, but trips exist

**Cause:** Historically, the dashboard prerendered as a static page at build time, capturing
an empty database.

**Fix:** Fixed — `src/app/page.tsx` sets `export const dynamic = "force-dynamic"`. If it
recurs, that line has been removed, or a new page reading the database is missing it.

## Hydration mismatch warning in the console, mentioning `data-sharkid`

**Cause:** A browser extension (a password manager) injecting attributes into form fields
before React hydrates. Not application code.

**Fix:** None needed. Confirm by checking that the diff shows only injected attributes, or
reload in a private window with extensions disabled.

## Changes to a destination's profile do not appear

**Cause:** Curated data is bundled at build time.

**Fix:** In development the dev server picks it up on save. In production, redeploy. If the
change was to climate data rather than the profile, run `npm run build:data` first — editing
`src/data/generated/` by hand is not supported and will be overwritten.

## Writes fail in production ("readonly database", or a write silently does nothing)

**Cause:** `DATABASE_URL` and `DATABASE_AUTH_TOKEN` are not set, so the client fell back to
a local SQLite file. Vercel's filesystem is read-only.

**Fix:** Set both environment variables to a Turso database and redeploy. Verify with
`vercel env ls`.

## A comparison link does not restore what I saw

**Cause:** All state is in the query string, so a truncated URL loses it. Chat clients and
some email clients cut long URLs.

**Fix:** Copy from the address bar rather than a rendered link. If destinations are missing
but preferences survived, the `dest` parameter was dropped — both `?dest=a,b` and
`?dest=a&dest=b` are accepted.

## No public holidays shown for a country that has them

**Cause:** Nager.Date has no data for Thailand, the UAE or the Maldives, and its Vietnam
list omits Tết.

**Fix:** Not fixable from here. The app marks these as *unavailable* rather than showing an
empty list, and reduces the comparison's confidence rating. Treat curated month notes as
the source for these countries. See `/sources`.

## Tests fail after editing the catalog

**Cause:** `engine.test.ts` asserts specific rankings — the Vietnam March/November
inversion, the Thai coasts on opposite monsoons, Stockholm outside the top half in January.
Changing `suitability` or ratings for those destinations can legitimately break them.

**Fix:** Decide which is wrong. If the catalog change is right, update the test and say why
in the commit. Do not delete the assertion — these are the regressions the product exists
to prevent (ADR 0003, 0004, 0009).

## A place shows as "never verified" even though I just added it

**Cause:** Adding a place does not claim you checked it. The *I have just checked these
details* box sets the verification date; leaving it unticked saves the place honestly as
unverified.

**Fix:** Working as intended — an automatic date would make every place look checked when
none had been. Use *Re-check this* when you have actually confirmed the details.

## Re-checking a place did not offer my notes or priority

**Cause:** Deliberate. Re-verification refreshes the fetched fields only, and there is no
write path that touches personal fields at the same time (ADR 0014).

**Fix:** Change notes and priority from the place row itself. The separation is what
guarantees a refresh can never overwrite something you wrote.

## A saved place is not showing under any stop

**Cause:** Its destination has no stop on this trip. Stop membership is derived from the
destination, not stored.

**Fix:** It appears under *Not on the itinerary*. Add a stop for that destination, or leave
it — it stays saved either way.

## A place shows as stale but I know it is fine

**Cause:** Staleness is age plus category, not evidence. A restaurant crosses into stale at
eighteen months regardless of whether anything actually changed.

**Fix:** Re-check it and mark it verified today. If a whole category feels wrongly tuned,
the thresholds are in `FRESHNESS_DAYS` in `src/lib/places/index.ts`.
