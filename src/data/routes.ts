import type { DestinationRoutes, Origin, OriginRoute } from "@/lib/domain/types";

/*
 * How to reach each destination from each New York airport.
 *
 * This exists because the catalog's original `travel` figures were all quoted from JFK and
 * labelled only "the reference departure airport". Selecting a different airport relabelled
 * the UI without changing a single number — so the app would cheerfully say "nonstop from
 * LGA" about a route LaGuardia cannot fly.
 *
 * Two structural facts drive most of this table:
 *
 *   LGA has a 1,500-mile perimeter rule and no long-haul international service. Not one of
 *   the 27 destinations is reachable nonstop from LaGuardia — every one connects. That is
 *   genuinely useful to know before booking rather than after.
 *
 *   EWR is a United hub and reaches several places JFK does not. Dubrovnik
 *   is reachable nonstop only from Newark, and only seasonally — which the JFK-only
 *   model hid completely.
 *
 * CURATED, and the most volatile data in the app — airline networks change every season.
 * `verifiedOn` is not decorative. Real schedules arrive with Amadeus in Release 5.
 */

export const ROUTES_CURATED_ON = "2026-08-11";

/**
 * LaGuardia cannot fly any of these nonstop, so every LGA routing is a domestic connection
 * onto the same long-haul. Modelled as the JFK journey plus a connection and its overhead.
 */
function viaConnection(base: OriginRoute, origin: Origin, extraHours: number): OriginRoute {
  return {
    origin,
    nonstop: false,
    typicalTotalHours: Math.round((base.typicalTotalHours + extraHours) * 2) / 2,
    typicalConnections: base.typicalConnections + (base.nonstop ? 1 : 1),
    // Connecting onto a long-haul means the operating carrier plus whoever gets you to it;
    // the long-haul carrier is what matters for alliance purposes, so it is kept.
    airlines: base.airlines,
    seasonal: base.seasonal,
  };
}

interface RouteSpec {
  arrivalAirport: string;
  jfk: [nonstop: boolean, hours: number, connections: number, airlines: string[], seasonal?: boolean];
  ewr: [nonstop: boolean, hours: number, connections: number, airlines: string[], seasonal?: boolean];
  /** Hours added to the JFK journey when starting from LGA. */
  lgaPenalty: number;
}

const SPECS: Record<string, RouteSpec> = {
  // --- Southeast Asia: no New York nonstops at all -------------------------
  hanoi: {
    arrivalAirport: "HAN",
    jfk: [false, 22, 1, ["KE", "CI", "NH", "CX", "QR", "EK"]],
    ewr: [false, 22.5, 1, ["UA", "QR", "EK", "TK"]],
    lgaPenalty: 2.5,
  },
  hcmc: {
    arrivalAirport: "SGN",
    jfk: [false, 21, 1, ["KE", "CI", "EK", "QR", "CX"]],
    ewr: [false, 21.5, 1, ["UA", "QR", "EK", "TK"]],
    lgaPenalty: 2.5,
  },
  "hoi-an": {
    arrivalAirport: "DAD",
    jfk: [false, 24, 2, ["KE", "CI", "SQ", "CX"]],
    ewr: [false, 24.5, 2, ["UA", "SQ", "QR"]],
    lgaPenalty: 2.5,
  },
  "phu-quoc": {
    arrivalAirport: "PQC",
    jfk: [false, 26, 2, ["KE", "SQ", "EK", "QR"]],
    ewr: [false, 26.5, 2, ["UA", "SQ", "QR"]],
    lgaPenalty: 2.5,
  },
  bangkok: {
    arrivalAirport: "BKK",
    jfk: [false, 21, 1, ["EK", "QR", "EY", "KE", "CX", "NH", "TK"]],
    ewr: [false, 21, 1, ["UA", "EK", "QR", "TK", "SQ"]],
    lgaPenalty: 2.5,
  },
  phuket: {
    arrivalAirport: "HKT",
    jfk: [false, 24, 2, ["EK", "QR", "SQ", "CX"]],
    ewr: [false, 24, 2, ["UA", "EK", "QR", "SQ"]],
    lgaPenalty: 2.5,
  },
  krabi: {
    arrivalAirport: "KBV",
    jfk: [false, 25, 2, ["EK", "QR", "SQ"]],
    ewr: [false, 25, 2, ["UA", "EK", "QR", "SQ"]],
    lgaPenalty: 2.5,
  },
  "koh-samui": {
    arrivalAirport: "USM",
    jfk: [false, 26, 2, ["EK", "QR", "SQ", "CX"]],
    ewr: [false, 26, 2, ["UA", "EK", "QR", "SQ"]],
    lgaPenalty: 2.5,
  },
  palawan: {
    arrivalAirport: "PPS",
    jfk: [false, 28, 2, ["KE", "CI", "EK", "QR", "CX"]],
    ewr: [false, 28, 2, ["UA", "EK", "QR"]],
    lgaPenalty: 2.5,
  },
  boracay: {
    arrivalAirport: "MPH",
    jfk: [false, 27, 2, ["KE", "CI", "EK", "CX"]],
    ewr: [false, 27, 2, ["UA", "EK", "QR"]],
    lgaPenalty: 2.5,
  },
  siargao: {
    arrivalAirport: "IAO",
    jfk: [false, 30, 3, ["KE", "CI", "CX", "SQ"]],
    ewr: [false, 30, 3, ["UA", "SQ", "QR"]],
    lgaPenalty: 2.5,
  },
  "south-bali": {
    arrivalAirport: "DPS",
    jfk: [false, 24, 1, ["QR", "EK", "SQ", "KE", "CX"]],
    ewr: [false, 23.5, 1, ["SQ", "UA", "QR", "EK"]],
    lgaPenalty: 2.5,
  },
  ubud: {
    arrivalAirport: "DPS",
    jfk: [false, 25, 1, ["QR", "EK", "SQ", "KE"]],
    ewr: [false, 24.5, 1, ["SQ", "UA", "QR", "EK"]],
    lgaPenalty: 2.5,
  },

  // --- East Asia -----------------------------------------------------------
  tokyo: {
    arrivalAirport: "HND",
    jfk: [true, 14, 0, ["JL", "NH", "AA", "DL"]],
    ewr: [true, 14, 0, ["UA", "NH"]],
    lgaPenalty: 3,
  },
  kyoto: {
    arrivalAirport: "KIX",
    jfk: [false, 18, 1, ["JL", "NH", "KE", "CX"]],
    ewr: [false, 18, 1, ["UA", "NH"]],
    lgaPenalty: 3,
  },
  singapore: {
    arrivalAirport: "SIN",
    jfk: [true, 19, 0, ["SQ"]],
    ewr: [true, 18.5, 0, ["SQ", "UA"]],
    lgaPenalty: 3,
  },

  // --- Europe --------------------------------------------------------------
  stockholm: {
    arrivalAirport: "ARN",
    jfk: [true, 8, 0, ["SK", "DL", "N0"]],
    ewr: [true, 8, 0, ["SK", "UA"]],
    lgaPenalty: 2.5,
  },
  lisbon: {
    arrivalAirport: "LIS",
    jfk: [true, 7, 0, ["TP", "DL", "UA"]],
    ewr: [true, 7, 0, ["TP", "UA"]],
    lgaPenalty: 2.5,
  },
  seville: {
    arrivalAirport: "SVQ",
    jfk: [false, 11, 1, ["IB", "TP", "AF", "LH"]],
    ewr: [false, 11, 1, ["IB", "TP", "UA", "LH"]],
    lgaPenalty: 2.5,
  },
  rome: {
    arrivalAirport: "FCO",
    jfk: [true, 9, 0, ["AZ", "DL", "AA", "UA", "N0"]],
    ewr: [true, 9, 0, ["UA", "AZ"]],
    lgaPenalty: 2.5,
  },

  // --- Africa and the Middle East ------------------------------------------
  dubai: {
    arrivalAirport: "DXB",
    jfk: [true, 13, 0, ["EK"]],
    ewr: [true, 13, 0, ["EK", "UA"]],
    lgaPenalty: 3,
  },
  marrakech: {
    // The clearest case for this whole table: JFK needs a stop via Casablanca; Newark has
    // a seasonal nonstop that halves the journey.
    arrivalAirport: "RAK",
    jfk: [false, 12, 1, ["AT", "IB", "TP", "AF"]],
    ewr: [true, 7.5, 0, ["UA"], true],
    lgaPenalty: 2.5,
  },
  "cape-town": {
    arrivalAirport: "CPT",
    jfk: [false, 20, 1, ["QR", "EK", "ET", "TK", "KL"]],
    ewr: [true, 15.5, 0, ["UA"], true],
    lgaPenalty: 3,
  },
  maldives: {
    arrivalAirport: "MLE",
    jfk: [false, 22, 1, ["EK", "QR", "EY", "TK"]],
    ewr: [false, 22, 1, ["EK", "QR", "UA", "TK"]],
    lgaPenalty: 3,
  },

  // --- The Americas --------------------------------------------------------
  "riviera-maya": {
    arrivalAirport: "CUN",
    jfk: [true, 4.5, 0, ["B6", "DL", "AA", "AM"]],
    ewr: [true, 4.5, 0, ["UA", "B6"]],
    lgaPenalty: 2,
  },
  "san-juan": {
    arrivalAirport: "SJU",
    jfk: [true, 4, 0, ["B6", "DL", "AA"]],
    ewr: [true, 4, 0, ["UA", "B6"]],
    lgaPenalty: 2,
  },
  "mexico-city": {
    arrivalAirport: "MEX",
    jfk: [true, 5.5, 0, ["AM", "DL", "AA", "B6"]],
    ewr: [true, 5.5, 0, ["UA", "AM"]],
    lgaPenalty: 2,
  },
};

function buildRoutes(destinationId: string, spec: RouteSpec): DestinationRoutes {
  const make = (origin: Origin, t: RouteSpec["jfk"]): OriginRoute => ({
    origin,
    nonstop: t[0],
    typicalTotalHours: t[1],
    typicalConnections: t[2],
    airlines: t[3],
    seasonal: t[4] ?? false,
  });

  const jfk = make("JFK", spec.jfk);
  const ewr = make("EWR", spec.ewr);

  return {
    destinationId,
    arrivalAirport: spec.arrivalAirport,
    byOrigin: {
      JFK: jfk,
      EWR: ewr,
      // Always a connection — see the note at the top of this file.
      LGA: viaConnection(jfk, "LGA", spec.lgaPenalty),
    },
    verifiedOn: ROUTES_CURATED_ON,
  };
}

import GENERATED from "./generated/routes.json";

/**
 * The route table: generated entries, with the hand-written specs still available.
 *
 * `npm run build:routes` reads the published destination tables of JFK, Newark and
 * LaGuardia and writes `generated/routes.json`. That closed the gap where 26 of 46
 * destinations had no entry at all and silently scored travel from their `travel.*`
 * figures via a synthetic JFK-only fallback.
 *
 * The hand-written SPECS above are kept rather than deleted: they carry airline lists the
 * parser does not extract, and where the two disagree the generator preserves the curated
 * value and reports it. A generated `false` is weaker evidence than a human-verified
 * `true` — replacing one with the other would be a regression dressed as a refresh.
 */
const generatedRoutes = (
  GENERATED as unknown as {
    generatedOn: string;
    routes: Record<string, Omit<DestinationRoutes, "verifiedOn">>;
  }
).routes;

export const ROUTES: Record<string, DestinationRoutes> = Object.fromEntries(
  Object.entries(generatedRoutes).map(([id, r]) => [
    id,
    { ...r, verifiedOn: (GENERATED as unknown as { generatedOn: string }).generatedOn },
  ]),
);

/** Retained so the curated specs stay reachable and reviewable. */
export const CURATED_SPECS = Object.fromEntries(
  Object.entries(SPECS).map(([id, spec]) => [id, buildRoutes(id, spec)]),
);

export function routesFor(destinationId: string): DestinationRoutes | undefined {
  return ROUTES[destinationId];
}

/** True when LaGuardia cannot reach anything in the catalog without connecting. */
export const LGA_HAS_NO_NONSTOPS = Object.values(ROUTES).every((r) => !r.byOrigin.LGA.nonstop);
