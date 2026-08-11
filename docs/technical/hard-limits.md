# Hard limits and baked-in assumptions

Every fixed value, threshold and closed set in the system, and what it would take to change
each. Prompted by finding that the departure airport was a JFK figure wearing a different
label (ADR 0015) — this exists so the next one gets found before it ships.

- **Last reviewed**: 2026-08-11

Severity is about **what happens when the assumption is wrong for you**:

- 🔴 **Changes answers silently** — wrong for you, and nothing on screen says so.
- 🟠 **Visible but fixed** — stated in the UI, but not adjustable.
- 🟢 **Adjustable** — a preference, or a one-line change with tests behind it.

---

## Fixed to New York

| What | Where | Severity | Notes |
|---|---|---|---|
| **Origin airports are JFK, LGA, EWR** | `types.ts` `ORIGINS` | 🟠 | Closed set by design (ADR 0015). Another metro means a new route table, not a config change. |
| **Home base is New York** | `data/home.ts` | 🟠 | **Consolidated 2026-08-11.** Airports, climate reference, coordinates and timezone now live in one `HOME` record instead of being scattered. A second base is a new route table (27 × its airports) plus a climate record — editorial work, not a refactor. |
| **Airline table is New-York-scoped** | `data/airlines.ts` | 🟠 | Carriers listed by which NYC airports they serve. A different metro invalidates the `origins` on every row. |
| **Live flight data never ranks** | ADR 0016 | 🟠 | Deliberate. Rankings use curated routes so they stay free, deterministic and reproducible; searched itineraries attach to a chosen trip. |
| **Forecast fetch is the one request-time call** | `trips/[id]/page.tsx` | 🟠 | Narrow by design: one destination, only inside 16 days, only once a destination is chosen. Failure degrades to normals with an explanation. |
| ~~`Trip.departureAirport` feeds nothing~~ | — | ✅ | **Fixed 2026-08-11.** Migration 0006 replaces it with `origins`, an ordered list that feeds scoring. Existing trips backfilled with their stated airport first. |
| **Nine NYC/JFK mentions in catalog prose** | `data/destinations.ts` | 🟢 | Editorial copy — "nonstop from JFK", "shortest flight from New York". Find-and-rewrite. |

## Scoring thresholds

| What | Value | Where | Severity |
|---|---|---|---|
| **Seasonal gate floor and pivot** | `0.6 + 0.4 × clamp((suitability − 1) / 2.5)` | `engine.ts` | 🟠 Shown as `×N seasonal gate`. Calibrated so a strong destination in a poor month lands mid-table. Changing it changes documented behaviour and breaks a named test. |
| **Travel limit is a hard partition** | over-limit ranks below everything that fits | `engine.ts` | 🟠 ADR 0009. Deliberate, badged, explained under the table. |
| **Nonstop tolerance when picking a route** | 0.5 h | `routes/index.ts` | 🟢 A nonstop beats a connection up to 30 min slower. |
| **Journey-length curve** | breaks at 0.5× and 1.0× of your ceiling | `engine.ts` | 🟠 Not adjustable; the ceiling itself is. |
| **Connection penalty** | `[88, 70, 45, 25]` by connection count | `engine.ts` | 🟢 |
| **Travel-share curve** | breaks at 8% and 20% of trip hours | `engine.ts` | 🟢 |
| **Category weights** | 3/3/2/2/3/1/2 default | `DEFAULT_PREFERENCES` | 🟢 Fully adjustable per comparison. |
| **Default ceiling / ideal high / budget** | 24 h, 80 °F, $350 | `DEFAULT_PREFERENCES` | 🟢 |

## Itinerary and transfers

| What | Value | Where | Severity |
|---|---|---|---|
| **Airport overhead** | 3.5 h, +1 h international | `itinerary/transfers.ts` | 🟠 Dominates short-hop estimates by design. Stated in the UI as an estimate. |
| **Ground vs air cut-off** | 250 km | `itinerary/transfers.ts` | 🟠 Below it, overland; above it, a flight. A 300 km train route is modelled as a flight. |
| **Ground speed / flight speed** | 65 km/h, 750 km/h | `itinerary/transfers.ts` | 🟢 |
| **Long-haul connection penalty** | +2.5 h beyond 4,000 km | `itinerary/transfers.ts` | 🟢 |
| **Burden bands** | 3 / 6 / 11 h | `itinerary/transfers.ts` | 🟢 |
| **"Stop not worth the transfer"** | transfer ≥ 30% of waking hours gained | `itinerary/index.ts` | 🟠 Assumes a 14-hour waking day. |
| **"Trip is mostly transit"** | transfers > 1/6 of waking hours | `itinerary/index.ts` | 🟢 |
| ~~A stop always occupies ≥ 1 night~~ | — | ✅ | **Fixed 2026-08-11.** A zero-night stop now has `arrive === depart` and pushes nothing out. |

## Climate

| What | Value | Where | Severity |
|---|---|---|---|
| **Normals period** | 2015–2024 | `build-reference-data.ts` | 🟠 Not the 30-year WMO standard — deliberate (ADR 0005), and the strongest objection to it is recorded there. |
| **Day-of-year smoothing** | ±7 days | `build-reference-data.ts` | 🟠 Deliberately flattens genuine short-term features. |
| **Forecast horizon** | 16 days | `climate/forecast.ts` | 🟢 Explains itself outside the window. |
| **Forecast confidence bands** | 3 / 9 days | `climate/forecast.ts` | 🟢 |
| **"Notable" forecast difference** | 5 °F or 2 wet days | `climate/forecast.ts` | 🟢 |
| **Rain day threshold** | ≥ 1 mm | build script | 🟠 Standard, but it means a drizzle day counts the same as a downpour. |
| **Comfort language cut-offs** | 97/84/78/60/45 °F | `climate/index.ts` | 🟢 Prose only, no effect on scores. |

## Places

| What | Value | Where | Severity |
|---|---|---|---|
| **Staleness thresholds** | restaurant 180/550 d, beach 1095/1825 d, etc. | `places/index.ts` | 🟢 Per category, tested at each boundary. |
| **Imminent-trip escalation** | 45 days | `places/index.ts` | 🟢 |
| **Place categories** | closed set of 12 | `types.ts` | 🟠 Categories exist to drive staleness, not to be a taxonomy. |
| **A destination visited twice shows places on the first stop** | — | `places/index.ts` | 🟠 Deliberate; showing them twice would imply two bookings. |

## Money

| What | Value | Where | Severity |
|---|---|---|---|
| **Max amount** | 9 × 10¹² minor units | `money/index.ts` | 🟢 ~₫9 trillion. Throws rather than silently losing precision. |
| **Known-currency list** | 115 codes | `money/index.ts` | ✅ **Fixed 2026-08-11.** An unknown currency now throws with a message naming the file to edit, instead of defaulting to 2 decimals. `isKnownCurrency` checks without throwing. |
| **Rounding** | half-up, symmetric about zero | `money/index.ts` | 🟢 |
| **Payment warning windows** | 7 days due, 3 days refundability | `money/budget.ts` | 🟢 |

## Structural

| What | Where | Severity | Notes |
|---|---|---|---|
| **Only catalog destinations can be ranked** | ADR 0003 | 🟠 | The deliberate core constraint. 27 destinations. |
| **Single user, no ownership column** | `db/schema.ts` | 🟠 | Release 8 is a migration across every table. |
| **Forecasts never reach scoring** | ADR 0012 | 🟠 | Enforced by a static test. |
| **Nothing fetched at request time** | ADR 0005 | 🟠 | One narrow exception planned for forecasts in Release 5. |
| **Holiday data is national only** | `holidays.ts` | 🔴 | No data at all for Thailand, UAE, Maldives; Vietnam omits Tết. Surfaced as *unavailable* and lowers confidence, but a thin list still reads as a quiet week. |

---

## Status

The three 🔴 items from the first review were fixed on 2026-08-11 and are struck through
above. Every other surviving limit is adjustable, stated on screen, or a documented
decision.

**One 🔴 remains, and it is not fixable in code: holiday coverage.** It is the last place
where missing data can read as a positive fact — "no holidays" rather than "no data". The
app marks affected countries unavailable and lowers the comparison's confidence, but a thin
national list still looks like an answer: Nager.Date returns four entries for Vietnam and
omits Tết, which is the single most disruptive week in that calendar. Nothing in the code
can distinguish "quiet week" from "poor source". It needs a better source.
