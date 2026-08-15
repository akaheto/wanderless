import { describe, expect, it } from "vitest";
import {
  MAX_SPOTS,
  MIN_SPOTS,
  byCorroboration,
  checkSpots,
  corroboration,
  validateSpot,
} from "@/lib/domain/spots";
import type { InfluencerSpot, SpotCitation } from "@/lib/domain/types";

const cite = (o: Partial<SpotCitation> = {}): SpotCitation => ({
  platform: "youtube",
  url: "https://youtube.com/watch?v=abc123",
  seenOn: "2026-08-15",
  ...o,
});

const spot = (o: Partial<InfluencerSpot> = {}): InfluencerSpot => ({
  name: "Fem små hus",
  type: "restaurant",
  description: "Cellar restaurant in the old town.",
  citations: [cite()],
  ...o,
});

describe("a spot cannot exist without evidence", () => {
  /**
   * The assertion the whole feature rests on. Everything else can change — which
   * platforms are read, how ranking works, who writes the prose — without weakening it.
   */
  it("rejects a spot with no citations", () => {
    const errors = validateSpot(spot({ citations: [] }));
    expect(errors.join(" ")).toContain("no citation");
  });

  it("says why, in terms a person can act on", () => {
    const errors = validateSpot(spot({ name: "Invented Bar", citations: [] }));
    expect(errors[0]).toContain("Invented Bar");
    expect(errors[0]).toContain("indistinguishable from an invented one");
  });

  it("rejects a citation that is not a URL", () => {
    expect(validateSpot(spot({ citations: [cite({ url: "seen on tiktok" })] })).join(" ")).toContain(
      "not a URL",
    );
  });

  it("rejects an unknown platform", () => {
    expect(
      validateSpot(
        spot({ citations: [cite({ platform: "myspace" as SpotCitation["platform"] })] }),
      ).join(" "),
    ).toContain("unknown platform");
  });

  it("rejects an undated citation", () => {
    // Evidence with no date cannot be aged, and a five-year-old post is not a signal
    // about where anyone goes now.
    expect(validateSpot(spot({ citations: [cite({ seenOn: "" })] })).join(" ")).toContain(
      "not a date",
    );
  });

  it("accepts a properly cited spot", () => {
    expect(validateSpot(spot())).toEqual([]);
  });
});

describe("corroboration is the ranking signal", () => {
  it("counts distinct platforms", () => {
    expect(
      corroboration(
        spot({
          citations: [cite({ platform: "youtube" }), cite({ platform: "reddit" })],
        }),
      ),
    ).toBe(2);
  });

  it("does not let one platform vouch for itself twice", () => {
    // One creator posting twice is not two sources agreeing.
    expect(
      corroboration(
        spot({
          citations: [
            cite({ platform: "youtube", url: "https://youtube.com/watch?v=1" }),
            cite({ platform: "youtube", url: "https://youtube.com/watch?v=2" }),
          ],
        }),
      ),
    ).toBe(1);
  });

  it("ranks best-evidenced first", () => {
    const thin = spot({ name: "One mention" });
    const strong = spot({
      name: "Everywhere",
      citations: [cite({ platform: "youtube" }), cite({ platform: "reddit" }), cite({ platform: "editorial" })],
    });
    expect(byCorroboration([thin, strong])[0].name).toBe("Everywhere");
  });
});

describe("checkSpots", () => {
  const many = (n: number, cited = true) =>
    Array.from({ length: n }, (_, i) =>
      spot({ name: `Place ${i}`, citations: cited ? [cite()] : [] }),
    );

  it("accepts a full, cited set", () => {
    expect(checkSpots(many(MIN_SPOTS)).ok).toBe(true);
  });

  it("enforces the count at both ends", () => {
    expect(checkSpots(many(MIN_SPOTS - 1)).errors.join(" ")).toContain("at least");
    expect(checkSpots(many(MAX_SPOTS + 1)).errors.join(" ")).toContain("at most");
  });

  it("rejects the whole set when a single spot is uncited", () => {
    // One fabrication among fifty is still a fabrication, and passing the rest would
    // publish it.
    const spots = many(MIN_SPOTS);
    spots[7] = spot({ name: "Ghost Bar", citations: [] });
    const result = checkSpots(spots);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("Ghost Bar");
  });

  it("catches duplicates regardless of case or padding", () => {
    const spots = many(MIN_SPOTS);
    spots[3] = spot({ name: "  fem små hus  " });
    spots[9] = spot({ name: "Fem Små Hus" });
    expect(checkSpots(spots).errors.join(" ")).toContain("duplicate");
  });
});
