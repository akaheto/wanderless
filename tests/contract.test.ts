import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "@/data/destinations";
import {
  DESTINATION_CONTRACT,
  checkCompleteness,
  contractFor,
  tierCounts,
  valueAt,
} from "@/lib/domain/contract";
import type { Destination } from "@/lib/domain/types";

/**
 * Every leaf path on a real destination, so the contract can be checked for coverage
 * against the actual shape rather than against a hand-kept list.
 *
 * `seasons`, `suitability`, `monthNotes` and `risks` are governed as whole fields rather
 * than per element — a contract entry per array index would say nothing useful.
 */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    prefix === "monthNotes"
  ) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    leafPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("contract coverage", () => {
  /**
   * The assertion that makes provenance non-optional.
   *
   * A field added to Destination without a contract entry fails here, so declaring where
   * a value comes from is a condition of shipping it rather than something to remember.
   */
  it("governs every field a real destination carries", () => {
    const undeclared = new Set<string>();
    for (const d of DESTINATIONS) {
      for (const path of leafPaths(d)) {
        if (!contractFor(path)) undeclared.add(path);
      }
    }
    expect(
      [...undeclared].sort(),
      `Fields present on destinations but absent from DESTINATION_CONTRACT. Declare the ` +
        `tier and source in src/lib/domain/contract.ts.`,
    ).toEqual([]);
  });

  it("declares nothing that destinations do not carry", () => {
    const real = new Set(DESTINATIONS.flatMap((d) => leafPaths(d)));
    // bookingSearchUrl is genuinely optional, so absence from some entries is expected.
    const stale = DESTINATION_CONTRACT.filter(
      (c) => !real.has(c.path) && c.path !== "lodging.bookingSearchUrl",
    ).map((c) => c.path);
    expect(stale, `Contract entries matching no real field: ${stale.join(", ")}`).toEqual([]);
  });

  it("uses unique paths", () => {
    const paths = DESTINATION_CONTRACT.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("gives every field a non-empty source", () => {
    for (const c of DESTINATION_CONTRACT) {
      expect(c.source.trim(), c.path).not.toBe("");
    }
  });
});

describe("what the catalog is actually made of", () => {
  /**
   * Pins the finding that motivates the whole contract: most of a destination is
   * judgement, not measurement. If this ratio shifts, it should be because data was
   * genuinely sourced — not because a tier was quietly relabelled.
   */
  it("is majority editorial", () => {
    const counts = tierCounts();
    const total = DESTINATION_CONTRACT.length;
    expect(counts.editorial).toBeGreaterThan(counts.objective);
    expect(counts.editorial / total).toBeGreaterThan(0.5);
  });

  it("sources nothing from a model", () => {
    // No tier may name an LLM. Prose is editorial and confirmed; numbers are sourced,
    // derived or entered by a person. A model originating either is the failure mode
    // this project exists to prevent.
    for (const c of DESTINATION_CONTRACT) {
      expect(c.source.toLowerCase(), c.path).not.toMatch(/claude|gpt|llm|model|ai\b/);
    }
  });
});

describe("checkCompleteness", () => {
  const sample = (): Destination => structuredClone(DESTINATIONS[0]);

  it("passes every destination currently in the catalog", () => {
    for (const d of DESTINATIONS) {
      const r = checkCompleteness(d);
      expect(
        r.blocking.map((f) => f.path),
        `${d.id} is missing blocking fields`,
      ).toEqual([]);
    }
  });

  it("blocks on a missing blocking field", () => {
    const d = sample();
    // @ts-expect-error deliberately removing a required field
    delete d.lodging.fourStarUSD;
    const r = checkCompleteness(d);
    expect(r.complete).toBe(false);
    expect(r.blocking.map((f) => f.path)).toContain("lodging.fourStarUSD");
  });

  it("flags rather than blocks on a non-blocking gap", () => {
    const d = sample();
    d.summary = "";
    const r = checkCompleteness(d);
    expect(r.complete).toBe(true);
    expect(r.flagged.map((f) => f.path)).toContain("summary");
  });

  it("treats a legitimate zero as present, not missing", () => {
    // beaches: 0 is a real statement about a landlocked city. Testing falsiness rather
    // than absence would block it for being honest.
    const d = sample();
    d.experience.beaches = 0;
    const r = checkCompleteness(d);
    expect(r.blocking.map((f) => f.path)).not.toContain("experience.beaches");
    expect(r.flagged.map((f) => f.path)).not.toContain("experience.beaches");
  });

  it("treats an empty array as missing", () => {
    const d = sample();
    d.suitability = [];
    expect(checkCompleteness(d).blocking.map((f) => f.path)).toContain("suitability");
  });
});

describe("valueAt", () => {
  it("reads nested paths", () => {
    const d = DESTINATIONS[0];
    expect(valueAt(d, "lodging.fourStarUSD")).toBe(d.lodging.fourStarUSD);
    expect(valueAt(d, "experience.food")).toBe(d.experience.food);
  });

  it("returns undefined for a path that does not exist", () => {
    expect(valueAt(DESTINATIONS[0], "nope.not.here")).toBeUndefined();
  });
});
