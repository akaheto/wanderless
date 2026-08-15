import type {
  Alliance,
  Destination,
  Origin,
  OriginRoute,
  SelectedRoute,
  TravelBand,
} from "@/lib/domain/types";
import { travelBandOf } from "@/lib/domain/types";
import { alliancesFor, allianceOf } from "@/data/airlines";
import { routesFor } from "@/data/routes";
import { HOME_AIRPORTS } from "@/lib/config/home";

/*
 * Choosing a route.
 *
 * Two things the traveller controls: which New York airports they will use, in order of
 * preference, and which airlines or alliances they want to fly. Both narrow the options,
 * and narrowing can eliminate every option — which must be said out loud rather than
 * silently producing a worse score. Same principle as the travel-time constraint (ADR 0009):
 * a constraint that removes everything is information, not an empty result.
 */

export interface RoutePreferences {
  /** Airports the traveller will use, in order of preference. Empty means all of them. */
  origins: Origin[];
  /** Alliances to restrict to. Empty means no alliance restriction. */
  alliances: Alliance[];
  /** Specific airline codes to restrict to. Empty means no airline restriction. */
  airlines: string[];
}

export const DEFAULT_ROUTE_PREFERENCES: RoutePreferences = {
  // Airports in order of preference — sourced from HOME_AIRPORTS (src/lib/config/home.ts).
  origins: HOME_AIRPORTS,
  alliances: [],
  airlines: [],
};

/** Does this route have at least one carrier the traveller is willing to fly? */
export function routeMatchesFilter(route: OriginRoute, prefs: RoutePreferences): boolean {
  const noFilter = prefs.alliances.length === 0 && prefs.airlines.length === 0;
  if (noFilter) return true;

  return route.airlines.some((code) => {
    if (prefs.airlines.length > 0 && prefs.airlines.includes(code)) return true;
    if (prefs.alliances.length > 0 && prefs.alliances.includes(allianceOf(code))) return true;
    return false;
  });
}

/** The carriers on this route the traveller would actually fly. */
export function matchingAirlines(route: OriginRoute, prefs: RoutePreferences): string[] {
  const noFilter = prefs.alliances.length === 0 && prefs.airlines.length === 0;
  if (noFilter) return route.airlines;
  return route.airlines.filter(
    (code) => prefs.airlines.includes(code) || prefs.alliances.includes(allianceOf(code)),
  );
}

/**
 * Order two routes, worst-first comparator style: negative means `a` is the better trip.
 *
 * Ranks on what is evidenced and stops ranking on what was estimated. Nonstop status,
 * seasonality and connection count all come from published airport route tables. Journey
 * length only enters as a band, because that is the resolution the data supports.
 *
 * This deliberately no longer discriminates on small differences in hours. Singapore is
 * 19h from JFK and 18.5h from Newark, and the old comparator let that half hour decide
 * the origin. Both are nonstop, both land in the same band, so the routes now tie and
 * the traveller's own airport preference settles it — which is the honest answer, since
 * thirty minutes on a nineteen-hour journey was never a real signal.
 */
function compareRoutes(a: OriginRoute, b: OriginRoute, originOrder: Origin[]): number {
  // A nonstop is a better trip than a connection regardless of anything else.
  if (a.nonstop !== b.nonstop) return a.nonstop ? -1 : 1;
  // Year-round beats seasonal: a route you cannot count on is worth less than one you can.
  if (a.seasonal !== b.seasonal) return a.seasonal ? 1 : -1;
  if (a.typicalConnections !== b.typicalConnections) {
    return a.typicalConnections - b.typicalConnections;
  }
  const bandA = travelBandOf(a.typicalTotalHours);
  const bandB = travelBandOf(b.typicalTotalHours);
  if (bandA !== bandB) return BAND_ORDER[bandA] - BAND_ORDER[bandB];
  return originOrder.indexOf(a.origin) - originOrder.indexOf(b.origin);
}

const BAND_ORDER: Record<TravelBand, number> = { "0-8": 0, "8-16": 1, "16+": 2 };

function better(a: OriginRoute, b: OriginRoute, originOrder: Origin[]): OriginRoute {
  return compareRoutes(a, b, originOrder) <= 0 ? a : b;
}

/**
 * Pick the best route to a destination given the traveller's airports and airlines.
 *
 * Falls back to the destination's legacy `travel` figures when no route table entry
 * exists — a destination added to the catalog without routes still scores, and the
 * fallback is visible as a JFK-only single option rather than a silent default.
 */
export function selectRoute(
  destination: Destination,
  prefs: RoutePreferences = DEFAULT_ROUTE_PREFERENCES,
): SelectedRoute {
  const table = routesFor(destination.id);
  const originOrder = prefs.origins.length > 0 ? prefs.origins : HOME_AIRPORTS;

  const candidates: OriginRoute[] = table
    ? originOrder.map((o) => table.byOrigin[o]).filter(Boolean)
    : [
        {
          origin: originOrder[0],
          nonstop: destination.travel.nonstop,
          typicalTotalHours: destination.travel.typicalTotalHours,
          typicalConnections: destination.travel.typicalConnections,
          airlines: [],
          seasonal: false,
        },
      ];

  const permitted = candidates.filter((r) => routeMatchesFilter(r, prefs));

  if (permitted.length === 0) {
    // Nothing survives the filter. Return the best unfiltered option so the destination
    // still has numbers, flagged so the UI can explain why it is unreachable as specified.
    const fallback = candidates.reduce((best, r) => better(best, r, originOrder));
    return {
      route: fallback,
      alliances: alliancesFor(fallback.airlines),
      constrainedByFilter: true,
      noRouteMatches: true,
    };
  }

  const chosen = permitted.reduce((best, r) => better(best, r, originOrder));
  const unconstrained = candidates.reduce((best, r) => better(best, r, originOrder));

  return {
    route: chosen,
    alliances: alliancesFor(chosen.airlines),
    // True when the filter cost the traveller a materially better routing.
    // The filter cost the traveller something only if the unconstrained pick is strictly
    // better on the evidenced signals — not merely different by a rounding of hours.
    constrainedByFilter:
      chosen.origin !== unconstrained.origin ||
      compareRoutes(unconstrained, chosen, originOrder) < 0,
    noRouteMatches: false,
  };
}

/** Every origin's route, best first — for showing the alternatives. */
export function routeOptions(
  destination: Destination,
  prefs: RoutePreferences = DEFAULT_ROUTE_PREFERENCES,
): { route: OriginRoute; matches: boolean }[] {
  const table = routesFor(destination.id);
  if (!table) return [];

  const originOrder = prefs.origins.length > 0 ? prefs.origins : HOME_AIRPORTS;

  return HOME_AIRPORTS
    .map((o) => ({ route: table.byOrigin[o], matches: routeMatchesFilter(table.byOrigin[o], prefs) }))
    .sort((a, b) => (better(a.route, b.route, originOrder) === a.route ? -1 : 1));
}

/** Plain-language description of a routing, for the UI and the narrative. */
export function describeRoute(selected: SelectedRoute): string {
  const { route } = selected;
  const stops =
    route.typicalConnections === 0
      ? "nonstop"
      : `${route.typicalConnections} stop${route.typicalConnections === 1 ? "" : "s"}`;
  const seasonal = route.seasonal ? ", seasonal service only" : "";
  return `${route.typicalTotalHours}h from ${route.origin}, ${stops}${seasonal}`;
}
