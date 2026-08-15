# City Research Process

**Single source of truth for researching and adding cities to the destination catalog.**

Applies to all cities, regardless of how requested (chat, app UI, manual).

## Principle

**Only verified data enters the catalog. Never fabricate, guess, or estimate.**

Each fact must be:
1. Sourced from a named, verifiable source
2. Extracted via Claude from that source
3. Validated to ensure it's reasonable
4. Rejected if verification fails

## Complete Workflow

### Phase 1: Web Research (Tavily)

Run these searches in parallel. Each must return usable results:

```
1. Hotel pricing search:
   "4-star 5-star hotel average cost per night {city} {country} 2026"
   → Extract: USD prices for both categories, source site

2. Flight research:
   "nonstop flights from JFK Newark Boston to {city} {country} flight time hours"
   → Extract: nonstop availability (yes/no), typical hours, routing

3. Visa requirements:
   "US passport citizens entry requirements visa {city} {country}"
   → Extract: visa needed (yes/no), processing time if needed

4. Climate & seasons:
   "{city} {country} weather climate temperature best time to visit season"
   → Extract: temperature range, wet/dry seasons, best months

5. Influencer/social media spots:
   "Instagram-worthy cafes bars restaurants museums lookout points {city} {country}"
   → Extract: 20-50 specific location names, types, descriptions
```

**If ANY search returns no usable data:**
- Log which search failed
- Do NOT proceed
- Mark city as "research_failed" with reason
- Require manual investigation

### Phase 2: Claude Extraction

Pass ALL search results to Claude with this prompt:

```
You are extracting verified travel data from web search results.
CRITICAL: Extract ONLY what you find in the search results. 
Do NOT estimate, guess, or make up numbers.
If a number doesn't appear in the results, leave it as null.

Extract these facts:

1. HOTEL PRICES (USD, per night)
   - 4-star: [exact number from source, or null]
   - 5-star: [exact number from source, or null]
   - Source website: [where prices came from]

2. FLIGHT DATA
   - Nonstop available: [true/false, only if explicitly stated]
   - Typical hours door-to-door: [number, only if found]
   - Number of connections: [0/1/2, only if stated]

3. VISA REQUIREMENTS
   - US citizens need visa: [true/false]
   - If yes, processing time and requirements: [exact text]

4. CLIMATE
   - Temperature range: [high/low F]
   - Best months: [list by month number, only if found]
   - Worst months: [list by month number, only if found]
   - Rainy season: [description if found]

5. INFLUENCER SPOTS (20-50)
   For each spot:
   - Real name (as it appears in search results)
   - Type (bar, restaurant, cafe, museum, lookout, beach, market, other)
   - Brief description (what makes it notable)
   
   CRITICAL: Do NOT invent locations. List only spots that appear in the search results.

Return as JSON only, no explanation.
If you cannot find reliable data for any section, return null for that field.
```

### Phase 3: Validation Gates

Each extracted field must pass validation:

**Hotel Prices:**
- Both 4-star AND 5-star prices present
- Prices are reasonable for region (4-star < 5-star)
- Must be within 2-3× of regional average
- Must be between $50-$2,000 per night

**Flight Data:**
- If nonstop: true only if explicitly found
- Hours: 4-25 hours (reasonable door-to-door time)
- Connections: 0-2 (0=nonstop, 1+=connections)

**Visa:**
- Must be clear yes/no (not "maybe" or "depends")
- If yes, must have processing time

**Climate:**
- Temperature in Fahrenheit range: 0-130°F
- Best/worst months: 1-12 (valid month numbers)
- Description: 10+ characters, no placeholder text

**Influencer Spots:**
- Minimum 20 spots extracted
- Maximum 50 spots extracted
- Each spot has name, type, description
- No duplicate names
- Types are valid categories
- Descriptions are 5-100 characters

**If validation fails on ANY field:**
- Reject the city
- Do NOT use placeholder data
- Log which validation failed and why
- Require re-research with better sources

### Phase 4: Database Storage

If ALL validations pass:

```typescript
const researched = {
  city: "Nice",
  country: "France",
  status: "reviewed",
  hotel_data: JSON.stringify({ fourStarUSD: 280, fiveStarUSD: 650, source: "booking.com" }),
  flight_data: JSON.stringify({ nonstop: false, typicalHours: 11, typicalConnections: 1, source: "kiwi.com" }),
  visa_info: "US citizens do not require a visa for France",
  climate_data: "Mediterranean climate. Best months: May-September. Mild winters. Peak summer crowds July-August.",
  influencer_spots: JSON.stringify([{name: "Promenade des Anglais", type: "lookout", description: "..."}...]),
  research_notes: "Research complete: Mediterranean beach city with Belle Époque charm."
};
```

### Phase 5: Catalog Addition (Manual Step)

Once stored in database and verified:

1. Admin reviews research results (all fields)
2. Confirms data matches sources
3. Manually adds to `src/data/destinations.ts` if cataloging
4. Or leaves in "reviewed" status in database for future use

**DO NOT auto-add to catalog.** Catalog entries are curated, not automated.

## Failure Modes

| Scenario | Action |
|----------|--------|
| Search returns no results | Fail. Try different search terms or mark "insufficient sources" |
| Claude extraction incomplete | Fail. Log which fields missing. Try again with better search results. |
| Validation fails | Fail. Do NOT estimate. Mark city with reason. Require better sources. |
| Data looks wrong | Fail. Cross-check against source. If source is wrong, find better source. |
| Spot list has duplicates | Fail. Remove duplicates or reject entire list if too many. |

## Testing

Before marking a city as researched:

```
✓ All 5 searches returned results
✓ All 5 extraction fields non-null
✓ All 5 validation gates passed
✓ Spot count: 20-50
✓ Prices make sense for region
✓ Flight times realistic for distance
✓ Visa status clear
✓ Climate description plausible
✓ Each spot has real name + type + description
✓ No placeholder text anywhere
```

## When to Use This Process

**Every single city addition:**
- Requested via chat: use this process
- Requested via app /destinations/suggest: use this process  
- Manual catalog addition: research first, THEN add
- Update to existing city: re-research changed fields

**Never skip validation.** A researched city with missing data is worse than an un-researched city.

## Implementation

- `src/lib/research/city-research.ts` — implements extraction + validation
- `src/app/api/admin/suggestions/[id]/approve/route.ts` — triggers research
- `scripts/research-city.ts` — CLI tool for manual batch research
- Test: `src/lib/research/city-research.test.ts`
