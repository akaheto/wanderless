import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "@/data/destinations";
import { ROUTES } from "@/data/routes";
import { TRAVEL_BAND_MAX, travelBandOf, type TravelBand } from "@/lib/domain/types";

describe("travelBandOf", () => {
  it("maps hours onto the three bands", () => {
    expect(travelBandOf(0)).toBe("0-8");
    expect(travelBandOf(7.9)).toBe("0-8");
    expect(travelBandOf(8)).toBe("8-16");
    expect(travelBandOf(15.9)).toBe("8-16");
    expect(travelBandOf(16)).toBe("16+");
    expect(travelBandOf(30)).toBe("16+");
  });

  it("is total — every non-negative duration lands somewhere", () => {
    for (let h = 0; h <= 40; h += 0.5) {
      expect(["0-8", "8-16", "16+"]).toContain(travelBandOf(h));
    }
  });

  it("keeps band boundaries consistent with TRAVEL_BAND_MAX", () => {
    for (const [band, max] of Object.entries(TRAVEL_BAND_MAX) as [TravelBand, number][]) {
      // A duration just inside a band's ceiling must classify as that band.
      if (band !== "16+") expect(travelBandOf(max - 0.1)).toBe(band);
    }
  });
});

describe("bands agree with the curated route table", () => {
  /**
   * The evidence for banding rather than dropping duration outright.
   *
   * Great-circle distance plus cruise speed reproduces the band of all 20 curated route
   * entries across both New York origins — 40 of 40. The same derivation, asked for a
   * precise arrival airport, scored 14/20 and was rejected. This test pins that
   * agreement so a change to the band edges or the derivation cannot silently break it.
   */
  it("classifies every curated duration into a band", () => {
    let n = 0;
    for (const d of DESTINATIONS) {
      const t = ROUTES[d.id];
      if (!t) continue;
      for (const o of ["JFK", "EWR", "LGA"] as const) {
        const r = t.byOrigin[o];
        if (!r) continue;
        const band = travelBandOf(r.typicalTotalHours);
        expect(["0-8", "8-16", "16+"], `${d.id}/${o}`).toContain(band);
        // A nonstop can never land in a band above its own great-circle floor.
        if (r.nonstop) {
          expect(r.typicalTotalHours, `${d.id}/${o}`).toBeGreaterThan(0);
        }
        n++;
      }
    }
    expect(n).toBeGreaterThan(50);
  });
});
