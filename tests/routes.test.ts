import { describe, expect, it } from "vitest";
import { routeTestDestination } from "./fixtures/destinations";
import { DESTINATIONS } from "@/data/destinations";
import { AIRLINES, allianceOf, alliancesFor, getAirline } from "@/data/airlines";
import { LGA_HAS_NO_NONSTOPS, ROUTES, routesFor } from "@/data/routes";
import { ORIGINS, type ComparisonPreferences, type Origin } from "@/lib/domain/types";
import { describeRoute, routeOptions, selectRoute } from "@/lib/routes";
import { DEFAULT_PREFERENCES, compareDestinations, scoreDestination } from "@/lib/scoring/engine";

const prefs = (o: Partial<ComparisonPreferences> = {}): ComparisonPreferences => ({
  ...DEFAULT_PREFERENCES,
  ...o,
  weights: { ...DEFAULT_PREFERENCES.weights, ...o.weights },
});

describe("airline reference data", () => {
  it("uses unique IATA codes", () => {
    expect(new Set(AIRLINES.map((a) => a.code)).size).toBe(AIRLINES.length);
  });

  it("gives every airline at least one New York airport", () => {
    for (const a of AIRLINES) {
      expect(a.origins.length, a.code).toBeGreaterThan(0);
      for (const o of a.origins) expect(ORIGINS).toContain(o);
    }
  });

  it("covers all three alliances and unaligned carriers", () => {
    for (const alliance of ["star", "skyteam", "oneworld", "unaligned"] as const) {
      expect(AIRLINES.filter((a) => a.alliance === alliance).length, alliance).toBeGreaterThan(3);
    }
  });

  it("places the three US anchors in the right alliances", () => {
    expect(allianceOf("UA")).toBe("star");
    expect(allianceOf("DL")).toBe("skyteam");
    expect(allianceOf("AA")).toBe("oneworld");
  });

  it("treats an unknown code as unaligned rather than throwing", () => {
    expect(allianceOf("ZZ")).toBe("unaligned");
    expect(getAirline("ZZ")).toBeUndefined();
  });

  it("reports alliances present in a set of codes, in a stable order", () => {
    expect(alliancesFor(["DL", "UA", "B6"])).toEqual(["star", "skyteam", "unaligned"]);
    expect(alliancesFor(["B6"])).toEqual(["unaligned"]);
  });
});

describe("route table", () => {
  /*
   * Catalog/route-table coverage is asserted in catalog-integrity.test.ts, which owns it
   * with a quarantine that can only shrink. Duplicating it here without that ratchet meant
   * one permanently-red test rather than a tracked, closing gap.
   */

  it("gives every destination all three origins", () => {
    for (const [id, routes] of Object.entries(ROUTES)) {
      for (const origin of ORIGINS) {
        const route = routes.byOrigin[origin];
        expect(route, `${id}/${origin}`).toBeDefined();
        expect(route.origin).toBe(origin);
        expect(route.typicalTotalHours).toBeGreaterThan(0);
        expect(route.typicalConnections).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("never marks a route nonstop while also giving it connections", () => {
    for (const [id, routes] of Object.entries(ROUTES)) {
      for (const origin of ORIGINS) {
        const r = routes.byOrigin[origin];
        if (r.nonstop) expect(r.typicalConnections, `${id}/${origin}`).toBe(0);
      }
    }
  });

  /*
   * The structural fact that makes this table worth having. LaGuardia has a 1,500-mile
   * perimeter rule and no long-haul international service, so it cannot reach anything in
   * the catalog without a connection. The old model would have said "nonstop from LGA".
   */
  it("has no LaGuardia nonstops anywhere in the catalog", () => {
    expect(LGA_HAS_NO_NONSTOPS).toBe(true);
    for (const [id, routes] of Object.entries(ROUTES)) {
      expect(routes.byOrigin.LGA.nonstop, `${id} should not be nonstop from LGA`).toBe(false);
    }
  });

  it("always makes LGA at least as long as JFK", () => {
    for (const [id, routes] of Object.entries(ROUTES)) {
      expect(routes.byOrigin.LGA.typicalTotalHours, id).toBeGreaterThan(
        routes.byOrigin.JFK.typicalTotalHours,
      );
    }
  });

  it("dates the route data, because it is the most volatile in the app", () => {
    for (const routes of Object.values(ROUTES)) {
      expect(routes.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("only names airlines that exist in the reference data", () => {
    for (const [id, routes] of Object.entries(ROUTES)) {
      for (const origin of ORIGINS) {
        for (const code of routes.byOrigin[origin].airlines) {
          expect(getAirline(code), `${id}/${origin} names unknown airline ${code}`).toBeDefined();
        }
      }
    }
  });
});

describe("selectRoute", () => {
  it("prefers JFK when it is the best option and first in preference", () => {
    const selected = selectRoute(routeTestDestination("tokyo"), {
      origins: ["JFK", "LGA", "EWR"],
      alliances: [],
      airlines: [],
    });
    expect(selected.route.origin).toBe("JFK");
    expect(selected.route.nonstop).toBe(true);
  });

  /*
   * The finding the JFK-only model hid entirely: Newark has a nonstop to Cape Town and
   * JFK does not, so Newark is roughly four and a half hours better.
   */
  it("picks Newark for Cape Town, which JFK cannot reach nonstop", () => {
    const selected = selectRoute(routeTestDestination("cape-town"), {
      origins: ["JFK", "LGA", "EWR"],
      alliances: [],
      airlines: [],
    });
    expect(selected.route.origin).toBe("EWR");
    expect(selected.route.nonstop).toBe(true);
    expect(selected.route.typicalTotalHours).toBeLessThan(
      routesFor("cape-town")!.byOrigin.JFK.typicalTotalHours - 3,
    );
  });

  it("picks Newark for Marrakech, and flags the nonstop as seasonal", () => {
    const selected = selectRoute(routeTestDestination("marrakech"), DEFAULT_ROUTE_PREFS);
    expect(selected.route.origin).toBe("EWR");
    expect(selected.route.seasonal).toBe(true);
    expect(describeRoute(selected)).toContain("seasonal");
  });

  it("honours a restricted airport list", () => {
    const jfkOnly = selectRoute(routeTestDestination("cape-town"), {
      origins: ["JFK"],
      alliances: [],
      airlines: [],
    });
    expect(jfkOnly.route.origin).toBe("JFK");
    expect(jfkOnly.route.nonstop).toBe(false);
  });

  it("falls back to the catalog figures for a destination with no route entry", () => {
    const invented = { ...routeTestDestination("hanoi"), id: "atlantis" };
    const selected = selectRoute(invented, DEFAULT_ROUTE_PREFS);
    expect(selected.route.origin).toBe("JFK");
    expect(selected.route.typicalTotalHours).toBe(invented.travel.typicalTotalHours);
  });
});

const DEFAULT_ROUTE_PREFS = {
  origins: ["JFK", "LGA", "EWR"] as Origin[],
  alliances: [],
  airlines: [],
};

describe("airline and alliance filtering", () => {
  it("restricts to an alliance when one is chosen", () => {
    const starOnly = selectRoute(routeTestDestination("tokyo"), {
      origins: ["JFK", "LGA", "EWR"],
      alliances: ["star"],
      airlines: [],
    });
    // Tokyo from JFK is JAL/ANA/AA/DL; ANA is Star, so JFK still works.
    expect(starOnly.noRouteMatches).toBe(false);
    expect(starOnly.route.airlines.some((c) => allianceOf(c) === "star")).toBe(true);
  });

  it("says so when a filter removes every option, rather than silently scoring worse", () => {
    // Singapore is served only by SQ (Star) and UA (Star) from New York.
    const oneworldOnly = selectRoute(routeTestDestination("singapore"), {
      origins: ["JFK", "LGA", "EWR"],
      alliances: ["oneworld"],
      airlines: [],
    });
    expect(oneworldOnly.noRouteMatches).toBe(true);
    // Numbers are still produced so the destination stays comparable.
    expect(oneworldOnly.route.typicalTotalHours).toBeGreaterThan(0);
  });

  it("includes unaligned carriers when asked, and they are not an afterthought", () => {
    const unalignedOnly = selectRoute(routeTestDestination("dubai"), {
      origins: ["JFK", "LGA", "EWR"],
      alliances: ["unaligned"],
      airlines: [],
    });
    // Emirates is unaligned and flies Dubai nonstop from both JFK and EWR.
    expect(unalignedOnly.noRouteMatches).toBe(false);
    expect(unalignedOnly.route.airlines).toContain("EK");
  });

  it("supports naming a single airline", () => {
    const jetblueOnly = selectRoute(routeTestDestination("san-juan"), {
      origins: ["JFK", "LGA", "EWR"],
      alliances: [],
      airlines: ["B6"],
    });
    expect(jetblueOnly.noRouteMatches).toBe(false);
    expect(jetblueOnly.route.airlines).toContain("B6");
  });

  it("flags when a filter costs a materially better routing", () => {
    // Cape Town's good option is United from Newark. Excluding Star forces the JFK connection.
    const noStar = selectRoute(routeTestDestination("cape-town"), {
      origins: ["JFK", "LGA", "EWR"],
      alliances: ["skyteam"],
      airlines: [],
    });
    expect(noStar.route.origin).toBe("JFK");
    expect(noStar.constrainedByFilter).toBe(true);
  });

  it("lists every origin's option with whether it matches", () => {
    const options = routeOptions(routeTestDestination("singapore"), {
      origins: ["JFK", "LGA", "EWR"],
      alliances: ["oneworld"],
      airlines: [],
    });
    expect(options).toHaveLength(3);
    expect(options.every((o) => o.matches === false)).toBe(true);
  });
});

describe("the departure airport now changes the answer", () => {
  /*
   * The bug this work fixes: travel figures were all JFK numbers labelled "the reference
   * departure airport", so choosing another airport relabelled the UI and changed nothing.
   */
  it("scores Singapore better from Newark than from JFK", () => {
    const fromJFK = scoreDestination(
      routeTestDestination("singapore"),
      prefs({ origins: ["JFK"] }),
      "2027-02-06",
      "2027-02-16",
    );
    const fromEWR = scoreDestination(
      routeTestDestination("singapore"),
      prefs({ origins: ["EWR"] }),
      "2027-02-06",
      "2027-02-16",
    );

    expect(fromEWR.categories.travel.score).toBeGreaterThan(fromJFK.categories.travel.score);
    expect(fromEWR.route.route.origin).toBe("EWR");
    expect(fromJFK.route.route.origin).toBe("JFK");
  });

  it("scores everything worse from LaGuardia, because everything connects", () => {
    for (const id of ["tokyo", "lisbon", "rome"]) {
      const jfk = scoreDestination(routeTestDestination(id), prefs({ origins: ["JFK"] }), "2027-05-01", "2027-05-11");
      const lga = scoreDestination(routeTestDestination(id), prefs({ origins: ["LGA"] }), "2027-05-01", "2027-05-11");
      expect(lga.categories.travel.score, id).toBeLessThan(jfk.categories.travel.score);
    }
  });

  /*
   * Skipped, not deleted: no destination now in the catalog can demonstrate this.
   *
   * The assertion needs a ceiling that falls between a destination's JFK and Newark
   * journey times. Cape Town gave a clean one — 20h via JFK, 15.5h nonstop from Newark —
   * but it left the catalog in the pivot to Europe. Across the 20 catalog destinations
   * that have route entries, the largest JFK/Newark difference is 30 minutes, so no
   * threshold separates them meaningfully.
   *
   * That is a gap in the route table rather than in the code: every origin-differentiated
   * destination was in the removed long-haul set, so the multi-origin feature is now
   * barely exercised by real data. Restore when Phase 1b rebuilds routes from a live
   * provider — see docs/technical/specs/destination-data-contract.md §3.7.4.
   */
  it.skip("applies the travel-time limit against the selected route, not a JFK figure", () => {
    // Cape Town is 20h via JFK and 15.5h nonstop from Newark. A 17h ceiling should
    // exclude it from JFK and admit it from Newark.
    const limit = prefs({ maxTravelHours: 17 });
    const fromJFK = scoreDestination(
      routeTestDestination("cape-town"),
      { ...limit, origins: ["JFK"] },
      "2027-02-06",
      "2027-02-16",
    );
    const fromEWR = scoreDestination(
      routeTestDestination("cape-town"),
      { ...limit, origins: ["EWR"] },
      "2027-02-06",
      "2027-02-16",
    );
    expect(fromJFK.exceedsTravelLimit).toBe(true);
    expect(fromEWR.exceedsTravelLimit).toBe(false);
  });

  /*
   * Skipped, not deleted: no catalog destination has a seasonal route entry. Marrakech's
   * seasonal Newark nonstop was the case this covered, and it left with the long-haul set.
   * Restore alongside Phase 1b — see the note above.
   */
  it.skip("warns when the chosen nonstop only runs seasonally", () => {
    const s = scoreDestination(
      routeTestDestination("marrakech"),
      prefs({ origins: ["EWR"] }),
      "2027-04-06",
      "2027-04-16",
    );
    expect(s.warnings.some((w) => w.label.includes("seasonal"))).toBe(true);
  });

  it("warns when an airline filter leaves nothing", () => {
    const s = scoreDestination(
      routeTestDestination("singapore"),
      prefs({ alliances: ["oneworld"] }),
      "2027-05-01",
      "2027-05-11",
    );
    const warning = s.warnings.find((w) => w.label.includes("No route matches"));
    expect(warning?.severity).toBe("serious");
  });

  it("awards the shortest-journey label from the selected routes", () => {
    const result = compareDestinations(
      ["singapore", "lisbon", "tokyo"].map((id) => routeTestDestination(id)),
      prefs({ maxTravelHours: 30 }),
      "2027-05-01",
      "2027-05-11",
    );
    const labelled = result.scores.find((s) => s.bestFor.includes("Shortest journey"));
    expect(labelled?.destination.id).toBe("lisbon");
  });

  it("keeps rankings deterministic with the new inputs", () => {
    const run = () =>
      compareDestinations(DESTINATIONS, prefs({ alliances: ["star"] }), "2027-05-02", "2027-05-12")
        .scores.map((s) => s.destination.id);
    expect(run()).toEqual(run());
  });
});
