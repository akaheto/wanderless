# Destination Catalog — Publication-Ready Automation

This guide walks you through adding new destinations to the curated catalog with publication-ready verification.

## System Architecture

**Tier 1: Data Collection (Automated + Manual)**
- Climate: Open-Meteo API (automatic)
- Travel times: Manual lookup from Google Flights (~5 min/city)
- Ground routing: Google Maps API (automatic, optional)
- Tourism calendar: Manual scrape from tourism boards (~5 min/city)
- Costs: Manual sampling from Booking.com (~10 min/city)
- Visitor stats: Manual lookup from tourism authority (~5 min/city)

**Tier 2: AI Draft Generation**
- Template-based month notes (no hallucinations)
- Climate + events + visitor patterns → structured summaries

**Tier 3: Multi-Checkpoint Verification**
- Checkpoint A: Data freshness (all fields present and valid)
- Checkpoint B: Factual accuracy (no hallucinations, events dated correctly)
- Checkpoint C: Consistency (ratings follow climate, seasons classified correctly)
- Checkpoint D: Quality gates (summary tone, cost outliers, regional comparison)

**Tier 4: Publication**
- Add to destinations.ts
- Validate TypeScript syntax
- Generate climate data files
- Ready to commit

## Workflow

### Step 1: Start New Destination (5 min)

```bash
npm run add:destination
```

This interactive script asks for:
- Destination ID, name, coordinates, timezone
- Country, region, archetype (city/beach/mountain)
- Tourism tier (1=major, 3=niche)
- 2-3 sentence summary

**Output:**
- `data-{id}-TEMPLATE.txt` — Data collection guide
- `VERIFY_{id}.md` — Verification checklist
- Links to tourism board + Booking.com

### Step 2: Collect Manual Data (30 min)

Follow `data-{id}-TEMPLATE.txt`:

1. **Tourism Calendar** (5 min)
   - Visit city's tourism board
   - List major events/festivals by month
   - Save as JSON

2. **Monthly Visitor Patterns** (5 min)
   - Research: Tourism authority or Eurostat
   - Classify each month: peak/shoulder/low
   - Save as JSON

3. **Accommodation Costs** (10 min)
   - Booking.com: Sample 5 hotels (4-star and 5-star)
   - Record nightly rates for: January, March, July, October
   - Average them, save as JSON

4. **Travel Logistics** (5 min)
   - Google Flights: Search from US East Coast (JFK → destination)
   - Record: total hours, connections, arrival ease (1-5)
   - Save as JSON

5. **Save Data File**
   ```bash
   # Create file matching template format
   cat > data-prague.json << 'EOF'
   {
     "events": {
       "1": ["New Year's Day"],
       "2": ["Carnival"],
       ...
     },
     "visitorPattern": {
       "1": "low",
       "2": "low",
       "3": "shoulder",
       ...
     },
     "costs": {
       "1": {"fourStar": 85, "fiveStar": 180},
       "3": {"fourStar": 120, "fiveStar": 280},
       "7": {"fourStar": 150, "fiveStar": 350},
       "10": {"fourStar": 110, "fiveStar": 250}
     },
     "travelHours": 14,
     "travelConnections": 1,
     "arrivalEase": 3.5
   }
   EOF
   ```

### Step 3: Verify Before Publishing (20 min)

```bash
npm run verify:destination data-prague.json
```

**Output:** Report on 4 checkpoints:
- ✓ Checkpoint A: Data freshness (all fields valid)
- ✓ Checkpoint B: Factual verification (no hallucinations)
- ✓ Checkpoint C: Consistency (ratings follow climate)
- ✓ Checkpoint D: Quality gates (summary, costs, tone)

**If verification fails:**
1. Read issues in the report
2. Fix data file (edit JSON)
3. Re-run verification
4. Repeat until all checkpoints pass

**Common fixes:**
- Missing month notes → Fill in sparse months in data file
- Hallucination detected → Review month notes for impossible events
- Suitability rating wrong → Adjust ratings to match climate
- Cost outlier → Check Booking.com again, may need re-sampling

### Step 4: Publish to Catalog (2 min)

Once verification passes:

```bash
npm run publish:destination data-prague.json
```

**What it does:**
1. Adds destination to `src/data/destinations.ts`
2. Validates TypeScript syntax
3. Backs up original file (timestamped)
4. Prints confirmation

**Next:**
```bash
npm run build:data  # Generate climate files
git add .
git commit -m "Add Prague to destination catalog"
```

## Timeline per City (Batch of 3)

| Step | Time | Notes |
|------|------|-------|
| add:destination (3×) | 15 min | Interactive, scripted |
| Data collection (3×) | 90 min | Manual, can be parallel |
| Verify (batch) | 30 min | Run 3 together, reuse context |
| Consistency check | 10 min | Automated |
| Publish (3×) | 5 min | Sequential |
| **Total** | **150 min** | **50 min per city** |

## Verification Checkpoints Explained

### Checkpoint A: Data Freshness ✓
- All required fields present (id, name, summary, travel, lodging, etc.)
- Coordinates valid (-90/+90 latitude, -180/+180 longitude)
- Costs > 0, 5-star > 4-star
- Multipliers reasonable (peak 1.2-2.0x, low 0.5-1.0x)

**Fails if:**
- ❌ Climate data not found (run `npm run build:data`)
- ❌ Missing required field
- ❌ Invalid coordinates
- ❌ Costs are zero or negative

### Checkpoint B: Factual Verification ✓
- No hallucinations (e.g., "Oktoberfest in Barcelona" is impossible)
- Month notes exist for key months (1, 4, 7, 10)
- Events match historical records
- No placeholder/hedge language ("probably", "might", "typically")

**Fails if:**
- ❌ Hallucination detected (impossible event for city/month)
- ❌ Month notes too short (< 30 chars)
- ❌ Missing month notes for key months
- ❌ Uncertain language in otherwise factual note

### Checkpoint C: Consistency Audit ✓
- Suitability ratings follow climate (peak months have higher ratings)
- Peak/shoulder/low distributed reasonably (2-4 peak, ≥1 low)
- Summary is 2-3 sentences (80-400 chars)
- Summary doesn't start with marketing copy

**Fails if:**
- ❌ Peak month marked but suitability < 3
- ❌ Low month marked but suitability > 3
- ❌ Extreme climate (< 30°F or > 95°F) but suitability > 4
- ❌ No peak or low months defined
- ❌ Summary too short/long or wrong sentence count
- ❌ Low peak multiplier (suggests peak/low not well separated)

### Checkpoint D: Quality Gates ✓
- Cost doesn't deviate > 3x from regional average
- All ratings aren't identical (not placeholder data)
- Archetype matches description (beach → coastal, etc.)
- Tone is editorial, not marketing

**Fails if:**
- ❌ Cost is 3x+ higher or 3x+ lower than region
- ❌ All experience/practicality ratings are the same
- ❌ Beach archetype but not coastal
- ❌ Coastal but beaches rating is 0

## Quality Gates (Stop Publication If)

These block publishing:
- ❌ Month note contradicts tourism board or Wikivoyage
- ❌ Hallucination (event that doesn't exist)
- ❌ Suitability completely wrong (peak in coldest month)
- ❌ Cost outlier (3×+ higher/lower than similar cities)
- ❌ Tone inconsistent with similar cities in region
- ❌ All ratings are identical (placeholder data)

## Pilot Cities (Recommended)

Start with these 3 to validate the workflow:

1. **Barcelona** (Spain)
   - Rich tourism board data
   - Clear seasonal patterns
   - Well-documented on Reddit/Wikivoyage
   - Cost data easy to sample

2. **Prague** (Czech Republic)
   - Central European archetype
   - Good tourism calendar
   - Clear peak/low distinction
   - Moderate cost tier

3. **Ljubljana** (Slovenia)
   - Smaller city, niche tourism
   - Good tourism authority
   - Alpine/continental climate
   - Tests smaller-city handling

## Troubleshooting

### "Climate data not found for {id}"
**Fix:** Run `npm run build:data` to generate climate files for all destinations (including your new one).

### "Potential hallucination detected: Oktoberfest"
**Fix:** This event is only in Munich (Germany). Remove from month notes or move to Munich entry only.

### "4-star cost is 3x+ higher than regional average"
**Fix:** Re-sample from Booking.com. May have selected luxury hotels instead of mid-range. Sample 5 hotels, average them.

### "Suitability rating doesn't match climate"
**Fix:** Compare month rating to others:
- Warmest/driest months should be peak (highest suitability)
- Coldest/wettest should be low
- Edit data file costs and visitor patterns to align

### "All ratings are identical"
**Fix:** This looks like placeholder data. Fill in real ratings:
- Food: 1-5 based on food scene quality
- Culture: 1-5 based on historical/cultural attractions
- Beaches: 0 if not coastal, 1-5 if coastal
- Nightlife: 1-5 based on bar/club scene
- Day trips: 1-5 based on nearby attractions
- Nature: 1-5 based on parks/outdoor activities
- Shopping: 1-5 based on retail scene

## Environment Variables

### Optional
- `GOOGLE_MAPS_API_KEY` — Google Maps Distance Matrix API (for ground travel time routing)
  - If not set: system uses default 45-minute estimate
  - Improves accuracy of airport-to-city-center routing

### Already Integrated (No Setup Needed)
- Open-Meteo (climate data, free, no auth)
- Nager.Date (holidays, free, no auth)

## API Documentation

### Google Maps Distance Matrix API (Optional)
- Docs: https://developers.google.com/maps/documentation/distance-matrix
- Base URL: `https://maps.googleapis.com/maps/api/distancematrix/json`
- Key: Set `GOOGLE_MAPS_API_KEY` environment variable
- Free tier: $200/month credit
- Used for: Ground travel time (airport → city center)
- **Note:** System works fine without this (uses 45-min default)

### Google Flights (Manual Lookup, No API)
- Website: https://www.google.com/flights
- No API needed — just search and record manually
- Time: 5 min per city
- Most accurate current flight data

### Open-Meteo
- Docs: https://open-meteo.com
- Base URL: `https://archive-api.open-meteo.com/v1/archive`
- No auth required, free tier available

### Nager.Date (Holidays)
- Docs: https://date.nager.at
- Base URL: `https://date.nager.at/api/v3`
- No auth required

## Examples

### Barcelona
```json
{
  "events": {
    "2": ["Festes de Santa Eulàlia"],
    "4": ["Picnic Festival"],
    "8": ["Summer festivals"]
  },
  "visitorPattern": {
    "1": "shoulder",
    "2": "shoulder",
    "3": "shoulder",
    "4": "peak",
    "5": "peak",
    "6": "peak",
    "7": "peak",
    "8": "peak",
    "9": "shoulder",
    "10": "shoulder",
    "11": "low",
    "12": "shoulder"
  },
  "costs": {
    "1": {"fourStar": 120, "fiveStar": 320},
    "3": {"fourStar": 140, "fiveStar": 380},
    "7": {"fourStar": 180, "fiveStar": 480},
    "10": {"fourStar": 160, "fiveStar": 420}
  },
  "travelHours": 12,
  "travelConnections": 1,
  "arrivalEase": 4
}
```

### Prague
```json
{
  "events": {
    "4": ["Easter markets"],
    "5": ["Prague Spring Festival"],
    "12": ["Christmas markets"]
  },
  "visitorPattern": {
    "1": "low",
    "2": "low",
    "3": "shoulder",
    "4": "peak",
    "5": "peak",
    "6": "peak",
    "7": "peak",
    "8": "peak",
    "9": "shoulder",
    "10": "shoulder",
    "11": "low",
    "12": "shoulder"
  },
  "costs": {
    "1": {"fourStar": 85, "fiveStar": 180},
    "3": {"fourStar": 100, "fiveStar": 220},
    "7": {"fourStar": 130, "fiveStar": 300},
    "10": {"fourStar": 110, "fiveStar": 240}
  },
  "travelHours": 14,
  "travelConnections": 1,
  "arrivalEase": 3.5
}
```

## Next Steps

1. **Verify Kiwi.com API access:**
   ```bash
   echo $KIWI_API_KEY  # Should print your API key
   ```

2. **Try pilot with Barcelona:**
   ```bash
   npm run add:destination
   # Follow prompts, then fill data-barcelona.json
   npm run verify:destination data-barcelona.json
   npm run publish:destination data-barcelona.json
   ```

3. **Once confident, scale to more cities:**
   - Batch 3 cities at a time
   - Re-verify with VERIFY_*.md checklist
   - Publish one by one or in batch

---

**Quality First:** Every destination in this catalog is editorial. Publication gates ensure no hallucinations, cost outliers, or inconsistencies make it to production. The 60-minute-per-city workflow is justified by the rigor.
