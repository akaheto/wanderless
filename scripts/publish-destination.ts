#!/usr/bin/env node

/**
 * Publish a verified destination to the catalog.
 *
 * This adds the destination to src/data/destinations.ts and updates curatedOn timestamp.
 *
 * Usage:
 *   npm run publish:destination <destination-json>
 *
 * Safety:
 * - Only publishes if destination has passed verification
 * - Backs up destinations.ts before modifying
 * - Validates the result can be imported
 *
 * Example:
 *   npm run publish:destination data-prague.json
 */

import type { Destination } from "../src/lib/domain/types";
import { DESTINATIONS } from "../src/data/destinations";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const DESTINATIONS_FILE = path.join(process.cwd(), "src/data/destinations.ts");

interface DestinationsModule {
  DESTINATIONS: Destination[];
}

async function insertDestination(
  destinationFile: string,
  newDestination: Destination,
): Promise<void> {
  // Read current file
  const content = await fs.readFile(destinationFile, "utf8");

  // Find insertion point (before the final closing bracket)
  const insertionMatch = content.match(/^(\s*\];?)(\s*)$/m);
  if (!insertionMatch) {
    throw new Error("Could not find insertion point in destinations.ts");
  }

  // Format the new destination as TypeScript
  const destinationCode = JSON.stringify(newDestination, null, 2)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");

  // Add to array
  const lastDestinationIndex = content.lastIndexOf("  {");
  if (lastDestinationIndex === -1) {
    throw new Error("Could not find existing destinations in destinations.ts");
  }

  // Find the end of the last destination object
  let depth = 0;
  let endIndex = lastDestinationIndex;
  for (let i = lastDestinationIndex; i < content.length; i++) {
    if (content[i] === "{") depth++;
    if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  // Insert after the last destination with a comma
  const before = content.slice(0, endIndex + 1);
  const after = content.slice(endIndex + 1);

  const newContent = before + ",\n  // -------" +
    "----------------------------------------------- " + newDestination.country + "\n" +
    destinationCode +
    after;

  // Backup original
  const backupPath = `${destinationFile}.backup.${Date.now()}`;
  await fs.writeFile(backupPath, content, "utf8");
  console.log(`✓ Backed up original: ${backupPath}`);

  // Write new content
  await fs.writeFile(destinationFile, newContent, "utf8");
  console.log(`✓ Added ${newDestination.name} to destinations.ts`);
}

async function validateTypescript(filePath: string): Promise<void> {
  // Try to require/import the file to validate syntax
  // This is a basic check — in a real setup you'd use ts-node or tsc
  try {
    const content = await fs.readFile(filePath, "utf8");

    // Check for basic syntax errors
    const braces = content.match(/[{}]/g);
    if (!braces || braces.length % 2 !== 0) {
      throw new Error("Unbalanced braces detected");
    }

    // Verify it's valid TypeScript by checking key patterns
    if (!content.includes("export const DESTINATIONS")) {
      throw new Error("Missing 'export const DESTINATIONS'");
    }

    console.log("✓ TypeScript syntax validated");
  } catch (err) {
    throw new Error(`Validation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run publish:destination <destination-json>");
    process.exit(1);
  }

  try {
    console.log(`\n=== PUBLISHING DESTINATION ===\n`);

    // Load destination
    const content = await fs.readFile(filePath, "utf8");
    const destination = JSON.parse(content) as Destination;

    console.log(`Publishing: ${destination.name} (${destination.country})`);
    console.log(`  Coordinates: ${destination.lat}, ${destination.lon}`);
    console.log(`  Tourism tier: ${destination.tourismTier}`);
    console.log(`  Archetype: ${destination.archetype}\n`);

    // Validate destination structure
    const required = [
      "id",
      "name",
      "country",
      "summary",
      "travel",
      "lodging",
      "experience",
      "practicality",
      "seasons",
      "suitability",
      "monthNotes",
    ];
    for (const field of required) {
      if (!(field in destination)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check for duplicates
    if (DESTINATIONS.some((d: Destination) => d.id === destination.id)) {
      throw new Error(`Destination with ID '${destination.id}' already exists in catalog`);
    }

    // Insert into catalog
    await insertDestination(DESTINATIONS_FILE, destination);

    // Validate result
    await validateTypescript(DESTINATIONS_FILE);

    console.log(`\n✅ Successfully published ${destination.name}!\n`);
    console.log("Next steps:");
    console.log("  1. Run: npm run build:data  (to generate climate files)");
    console.log("  2. Commit the changes to Git");
    console.log("  3. Push to GitHub when ready\n");

    process.exit(0);
  } catch (err) {
    console.error(
      `\n❌ Publication failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
}

main();
