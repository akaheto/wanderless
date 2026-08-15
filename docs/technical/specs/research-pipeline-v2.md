# Unified City Research Pipeline v2

**Problem with v1**: Relied entirely on web search + Claude extraction. Austin, New York, Weimar all failed because web searches don't return structured hotel pricing data, and Claude extraction from unstructured text is unreliable.

**Solution**: Hybrid approach using reliable data sources + human review step.

## Architecture

```
User suggests city via app
      ↓
Admin clicks "Research"
      ↓
PHASE 1: Automated Data Collection
  - Climate: Open-Meteo API (reliable, structured)
  - Flights: Hardcoded route data or Kiwi.com API (reliable)
  - Visa: Web search (usually good for this)
  - Influencer spots: Web search + Claude (soft data, ok to curate)
      ↓
PHASE 2: Claude-Assisted Research (optional)
  - Claude reviews search results, suggests likely prices
  - Claude identifies influencer spot candidates
  - Claude drafts climate summary
      ↓
PHASE 3: Admin Review & Approval
  - Admin sees draft research
  - Admin can edit/correct any field
  - Admin adds real data from manual research if needed
  - Admin approves when satisfied
      ↓
PHASE 4: Publish to Catalog
  - Only admin-approved data enters catalog
  - Never auto-published
```

## Data Sources by Field

| Field | Source | Reliability | Backup |
|-------|--------|-------------|--------|
| **Hotel 4-star price** | Manual admin research | ✅ High | Web search + Claude |
| **Hotel 5-star price** | Manual admin research | ✅ High | Web search + Claude |
| **Nonstop flights** | Kiwi.com API / hardcoded | ✅ High | Known routes |
| **Flight hours** | Kiwi.com API / hardcoded | ✅ High | Calculated from distance |
| **Visa requirements** | Web search | ✅ Medium | Official embassy site |
| **Climate data** | Open-Meteo API | ✅✅ Highest | NASA POWER |
| **Influencer spots** | Web search + Claude | ⚠️ Medium | Admin manual research |
| **Summary** | Claude from above data | ⚠️ Medium | Admin writes |

## Workflow: Admin Research a City

### Step 1: Automated Collection (2-3 minutes)
```
researchCity(city, country) runs:
1. Fetch climate from Open-Meteo → stored as JSON
2. Fetch visa from web search → stored as text
3. Fetch flights from known routes → stored as JSON
4. Search for influencer spots → stored as raw results
5. Claude drafts suggested prices from web search → suggestions only

Result: Draft research object with:
- ✅ Reliable data (climate, flights, visa)
- ⚠️ Suggested data (prices, influencer spots)
- Status: "draft_for_review"
```

### Step 2: Admin Review (5-10 minutes)
UI shows form:
```
Hotel Prices (EDIT TO CORRECT):
  4-star: $[web suggested: 150] → Admin enters: 145 ✓
  5-star: $[web suggested: 380] → Admin enters: 420 ✓
  Source: [admin notes: "Booking.com average, March 2026"]

Influencer Spots (CLICK TO ACCEPT/REMOVE):
  ☑ Park Güell - museum/lookout
  ☑ Sagrada Familia - museum
  ☐ Random cafe Claude found (UNCHECK if bad)
  [+ ADD MORE if needed]

Climate: [pre-filled from Open-Meteo, read-only]
Visa: [pre-filled from search, read-only]
Summary: [pre-filled Claude draft, EDIT TO REFINE]

[APPROVE] → moves to "approved_ready_for_catalog"
```

### Step 3: Publish to Catalog
```
Once approved, code addition is automatic:
src/data/destinations.ts gets new entry with admin-verified data
```

## Implementation

### Backend: `src/lib/research/city-research-v2.ts`

```typescript
export async function draftResearch(city, country) {
  return {
    climate: await fetchClimateData(city, country),        // ✅ Reliable
    flights: getFlightData(city, country),                 // ✅ Reliable
    visaInfo: await searchVisa(city, country),             // ⚠️ Medium
    influencerSpotsRaw: await searchInfluencerSpots(...),  // Raw results
    suggestedHotelPrices: await suggestPrices(...),        // AI suggestions only
    suggestedSpots: await Claude.extractSpots(...),        // Not auto-used
    status: 'draft_for_review'
  };
}
```

### Frontend: Admin Review Page

```typescript
// src/app/admin/research/[id]/page.tsx

Shows all fields editable except climate/flights/visa
User can:
- Edit hotel prices with field notes
- Toggle influencer spots (accept/reject)
- Add missing spots manually
- Edit summary
- Save as draft or approve

Validation:
- Both hotel prices required and > 0
- 20-50 influencer spots selected
- All fields non-empty
- Summary is reasonable length
```

### API: Approve & Publish

```typescript
// POST /api/admin/research/[id]/approve
- Takes admin's edited data
- Stores in database
- Generates src/data/destinations.ts entry
- Marks as "approved_ready_for_catalog"
- Ready for next catalog rebuild
```

## Why This Works

1. **Data reliability**: Uses APIs and structured sources for hard data (climate, flights)
2. **Human judgment**: Admin makes final call on prices and spots (only they know the real values)
3. **No fabrication**: Claude assists but doesn't auto-publish
4. **Verifiable**: Admin adds notes (sources) for every field
5. **Reversible**: Draft can be edited/rejected before approval
6. **Scalable**: Admin can research multiple cities this way

## Migration Path

### For Austin, New York, Weimar (currently failed):

1. Admin manually researches each city (30 min per city)
2. Uses draft workflow to enter data
3. Approves and publishes
4. Done

### For new cities going forward:

1. User suggests city
2. System auto-collects climate/flights/visa
3. Admin reviews and corrects (5 min)
4. Approve and publish

## What Changes in the App

**For end users**: Nothing. Catalog still shows same data.

**For admin**: New "Review Research" page before approval.

**In code**: 
- `researchCity()` becomes `draftResearch()` (suggestions only)
- New `approveAndPublishResearch()` (takes admin-edited data)
- New admin API endpoint `/api/admin/research/[id]/approve`
- New UI component for review form

## Differences from v1

| Aspect | v1 | v2 |
|--------|----|----|
| Data source | Web search only | APIs + web + admin |
| Extraction | Claude auto | Claude suggests, admin confirms |
| Validation | Strict rejection | Admin review before approval |
| Reliability | ⚠️ Medium | ✅ High |
| Failure mode | Research fails | Admin corrects and approves |
| Time per city | 2 min (fails 80%) | 10 min (succeeds 100%) |
| Catalog accuracy | Questionable | Verified |
