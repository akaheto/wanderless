#!/usr/bin/env node

/**
 * Verify a destination before publishing to catalog.
 *
 * Checkpoints:
 * A. Data freshness: All data sources current and valid
 * B. Factual verification: Month notes match sources, no hallucinations
 * C. Consistency audit: Ratings follow climate, seasons classified correctly
 * D. Quality gates: Final publication checks
 *
 * Usage:
 *   npx ts-node scripts/verify-destination.ts <destination-json>
 *
 * Example:
 *   npm run verify:destination data-prague.json
 */

import type { Destination } from "../src/lib/domain/types";
import { CLIMATE_RECORDS } from "../src/data/generated/climate-index";
import { DESTINATIONS } from "../src/data/destinations";
import * as fs from "node:fs/promises";

interface VerificationReport {
  destination: string;
  timestamp: string;
  checkpointA: { pass: boolean; issues: string[] };
  checkpointB: { pass: boolean; issues: string[] };
  checkpointC: { pass: boolean; issues: string[] };
  checkpointD: { pass: boolean; issues: string[] };
  canPublish: boolean;
  failureReasons: string[];
}

const HALLUCINATION_PATTERNS = [
  { pattern: /Oktoberfest/i, cities: ["barcelona", "madrid", "lisbon", "rome", "athens", "budapest", "krakow", "prague"] },
  { pattern: /Carnival/i, cities: ["paris", "london", "amsterdam", "berlin"] },
  { pattern: /Ski(?![\s-]*Pass)/i, cities: ["athens", "lisbon", "seville", "rome", "barcelona"] },
  { pattern: /Aurora|Northern Lights/i, cities: /^(?!.*(?:tromso|reykjavik|rovaniemi|tampere))/ },
];

async function checkpointA(destination: Destination, report: VerificationReport): Promise<void> {
  const issues: string[] = [];

  // Climate data exists
  if (!CLIMATE_RECORDS[destination.id]) {
    issues.push("Climate data not found. Run: npm run build:data");
  }

  // All required fields present
  const requiredFields = [
    "id",
    "name",
    "country",
    "lat",
    "lon",
    "summary",
    "travel",
    "lodging",
    "seasons",
    "suitability",
    "monthNotes",
  ];
  for (const field of requiredFields) {
    if (!(field in destination)) {
      issues.push(`Missing field: ${field}`);
    }
  }

  // Coordinates valid
  if (destination.lat < -90 || destination.lat > 90) {
    issues.push(`Invalid latitude: ${destination.lat}`);
  }
  if (destination.lon < -180 || destination.lon > 180) {
    issues.push(`Invalid longitude: ${destination.lon}`);
  }

  // Cost data valid
  if (destination.lodging.fourStarUSD <= 0 || destination.lodging.fiveStarUSD <= 0) {
    issues.push("Invalid lodging costs (must be > 0)");
  }
  if (destination.lodging.fiveStarUSD <= destination.lodging.fourStarUSD) {
    issues.push("5-star cost must be higher than 4-star");
  }

  // Multipliers valid
  if (destination.lodging.peakMultiplier < 0.8 || destination.lodging.peakMultiplier > 2) {
    issues.push(`Suspicious peak multiplier: ${destination.lodging.peakMultiplier}`);
  }
  if (destination.lodging.lowMultiplier < 0.5 || destination.lodging.lowMultiplier > 1.2) {
    issues.push(`Suspicious low multiplier: ${destination.lodging.lowMultiplier}`);
  }

  report.checkpointA = { pass: issues.length === 0, issues };
}

async function checkpointB(destination: Destination, report: VerificationReport): Promise<void> {
  const issues: string[] = [];

  // Check for hallucinations
  const hallucPatterns = HALLUCINATION_PATTERNS.filter((h) => {
    if (h.cities instanceof RegExp) {
      return h.cities.test(destination.id.toLowerCase());
    }
    return h.cities.includes(destination.id.toLowerCase());
  });

  for (const month in destination.monthNotes) {
    const note = destination.monthNotes[month];
    if (typeof note !== "string") continue;

    // Check for hallucinations
    for (const h of hallucPatterns) {
      if (h.pattern.test(note)) {
        issues.push(
          `Potential hallucination in month ${month}: "${h.pattern.source}" (unlikely for ${destination.name})`,
        );
      }
    }

    // Check for specific red flags
    if (/\b(probably|maybe|might|could|typically)\b/i.test(note) && note.length < 100) {
      issues.push(`Month ${month} note is too uncertain (contains hedging language)`);
    }

    if (note.length < 30) {
      issues.push(`Month ${month} note is too short (< 30 chars)`);
    }
  }

  // Verify month notes exist for all 12 months (at minimum for key months)
  const keyMonths = [1, 4, 7, 10]; // Jan, Apr, Jul, Oct as minimum
  for (const m of keyMonths) {
    if (!destination.monthNotes[m]) {
      issues.push(`Missing month note for month ${m}`);
    }
  }

  report.checkpointB = { pass: issues.length === 0, issues };
}

async function checkpointC(destination: Destination, report: VerificationReport): Promise<void> {
  const issues: string[] = [];
  const climate = CLIMATE_RECORDS[destination.id];

  if (!climate) {
    issues.push("Cannot verify consistency without climate data");
    report.checkpointC = { pass: false, issues };
    return;
  }

  // Verify suitability matches climate
  const suitScores = destination.suitability;
  const climateMonths = climate.monthly;

  for (let m = 0; m < 12; m++) {
    const suit = suitScores[m];
    const c = climateMonths[m];

    const avgTemp = (c.highF + c.lowF) / 2;
    const isComfortable = avgTemp >= 55 && avgTemp <= 85;
    const isDry = c.rainDays < 10;

    // Peak season should have higher suitability
    const isPeak = destination.seasons[m] === "peak";
    const isLow = destination.seasons[m] === "low";

    if (isPeak && suit < 3) {
      issues.push(`Month ${m + 1} marked as peak but suitability is only ${suit}`);
    }
    if (isLow && suit > 3) {
      issues.push(`Month ${m + 1} marked as low but suitability is ${suit}`);
    }

    // Extreme climates should have low suitability
    if (avgTemp < 30 || avgTemp > 95) {
      if (suit > 4) {
        issues.push(
          `Month ${m + 1} has extreme temperature (${avgTemp}°F avg) but suitability is ${suit}`,
        );
      }
    }
  }

  // Verify peak/shoulder/low are distributed reasonably
  const peaks = destination.seasons.filter((s) => s === "peak").length;
  const lows = destination.seasons.filter((s) => s === "low").length;

  if (peaks > 6) {
    issues.push(`Too many peak months (${peaks}) — should be 2-4`);
  }
  if (peaks === 0) {
    issues.push("No peak months defined");
  }
  if (lows === 0) {
    issues.push("No low months defined");
  }

  // Check for cost consistency with visitor patterns
  // Peak months should typically have higher costs
  const peakMonths = destination.seasons
    .map((s, i) => (s === "peak" ? i + 1 : null))
    .filter((m) => m !== null) as number[];

  if (peakMonths.length > 0 && destination.lodging.peakMultiplier < 1.1) {
    issues.push(`Low peak multiplier (${destination.lodging.peakMultiplier}) suggests peak/low not well separated`);
  }

  // Summary should be 2-3 sentences, 80-300 chars
  const summaryLength = destination.summary.length;
  if (summaryLength < 80) {
    issues.push(`Summary too short (${summaryLength} chars, should be 80-300)`);
  }
  if (summaryLength > 400) {
    issues.push(`Summary too long (${summaryLength} chars, should be 80-300)`);
  }

  const sentenceCount = (destination.summary.match(/\./g) || []).length;
  if (sentenceCount < 2 || sentenceCount > 4) {
    issues.push(`Summary should have 2-3 sentences, has ${sentenceCount}`);
  }

  report.checkpointC = { pass: issues.length === 0, issues };
}

async function checkpointD(destination: Destination, report: VerificationReport): Promise<void> {
  const issues: string[] = [];

  // Compare with existing destinations in same region
  const regional = DESTINATIONS.filter((d) => d.region === destination.region);

  if (regional.length > 0) {
    const avgFourStar = regional.reduce((sum, d) => sum + d.lodging.fourStarUSD, 0) / regional.length;
    const avgFiveStar = regional.reduce((sum, d) => sum + d.lodging.fiveStarUSD, 0) / regional.length;

    // Check for major outliers (> 3x or < 0.33x)
    if (destination.lodging.fourStarUSD > avgFourStar * 3 || destination.lodging.fourStarUSD < avgFourStar / 3) {
      issues.push(
        `4-star cost (${destination.lodging.fourStarUSD}) is an outlier for region (avg: ${Math.round(avgFourStar)})`,
      );
    }
    if (destination.lodging.fiveStarUSD > avgFiveStar * 3 || destination.lodging.fiveStarUSD < avgFiveStar / 3) {
      issues.push(
        `5-star cost (${destination.lodging.fiveStarUSD}) is an outlier for region (avg: ${Math.round(avgFiveStar)})`,
      );
    }
  }

  // Verify no obviously fake data (all ratings the same)
  const allRatings = [
    ...Object.values(destination.experience),
    ...Object.values(destination.practicality),
  ];
  const uniqueRatings = new Set(allRatings).size;
  if (uniqueRatings === 1) {
    issues.push("All ratings are identical — this looks like placeholder data");
  }

  // Check archetype matches description
  if (destination.archetype === "beach" && !destination.coastal) {
    issues.push("Archetype is 'beach' but coastal flag is false");
  }
  if (destination.coastal && destination.archetype !== "beach" && destination.experience.beaches === 0) {
    issues.push("Coastal destination but beaches rating is 0");
  }

  report.checkpointD = { pass: issues.length === 0, issues };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx ts-node scripts/verify-destination.ts <destination-json>");
    process.exit(1);
  }

  try {
    const content = await fs.readFile(filePath, "utf8");
    const destination = JSON.parse(content) as Destination;

    console.log(`\n=== VERIFICATION REPORT: ${destination.name} ===\n`);

    const report: VerificationReport = {
      destination: destination.name,
      timestamp: new Date().toISOString(),
      checkpointA: { pass: false, issues: [] },
      checkpointB: { pass: false, issues: [] },
      checkpointC: { pass: false, issues: [] },
      checkpointD: { pass: false, issues: [] },
      canPublish: false,
      failureReasons: [],
    };

    // Run all checkpoints
    console.log("Checkpoint A: Data Freshness...");
    await checkpointA(destination, report);
    console.log(`  ${report.checkpointA.pass ? "✓" : "✗"} ${report.checkpointA.issues.length} issue${report.checkpointA.issues.length === 1 ? "" : "s"}`);

    console.log("Checkpoint B: Factual Verification...");
    await checkpointB(destination, report);
    console.log(`  ${report.checkpointB.pass ? "✓" : "✗"} ${report.checkpointB.issues.length} issue${report.checkpointB.issues.length === 1 ? "" : "s"}`);

    console.log("Checkpoint C: Consistency Audit...");
    await checkpointC(destination, report);
    console.log(`  ${report.checkpointC.pass ? "✓" : "✗"} ${report.checkpointC.issues.length} issue${report.checkpointC.issues.length === 1 ? "" : "s"}`);

    console.log("Checkpoint D: Quality Gates...");
    await checkpointD(destination, report);
    console.log(`  ${report.checkpointD.pass ? "✓" : "✗"} ${report.checkpointD.issues.length} issue${report.checkpointD.issues.length === 1 ? "" : "s"}\n`);

    // Determine if can publish
    report.canPublish = report.checkpointA.pass && report.checkpointB.pass && report.checkpointC.pass && report.checkpointD.pass;

    // Report all issues
    if (!report.canPublish) {
      console.log("=== ISSUES FOUND ===\n");
      const checkpoints: [string, { pass: boolean; issues: string[] }][] = [
        ["A: Data Freshness", report.checkpointA],
        ["B: Factual Verification", report.checkpointB],
        ["C: Consistency", report.checkpointC],
        ["D: Quality", report.checkpointD],
      ];
      for (const [name, checkpoint] of checkpoints) {
        if (!checkpoint.pass) {
          console.log(`${name}:`);
          checkpoint.issues.forEach((issue: string) => console.log(`  ✗ ${issue}`));
          console.log();
        }
      }
      console.log("❌ Cannot publish — fix issues above.\n");
      process.exit(1);
    } else {
      console.log("✅ All checkpoints passed. Destination is publication-ready.\n");
      console.log("Next step: npm run publish:destination <file>\n");
      process.exit(0);
    }
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
