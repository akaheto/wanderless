# How to Add a New Destination

This guide explains the complete process for adding a new destination to the Wanderless catalog. **All steps are required** — skipping any will cause the destination to appear in the catalog but show an error page when clicked.

## The 4-Step Process

### Step 1: Add Destination Data to `src/data/destinations.ts`

Every destination must have complete data including:
- Basic info: `id`, `name`, `area`, `country`, `region`
- Coordinates: `lat`, `lon`, `timezone`
- Classification: `coastal`, `archetype`, `tourismTier`
- Summary (one line)
- Travel profile (flight info, arrival ease)
- Lodging profile (hotel costs, multipliers, Booking link)
- Experience ratings (food, culture, beaches, nightlife, dayTrips, nature, shopping)
- Practicality ratings (localTransport, languageEase, safetyEase, entryEase, tripSimplicity)
- Season data (12-character code: P=peak, S=shoulder, L=low)
- Suitability scores (12 numbers, one per month, 0-5 scale)
- Month notes (optional, sparse)
- Risks (optional array of risk windows)
- `curatedOn` date

**Template:**
```typescript
{
  id: "destination-slug",           // lowercase, hyphens for spaces
  name: "Destination Name",
  area: "Region/State",
  country: "Country",
  region: "Continental Region",     // Must match one in src/app/destinations/page.tsx REGIONS
  lat: 37.7749,
  lon: -122.4194,
  timezone: "America/Los_Angeles",
  coastal: true,
  archetype: "city" | "beach" | "rural",
  tourismTier: 1 | 2 | 3,           // 1 = major hub, 3 = off-beaten-path
  summary: "One line description.",
  travel: {
    nonstop: true | false,
    typicalTotalHours: 10,
    typicalConnections: 1,
    arrivalEase: 3.5,               // 1-5 scale
    notes: "Transport details from airport to city center.",
  },
  lodging: {
    fourStarUSD: 150,
    fiveStarUSD: 400,
    peakMultiplier: 1.25,           // Cost multiplier during peak season
    lowMultiplier: 0.8,
    bookingSearchUrl: "https://www.booking.com/searchresults.en.html?ss=...",
  },
  experience: {
    food: 4,
    culture: 4,
    beaches: 2,
    nightlife: 3,
    dayTrips: 4,
    nature: 3,
    shopping: 3,
  },
  practicality: {
    localTransport: 4,
    languageEase: 3,
    safetyEase: 4,
    entryEase: 5,
    tripSimplicity: 4,
  },
  seasons: seasons("PPPPSLLLLPPP"), // 12-char code
  suitability: [4, 4, 5, 5, 4, 2, 1, 1, 3, 4, 5, 4],
  monthNotes: {
    5: "Best month — dry and warm.",
    8: "Very hot and humid.",
  },
  risks: [
    { months: [6, 7, 8], label: "Typhoon season", severity: "high" },
  ],
  curatedOn: CURATED_ON,
}
```

**Important:**
- Region must match one from the REGIONS list in `/src/app/destinations/page.tsx`
- Use lowercase with hyphens for `id` (e.g., "new-york", "san-francisco")
- All profile scores (experience, practicality) must be 0-5
- Season code must be exactly 12 characters
- Suitability array must have exactly 12 numbers (index 0 = January)

### Step 2: Generate Climate Data

Climate data (temperature, humidity, precipitation) is required for the destination detail page to load. Without it, clicking the destination shows a 404 error.

```bash
npm run build:data
```

This script:
1. Fetches 10 years of historical climate normals from OpenMeteo API
2. Generates JSON files in `src/data/generated/climate/`
3. Updates `src/data/generated/climate-index.ts` with imports
4. Generates holiday calendars
5. Updates `src/data/generated/manifest.json`

**What it does NOT do:**
- It doesn't add your destination to the destinations.ts file (you must do Step 1 first)
- It doesn't commit or push to git (you do that manually)

**Expected output:**
```
athens        3653 days  |  Jan 43.3/34.9°F  Jul 73.4/57.8°F
budapest      3653 days  |  Jan 36.5/26.1°F  Jul 77.3/59.8°F
...
Done. Wrote N climate files + holidays to src/data/generated/
```

### Step 3: Verify the Build

Type-check and build locally to catch errors early:

```bash
npm run type-check  # Must pass
npm run lint        # Should pass (pre-existing warnings okay)
npm run build       # Should produce no new errors
```

**Common issues:**
- Region name mismatch → TypeScript error, fix the region in Step 1
- Missing climate data → Runtime error when accessing destination page
- Invalid season code → Error in seasons() function, must be 12 chars

### Step 4: Push to Git & Deploy

```bash
git add src/data/destinations.ts src/data/generated/
git commit -m "Add Destination-Name to catalog"
git push origin main
```

Vercel automatically builds and deploys when you push. The deployment typically takes 2-3 minutes.

**Verify deployment:**
1. Navigate to `https://travel-intelligence-hub.vercel.app/destinations/`
2. Search for your new destination (should appear in list)
3. Click the destination card (should load without error)
4. Verify climate chart, season info, and all sections load

## Checklist: Before You're Done

- [ ] Destination added to `src/data/destinations.ts` with all required fields
- [ ] Region matches one in REGIONS list
- [ ] `npm run build:data` completed successfully
- [ ] Climate JSON file exists: `src/data/generated/climate/{id}.json`
- [ ] Destination ID appears in `src/data/generated/climate-index.ts`
- [ ] Type check passes: `npm run type-check`
- [ ] Committed and pushed to main
- [ ] Vercel deployment completed (check https://vercel.com/dashboard)
- [ ] Destination appears in catalog list
- [ ] Clicking destination loads detail page (no 404 or error)
- [ ] Climate chart renders with temperature/precipitation data

## Troubleshooting

### "This page couldn't load" when clicking destination

**Cause:** Climate data missing for that destination ID.

**Fix:**
1. Verify destination ID in `src/data/destinations.ts` matches the URL slug (lowercase, hyphens)
2. Re-run `npm run build:data`
3. Check that `src/data/generated/climate/{id}.json` exists
4. Check that destination ID is in `src/data/generated/climate-index.ts`
5. Rebuild and redeploy

### Destination doesn't appear in catalog

**Cause:** Destination not in DESTINATIONS array or region mismatch.

**Fix:**
1. Verify destination is in `src/data/destinations.ts` (inside DESTINATIONS array)
2. Verify region exists in REGIONS list in `src/app/destinations/page.tsx`
3. Run type-check to catch region errors: `npm run type-check`

### Type errors when adding destination

**Cause:** Missing or invalid fields.

**Fix:**
1. Run `npm run type-check` to see specific error
2. Compare your destination to the template above
3. Verify all required fields are present and correct type
4. Check season code is exactly 12 characters (P, S, or L only)
5. Check suitability array has exactly 12 numbers

## Multi-Destination Bulk Add

When adding many destinations at once (5+):

1. Add all destination data to `src/data/destinations.ts`
2. Run `npm run type-check` → fix any errors
3. Run `npm run build:data` once (generates data for ALL destinations at once)
4. Run `npm run build` to verify
5. Commit and push everything together
6. Wait for Vercel deployment to complete
7. Test 3-5 destinations across different regions to verify

**Pro tip:** The `build:data` script is rate-limited (~1 request/second to OpenMeteo API). For 10+ new destinations, it may take 15-30 minutes. Run it once in the background and let it complete.

## Data Sources for Manual Entry

When researching destination data:

- **Coordinates:** Google Maps (right-click for exact lat/lon)
- **Timezone:** `man tzselect` or https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
- **Hotel costs:** Booking.com, filtering by date and star rating
- **Flight times:** FlightConnections.com or Google Flights
- **Visa ease:** US State Dept travel.state.gov
- **Climate context:** Historical data (OpenMeteo generates this automatically with `build:data`)

## Why All Steps Are Required

| Step | If Skipped | Result |
|------|-----------|--------|
| 1: Add destination data | Destination doesn't exist | Won't appear in catalog |
| 2: Run build:data | Climate missing | Page loads but shows "No climate data" error |
| 3: Verify build | Errors slip through | Build fails on Vercel, deployment blocked |
| 4: Push to git | Local-only changes | Changes never reach production |

The destination pages depend on climate data (`climateFor()` throws if not found). Without it, the page fails to render.
