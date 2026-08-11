import type { Destination, Transfer, TransferBurden, TransferMode } from "@/lib/domain/types";

/*
 * What it costs to move between two stops.
 *
 * This is the number a night count hides. "Three nights in Hoi An" sounds like three days
 * there; if getting in burns seven hours door to door, it is two. Itinerary tools that
 * only count nights are how people end up with trips made mostly of transit.
 *
 * Provenance, stated plainly because it matters: the distance is objective — great-circle
 * from catalog coordinates. Everything derived from it is a CURATED HEURISTIC, corrected by
 * hand for specific legs where it is known to be wrong.
 *
 * External road routing was considered and withdrawn (ADR 0011): it covers driving, and
 * 99% of the catalog's legs are flights. Real flight timings come with Amadeus in Release 5
 * and will replace `estimateTransfer` alone — the shape of `Transfer` is what the rest of
 * the app depends on, so that swap stays local.
 */

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points, in km. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Airport overhead: getting to the airport, clearing it, waiting, and getting out the
 * other end. Roughly constant regardless of how far you fly, which is exactly why short
 * flights are such poor value — a 90-minute hop still costs most of a day.
 */
const AIRPORT_OVERHEAD_HOURS = 3.5;
const INTERNATIONAL_EXTRA_HOURS = 1;

/** Ground travel is slower per km than the map suggests once stops and roads are counted. */
const GROUND_SPEED_KMH = 65;
const GROUND_FIXED_HOURS = 0.75;

/** Cruise speed including climb and descent, averaged over the sector. */
const FLIGHT_SPEED_KMH = 750;

function modeFor(distanceKm: number): TransferMode {
  if (distanceKm < 250) return "ground";
  if (distanceKm < 1100) return "short-flight";
  if (distanceKm < 4000) return "flight";
  return "long-flight";
}

function burdenFor(hours: number): TransferBurden {
  if (hours < 3) return "easy";
  if (hours < 6) return "half-day";
  if (hours < 11) return "full-day";
  return "punishing";
}

const BURDEN_NOTE: Record<TransferBurden, string> = {
  easy: "Short enough to do in a morning and still have the day.",
  "half-day": "Costs you half a day at one end or the other.",
  "full-day": "A travel day. Treat it as one, and don't plan anything around it.",
  punishing: "Most of two days once you account for recovery. Worth avoiding mid-trip.",
};

/**
 * Curated corrections for pairs the distance model gets wrong (ADR 0011).
 *
 * Keyed on the two ids sorted, so one entry covers both directions. Kept deliberately
 * small: these exist because someone checked a specific route, and each says why.
 */
const CURATED_OVERRIDES: Record<string, { hours: number; mode: TransferMode; note: string }> = {
  "koh-samui|krabi": {
    hours: 8,
    mode: "ground",
    note: "Crosses the peninsula from the Andaman coast to the Gulf — bus and ferry, or a connecting flight via Bangkok. A day either way.",
  },
};

const overrideKey = (a: string, b: string) => [a, b].sort().join("|");

/**
 * Estimate the door-to-door cost of moving between two destinations.
 *
 * Deliberately pessimistic about flying: the modelled cost is dominated by the fixed
 * overhead rather than the distance, because that is how it actually feels.
 *
 * A curated override wins where one exists. Everything else is the heuristic, and is
 * labelled as an estimate wherever it surfaces.
 */
export function estimateTransfer(from: Destination, to: Destination): Transfer {
  const override = CURATED_OVERRIDES[overrideKey(from.id, to.id)];
  if (override) {
    return {
      fromDestinationId: from.id,
      toDestinationId: to.id,
      distanceKm: Math.round(haversineKm(from, to)),
      mode: override.mode,
      hours: override.hours,
      burden: burdenFor(override.hours),
      note: override.note,
    };
  }
  return heuristicTransfer(from, to);
}

function heuristicTransfer(from: Destination, to: Destination): Transfer {
  const distanceKm = Math.round(haversineKm(from, to));
  const mode = modeFor(distanceKm);
  const international = from.country !== to.country;

  let hours: number;
  if (mode === "ground") {
    hours = GROUND_FIXED_HOURS + distanceKm / GROUND_SPEED_KMH;
  } else {
    hours =
      AIRPORT_OVERHEAD_HOURS +
      distanceKm / FLIGHT_SPEED_KMH +
      (international ? INTERNATIONAL_EXTRA_HOURS : 0);
    // Beyond roughly 4,000 km a direct flight between two secondary cities is unlikely,
    // so assume a connection and the layover that comes with it.
    if (mode === "long-flight") hours += 2.5;
  }

  hours = Math.round(hours * 2) / 2;
  const burden = burdenFor(hours);

  return {
    fromDestinationId: from.id,
    toDestinationId: to.id,
    distanceKm,
    mode,
    hours,
    burden,
    note: BURDEN_NOTE[burden],
  };
}

export const TRANSFER_MODE_LABEL: Record<TransferMode, string> = {
  ground: "overland",
  "short-flight": "short flight",
  flight: "flight",
  "long-flight": "long flight, likely connecting",
};

export const TRANSFER_BURDEN_LABEL: Record<TransferBurden, string> = {
  easy: "easy",
  "half-day": "half a day",
  "full-day": "a full day",
  punishing: "punishing",
};
