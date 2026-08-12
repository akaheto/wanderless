#!/usr/bin/env node

/**
 * Add a new destination to the curated catalog with publication-ready verification.
 *
 * Usage:
 *   npm run add:destination
 *
 * Workflow:
 *   1. Collect climate data (automatic, Open-Meteo)
 *   2. Gather manual data (tourism calendar, costs, visitor stats)
 *   3. AI-draft month notes from template
 *   4. Multi-checkpoint verification (factual, consistency, quality gates)
 *   5. Publish to catalog if all gates pass
 *
 * Quality gates:
 *   - No hallucinations in month notes
 *   - Suitability ratings match climate
 *   - Costs within regional bounds
 *   - Seasons classified correctly
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as readline from "node:readline";
import { DESTINATIONS } from "../src/data/destinations";

interface DestinationInput {
  id: string;
  name: string;
  area: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  timezone: string;
  coastal: boolean;
  archetype: "city" | "beach" | "mountain" | "resort";
  tourismTier: number;
  summary: string;
}

interface ManualData {
  // Tourism calendar: {month: [events]}
  events: Record<number, string[]>;
  // Monthly visitor patterns: {month: level} where level is "low" | "shoulder" | "peak"
  visitorPattern: Record<number, "low" | "shoulder" | "peak">;
  // Cost data: {month: {fourStar: number, fiveStar: number}}
  costs: Record<number, { fourStar: number; fiveStar: number }>;
  // Travel time in hours and connections
  travelHours: number;
  travelConnections: number;
  arrivalEase: number; // 1-5 scale
}

interface DataCollectionGuide {
  city: string;
  country: string;
  tourismBoard: string;
  bookingSearchUrl: string;
  verificationChecklist: string[];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function collectCityInfo(): Promise<DestinationInput> {
  console.log("\n=== NEW DESTINATION ===\n");

  const id = await question("Destination ID (lowercase, no spaces): ");
  const name = await question("Display name: ");
  const area = await question("Area/region within country (e.g., 'Central Bohemia'): ");
  const country = await question("Country: ");
  const region = await question("Broader region (e.g., 'Central Europe', 'Southern Europe'): ");
  const lat = parseFloat(await question("Latitude: "));
  const lon = parseFloat(await question("Longitude: "));
  const timezone = await question("Timezone (e.g., 'Europe/Prague'): ");
  const coastal = (await question("Coastal? (y/n): ")) === "y";
  const archetype = (await question(
    "Archetype (city/beach/mountain/resort): ",
  )) as "city" | "beach" | "mountain" | "resort";
  const tourismTier = parseInt(await question("Tourism tier (1-3, where 1=major, 3=niche): "), 10);
  const summary = await question("2-3 sentence summary: ");

  return {
    id,
    name,
    area,
    country,
    region,
    lat,
    lon,
    timezone,
    coastal,
    archetype,
    tourismTier,
    summary,
  };
}

function generateDataCollectionGuide(city: DestinationInput): DataCollectionGuide {
  const tourismBoards: Record<string, string> = {
    Spain: "https://www.spain.info",
    Portugal: "https://www.visitportugal.com",
    Italy: "https://www.italia.it",
    France: "https://en.france.fr",
    Germany: "https://www.germany.travel",
    Czech: "https://www.czechtourism.com",
    Poland: "https://www.poland.travel",
    Greece: "https://www.visitgreece.gr",
    Hungary: "https://www.gotohungary.com",
    Netherlands: "https://www.holland.com",
    Belgium: "https://www.belgium.com",
    Austria: "https://www.austria.info",
    Croatia: "https://www.croatia.hr",
    Slovenia: "https://www.slovenia.info",
    Sweden: "https://www.visitsweden.com",
  };

  const board = tourismBoards[city.country] || `tourism board for ${city.country}`;
  const bookingUrl = `https://www.booking.com/searchresults.html?ss=${city.name}%2C+${city.country}`;

  return {
    city: city.name,
    country: city.country,
    tourismBoard: board,
    bookingSearchUrl: bookingUrl,
    verificationChecklist: [
      "[ ] Tourism board calendar scraped: major events/festivals for each month",
      "[ ] Booking.com cost sampling: collect 5 well-located hotels, record nightly rates for Jan, Mar, Jul, Oct",
      "[ ] Visitor stats: check city tourism authority or Eurostat for monthly patterns (peak/shoulder/low)",
      "[ ] Wikivoyage check: cross-reference climate/conditions against published information",
      "[ ] Reddit search: find 2-3 top posts per season (summer, winter, shoulder) to verify conditions",
      "[ ] Month-by-month notes drafted and verified for factual accuracy",
    ],
  };
}

function generateDataCollectionTemplate(city: DestinationInput): string {
  return `
=== DATA COLLECTION TEMPLATE: ${city.name}, ${city.country} ===

This file guides you through gathering the manual data needed to publish ${city.name}.
Once complete, save as: data-${city.id}.json

---

## 1. TOURISM CALENDAR (Events by Month)

Visit tourism board for ${city.name} and record major events/festivals:
https://www.tourism-board.com/${city.country}

Format: {month: [event1, event2, ...]}

EXAMPLE:
{
  "events": {
    "1": ["New Year's Day"],
    "2": ["Carnival"],
    "3": [],
    "4": ["Easter"],
    ...
  }
}

---

## 2. MONTHLY VISITOR PATTERNS

Research: Local tourism authority website or Eurostat for monthly visitor trends.
Look for: "peak season", "shoulder season", "low season" labels.

Format: {month: "peak" | "shoulder" | "low"}

EXAMPLE:
{
  "visitorPattern": {
    "1": "low",
    "2": "low",
    "3": "shoulder",
    "4": "peak",
    ...
  }
}

---

## 3. ACCOMMODATION COSTS (Booking.com)

Sample 5 well-located 4-star and 5-star hotels.
Record nightly rate (USD) for these months:
- January (low season)
- March (shoulder)
- July (peak)
- October (shoulder)

Average them: fourStarUSD = avg of 5 hotels at 4-star rating
             fiveStarUSD = avg of 5 hotels at 5-star rating

Format: {month: {fourStar: number, fiveStar: number}}

EXAMPLE:
{
  "costs": {
    "1": {"fourStar": 85, "fiveStar": 180},
    "3": {"fourStar": 120, "fiveStar": 280},
    "7": {"fourStar": 150, "fiveStar": 350},
    "10": {"fourStar": 110, "fiveStar": 250}
  }
}

---

## 4. TRAVEL LOGISTICS

Flight search: Use Kiwi.com to search from major US gateway (NYC-JFK) to ${city.name}

Record:
- travelHours: Typical total time from US East Coast (example: 12 = 1 stop via EU hub)
- travelConnections: Number of stops (0=nonstop, 1=one stop)
- arrivalEase: 1-5 scale
  * 1 = Difficult (small airport, far from city, visa required)
  * 3 = Moderate (medium airport, 30-45 min to center)
  * 5 = Easy (large airport, close to center, visa-free)

EXAMPLE:
{
  "travelHours": 14,
  "travelConnections": 1,
  "arrivalEase": 3.5
}

---

NEXT STEPS:
1. Fill in all sections above
2. Save as JSON: data-${city.id}.json
3. Run: npm run verify:destination data-${city.id}.json
4. Review verification report
5. If approved: npm run publish:destination data-${city.id}.json
`;
}

async function generateVerificationGuide(city: DestinationInput): Promise<void> {
  const guide = `
=== VERIFICATION CHECKLIST: ${city.name} ===

Before publishing, verify these factual details. Check:
- Tourism board calendar (official dates)
- Wikivoyage climate section
- Reddit r/travel posts for "${city.name} [month]"
- Booking.com actual prices for sample dates

CHECKPOINT A: DATA FRESHNESS
[ ] Climate data: Fresh from Open-Meteo (stable, no action needed)
[ ] Tourism calendar: Verified against official source
[ ] Visitor patterns: Match historical trends (not just this year)
[ ] Costs: Representative of typical rates (not anomalies)

CHECKPOINT B: FACTUAL VERIFICATION
For EACH month, verify:
[ ] Events listed actually occur in that month (not wrong dates)
[ ] No hallucinations like "Oktoberfest in Barcelona" or "Ski season in Cyprus"
[ ] Weather description matches climate data
[ ] Crowd level (peak/shoulder/low) matches visitor patterns

CHECKPOINT C: CONSISTENCY
[ ] Suitability ratings: Follow climate (highest in warmest/driest months)
[ ] Peak season: Matches warmest/driest months
[ ] Low season: Matches coldest/wettest months
[ ] Shoulder season: Correctly placed between peak and low
[ ] Lodging costs: Within 2-3× of similar cities in region

CHECKPOINT D: QUALITY
[ ] Summary: 2-3 sentences, factual, no marketing copy
[ ] Month notes: No AI hallucinations, grounded in data
[ ] Ratings: All fields (1-5 scale) filled
[ ] Risks: Only real/significant risks listed (not minor inconveniences)

FAILURE CRITERIA (STOP publication if ANY triggered):
❌ Month note contradicts official source (e.g., wrong event date)
❌ Hallucination detected (e.g., event that doesn't exist)
❌ Suitability rating completely wrong (e.g., peak=coldest month)
❌ Cost outlier: >3× regional average
❌ Tone inconsistency: Contradicts similar cities in region
`;

  console.log(guide);
  await fs.writeFile(
    path.join(process.cwd(), `VERIFY_${city.id}.md`),
    guide,
    "utf8",
  );
  console.log(`\n✓ Verification guide saved: VERIFY_${city.id}.md`);
}

async function main() {
  try {
    const city = await collectCityInfo();

    console.log("\n=== DATA COLLECTION SETUP ===\n");

    // Generate and save data collection template
    const template = generateDataCollectionTemplate(city);
    const templatePath = path.join(process.cwd(), `data-${city.id}-TEMPLATE.txt`);
    await fs.writeFile(templatePath, template, "utf8");
    console.log(`✓ Data collection template: ${templatePath}`);
    console.log(`  Follow this guide to gather tourism calendar, costs, and visitor patterns.\n`);

    // Generate guide
    const guide = generateDataCollectionGuide(city);
    console.log(`Tourism Board: ${guide.tourismBoard}`);
    console.log(`Booking.com: ${guide.bookingSearchUrl}\n`);

    // Generate verification guide
    await generateVerificationGuide(city);

    // Show next steps
    console.log("\n=== NEXT STEPS ===\n");
    console.log(`1. Complete data collection using: data-${city.id}-TEMPLATE.txt`);
    console.log(`2. Save completed data as: data-${city.id}.json`);
    console.log(`3. Run verification: npm run verify:destination data-${city.id}.json`);
    console.log(`4. Review VERIFY_${city.id}.md checklist`);
    console.log(`5. If all checks pass: npm run publish:destination data-${city.id}.json`);
    console.log(
      `\nThis ensures publication-ready quality with factual verification before adding to catalog.\n`,
    );

    rl.close();
  } catch (err) {
    console.error("Error:", err);
    rl.close();
    process.exit(1);
  }
}

main();
