/**
 * Core domain types for the Wanderless.
 *
 * Three tiers of information are kept deliberately separate (Phase 0 principle):
 *
 *   1. OBJECTIVE      — measured data with a named source and a fetch date.
 *                       e.g. climate normals from Open-Meteo ERA5. Never edited by hand.
 *   2. CURATED        — editorial baseline shipped with the app. Judgement calls, but
 *                       stable and versioned, each carrying a `curatedOn` date.
 *   3. PERSONAL       — the user's own assessments, notes, weights and decisions.
 *                       Lives in the database, never overwritten by a data refresh.
 */

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export type Tier = "objective" | "curated" | "personal";

export interface Provenance {
  /** Human-readable source name, e.g. "Open-Meteo ERA5 archive". */
  source: string;
  /** Canonical URL for the source, when there is one. */
  url?: string;
  /** ISO date (YYYY-MM-DD) the fact was fetched or last verified. */
  verifiedOn: string;
  tier: Tier;
  /** Free-text scope note, e.g. "10-year normals, 2015-2024". */
  note?: string;
}

// ---------------------------------------------------------------------------
// Destinations (curated catalog)
// ---------------------------------------------------------------------------

export type Season = "peak" | "shoulder" | "low";

/**
 * What kind of trip this place naturally produces. Used to match against the
 * traveller's city-versus-resort preference rather than as a quality signal.
 */
export type Archetype = "city" | "beach" | "resort" | "mixed" | "nature";

/**
 * How established the place is as a leisure destination.
 *
 * This exists to enforce the Phase 2 design rule: the engine ranks *relevant
 * tourist destinations*, not whatever coordinate happens to be warmest. Only
 * places in this catalog are ever ranked, and tier feeds the practicality score.
 *
 *   1 — major, well-served destination with deep visitor infrastructure
 *   2 — established destination, thinner infrastructure or more effort to reach
 *   3 — niche or emerging; rewarding but demands more from the traveller
 */
export type TourismTier = 1 | 2 | 3;

export interface RiskWindow {
  /** 1-12. */
  months: number[];
  label: string;
  severity: "low" | "moderate" | "high";
}

/** 0-5 sub-scores. 0 = essentially absent, 5 = world-class. */
export interface ExperienceProfile {
  food: number;
  culture: number;
  beaches: number;
  nightlife: number;
  dayTrips: number;
  nature: number;
  shopping: number;
}

/** 0-5 sub-scores. 5 = frictionless for an English-speaking visitor from the US. */
export interface PracticalityProfile {
  /** Getting around locally without renting a car. */
  localTransport: number;
  /** How far English gets you day to day. */
  languageEase: number;
  /** Everyday safety, health and hygiene friction. */
  safetyEase: number;
  /** Visas, entry paperwork, customs. */
  entryEase: number;
  /** How simple it is to run a whole trip here (5 = one base, no internal flights). */
  tripSimplicity: number;
}

/**
 * How long the journey takes, as a band rather than a figure.
 *
 * A precise duration is a property of the itinerary someone selects, not of the
 * destination: it moves with the routing, the date, and the connection. Storing "9h"
 * claimed a precision the data cannot support, and the curated numbers could never be
 * refreshed because no source publishes a "typical" duration.
 *
 * Bands are derivable and checkable. Great-circle distance plus cruise speed agreed with
 * all 20 curated route entries across both New York origins — 40 of 40 — where the same
 * derivation scored only 14/20 when asked for a precise airport. Where an estimate is
 * honest at one resolution and not another, the schema should record the resolution that
 * holds.
 *
 * Real durations still exist in the app: they come from live flight search, attached to
 * an actual itinerary, with the date it was retrieved.
 */
export type TravelBand = "0-8" | "8-16" | "16+";

/** Band boundaries in hours, used for derivation and for scoring comparisons. */
export const TRAVEL_BAND_MAX: Record<TravelBand, number> = {
  "0-8": 8,
  "8-16": 16,
  "16+": 30,
};

export function travelBandOf(hours: number): TravelBand {
  return hours < 8 ? "0-8" : hours < 16 ? "8-16" : "16+";
}

export interface TravelProfile {
  /** Whether a nonstop exists from the reference departure airport. */
  nonstop: boolean;
  /** Typical door-of-gate to gate total, including connections, in hours. */
  typicalTotalHours: number;
  /** Typical number of connections on a realistic itinerary. */
  typicalConnections: number;
  /** 0-5, 5 = walk off the plane into a taxi. Captures the last mile. */
  arrivalEase: number;
  /** Onward domestic legs, ferries or long drives needed after the long-haul. */
  notes: string;
}

export interface LodgingProfile {
  /** Typical shoulder-season nightly rate, USD, all-in before tax. */
  fourStarUSD: number;
  fiveStarUSD: number;
  /** Multiplier applied in peak months. */
  peakMultiplier: number;
  /** Multiplier applied in low months. */
  lowMultiplier: number;
  /** Live Booking.com search URL for current prices. */
  bookingSearchUrl?: string;
}

export interface Destination {
  id: string;
  name: string;
  /** Broader place the traveller thinks in, e.g. "Vietnam" or "Southern Thailand". */
  area: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  timezone: string;
  coastal: boolean;
  /**
   * IATA code of the airport a visitor actually arrives at.
   *
   * Lives here rather than on `DestinationRoutes` — where it used to sit — because it is
   * a property of the place, not of a routing. Keeping it on the route entry made the
   * two mutually dependent: fetching routes for a destination requires knowing its
   * airport, but the airport was only recorded inside the route entry that did not yet
   * exist. That circularity is why the route table could only ever be filled by hand.
   *
   * Deliberately not derived. Nearest-airport selection was measured at 14/20 against
   * known-correct values: Rome resolves to Ciampino rather than Fiumicino, Reykjavík to
   * the domestic terminal rather than Keflavík, Paris to Le Bourget. The right answer is
   * the gateway a traveller actually uses, which is a judgement no dataset encodes.
   *
   * Required: all 46 destinations carry a confirmed code, so the compiler now enforces
   * what the catalog-integrity quarantine previously tracked. A destination cannot be
   * added without declaring the airport its visitors arrive at.
   */
  arrivalAirport: string;
  archetype: Archetype;
  tourismTier: TourismTier;
  /** One line on what this place actually is. */
  summary: string;
  travel: TravelProfile;
  lodging: LodgingProfile;
  experience: ExperienceProfile;
  practicality: PracticalityProfile;
  /** Index 0 = January. */
  seasons: Season[];
  /** Index 0 = January. 0-5: how good a time this is to be here, all things considered. */
  suitability: number[];
  /** Sparse notes keyed by month number (1-12). */
  monthNotes: Partial<Record<number, string>>;
  risks: RiskWindow[];
  /** ISO date the curated fields above were last reviewed. */
  curatedOn: string;
}

// ---------------------------------------------------------------------------
// Climate (objective, generated by scripts/build-climate.ts)
// ---------------------------------------------------------------------------

export interface ClimateMonth {
  /** 1-12. */
  month: number;
  highF: number;
  lowF: number;
  precipIn: number;
  /** Days in the month with measurable rain (>= 0.04in / 1mm). */
  rainDays: number;
  humidityPct: number;
  sunHours: number;
  /** Sea surface temperature, coastal destinations only. */
  sstF: number | null;
}

/**
 * Day-of-year normals on a 366-day leap calendar (index 0 = 1 Jan, 59 = 29 Feb,
 * 60 = 1 Mar). Each value is smoothed over a +/-7 day window across every year
 * in the sample period, so an exact-date lookup rests on ~150 observations.
 */
export interface ClimateDaily {
  highF: number[];
  lowF: number[];
  precipIn: number[];
  /** Probability, 0-100, that a given day sees measurable rain. */
  rainDayPct: number[];
  humidityPct: number[];
  sunHours: number[];
}

export interface ClimateRecord {
  destinationId: string;
  source: Provenance;
  sstSource: Provenance | null;
  daily: ClimateDaily;
  monthly: ClimateMonth[];
}

/** Climate normals aggregated over the exact dates of a trip. */
export interface DateWindowClimate {
  startDate: string;
  endDate: string;
  days: number;
  avgHighF: number;
  avgLowF: number;
  warmestHighF: number;
  coolestLowF: number;
  totalPrecipIn: number;
  /** Expected number of days with measurable rain across the window. */
  expectedRainDays: number;
  avgHumidityPct: number;
  avgSunHours: number;
  /** Mean daylight hours over the window, computed from latitude. */
  avgDaylightHours: number;
  sunriseFirstDay: string;
  sunsetFirstDay: string;
  sstF: number | null;
}

// ---------------------------------------------------------------------------
// Preferences (personal)
// ---------------------------------------------------------------------------

export type RainTolerance = "low" | "medium" | "high";

export interface ComparisonPreferences {
  /**
   * Airports the traveller will use, in order of preference. Replaces the old single
   * `departureAirport`, which relabelled the UI without changing any number.
   */
  origins: Origin[];
  /** Alliances to restrict to. Empty means no restriction. */
  alliances: Alliance[];
  /** Specific airline codes to restrict to. Empty means no restriction. */
  airlines: string[];
  maxTravelHours: number;
  /** Target daytime high, Fahrenheit. */
  idealHighF: number;
  rainTolerance: RainTolerance;
  /** 0-5, how much beach time matters. */
  beachImportance: number;
  /** -2 = strongly city, 0 = no preference, +2 = strongly resort. */
  cityVsResort: number;
  /** 0-5, 0 = slow days, 5 = packed itinerary. */
  activityLevel: number;
  /** 0-5, 0 = crowds ruin it, 5 = crowds do not bother me. */
  crowdTolerance: number;
  /** Nightly hotel budget in USD. */
  hotelBudgetUSD: number;
  /** Destination ids to exclude from ranking. */
  exclusions: string[];
  weights: CategoryWeights;
}

export interface CategoryWeights {
  weather: number;
  seasonal: number;
  travel: number;
  lodging: number;
  experience: number;
  practicality: number;
  personalFit: number;
}

export const CATEGORY_KEYS = [
  "weather",
  "seasonal",
  "travel",
  "lodging",
  "experience",
  "practicality",
  "personalFit",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  weather: "Weather",
  seasonal: "Seasonal",
  travel: "Travel",
  lodging: "Lodging",
  experience: "Experience",
  practicality: "Practicality",
  personalFit: "Personal fit",
};

// ---------------------------------------------------------------------------
// Comparison output
// ---------------------------------------------------------------------------

/** One measurable input to a category score, kept visible so scores are auditable. */
export interface ScoreFactor {
  label: string;
  /** Formatted for display, e.g. "82 / 68 °F". */
  value: string;
  /** 0-100 contribution of this factor. */
  score: number;
  /** Share of the category score, 0-1. */
  weight: number;
  tier: Tier;
}

export interface CategoryScore {
  key: CategoryKey;
  score: number;
  factors: ScoreFactor[];
}

export type Confidence = "high" | "medium" | "low";

export interface DataWarning {
  label: string;
  /** Optional second line: what to do about it, or why it is the case. */
  detail?: string;
  severity: "info" | "warning" | "serious";
}

export interface DestinationScore {
  destination: Destination;
  /** Final score, after the seasonal viability gate. This is what the ranking uses. */
  overall: number;
  /** Weighted category score before the gate, kept visible so the adjustment is auditable. */
  rawOverall: number;
  /**
   * Multiplier applied when the catalog rates these dates a poor time to visit.
   *
   * This is the explicit form of the Phase 2 design rule. Without it a destination can
   * rank well on a month nobody should go — cheap hotels, no crowds, easy logistics —
   * because every category except the season looks good. 1.0 means no adjustment.
   */
  seasonalGate: number;
  /** Set when the journey exceeds the traveller's stated maximum travel time. */
  exceedsTravelLimit: boolean;
  /** The airport and airline routing this score was computed against. */
  route: SelectedRoute;
  categories: Record<CategoryKey, CategoryScore>;
  climate: DateWindowClimate;
  /** Estimated nightly rate for the trip's dates at the traveller's budget level. */
  estimatedNightlyUSD: number;
  estimatedLodgingUSD: number;
  season: Season;
  pros: string[];
  cons: string[];
  bestFor: string[];
  verdict: string;
  confidence: Confidence;
  warnings: DataWarning[];
}

// ---------------------------------------------------------------------------
// Trips (personal, persisted)
// ---------------------------------------------------------------------------

export const PLANNING_STATUSES = [
  "idea",
  "comparing",
  "destination_selected",
  "flights_booked",
  "hotels_booked",
  "itinerary",
  "ready",
  "completed",
] as const;

export type PlanningStatus = (typeof PLANNING_STATUSES)[number];

export const PLANNING_STATUS_LABELS: Record<PlanningStatus, string> = {
  idea: "Idea",
  comparing: "Comparing destinations",
  destination_selected: "Destination selected",
  flights_booked: "Flights booked",
  hotels_booked: "Hotels booked",
  itinerary: "Itinerary in progress",
  ready: "Ready to travel",
  completed: "Completed",
};

export type DateFlexibility = "fixed" | "few_days" | "flexible_weeks" | "month_open";

export const DATE_FLEXIBILITY_LABELS: Record<DateFlexibility, string> = {
  fixed: "Fixed dates",
  few_days: "Flexible by a few days",
  flexible_weeks: "Flexible by a week or two",
  month_open: "Month is open",
};

export type CandidateStatus = "shortlisted" | "considering" | "rejected" | "selected";

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  considering: "Considering",
  shortlisted: "Shortlisted",
  selected: "Selected",
  rejected: "Rejected",
};

export interface Trip {
  id: number;
  name: string;
  status: PlanningStatus;
  startDate: string | null;
  endDate: string | null;
  flexibility: DateFlexibility;
  /** Airports this trip will use, in order of preference. Feeds scoring, not just labels. */
  origins: Origin[];
  travelers: number;
  purpose: string;
  priorities: string;
  notes: string;
  archived: boolean;
  ownerId: string;
  permission: "private" | "shared";
  /** Primary currency for this trip (e.g., 'USD', 'EUR', 'GBP'). Used for budget display. */
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripCandidate {
  id: number;
  tripId: number;
  destinationId: string;
  status: CandidateStatus;
  /** The user's own note on this candidate — never machine-written. */
  note: string;
  createdAt: string;
}

export interface TripLink {
  id: number;
  tripId: number;
  label: string;
  url: string;
  createdAt: string;
}

/**
 * A stop on a multi-city trip.
 *
 * Note what is absent: dates. Nights are the source of truth and arrival/departure are
 * derived from the trip's start plus the nights preceding this stop, which makes gaps and
 * overlaps unrepresentable rather than merely invalid. See ADR 0010.
 */
export interface TripStop {
  id: number;
  tripId: number;
  destinationId: string;
  position: number;
  nights: number;
  note: string;
}

/** How you get from one stop to the next. */
export type TransferMode = "ground" | "short-flight" | "flight" | "long-flight";

/** How much of the trip a transfer consumes — the thing a night count alone hides. */
export type TransferBurden = "easy" | "half-day" | "full-day" | "punishing";

export interface Transfer {
  fromDestinationId: string;
  toDestinationId: string;
  /** Great-circle distance in km. Objective — computed from coordinates. */
  distanceKm: number;
  mode: TransferMode;
  /** Door-to-door estimate including airport overhead, in hours. Curated heuristic. */
  hours: number;
  burden: TransferBurden;
  /** Plain-language reading of what this costs you. */
  note: string;
}

/** A stop with everything derived: its dates, its climate, and the transfer that reaches it. */
export interface ItineraryStop {
  stop: TripStop;
  destination: Destination;
  arriveDate: string;
  departDate: string;
  climate: DateWindowClimate;
  /** The transfer that gets you here. Null for the first stop — that is the outbound flight. */
  transferIn: Transfer | null;
  warnings: DataWarning[];
}

export interface Itinerary {
  stops: ItineraryStop[];
  /** Nights the trip has, from its own dates. */
  tripNights: number;
  /** Nights allocated across stops. */
  allocatedNights: number;
  /** Positive when nights are unallocated, negative when over-allocated. */
  unallocatedNights: number;
  /** Total hours spent moving between stops — excludes the flights at either end. */
  transferHours: number;
  warnings: DataWarning[];
}

// ---------------------------------------------------------------------------
// Places (Release 3)
// ---------------------------------------------------------------------------

/**
 * Categories exist to drive staleness, not to be a taxonomy. Things that decay at the same
 * rate share a category — a restaurant and a bar both close; a beach and a viewpoint do not.
 */
export const PLACE_CATEGORIES = [
  "restaurant",
  "bar",
  "cafe",
  "shop",
  "market",
  "museum",
  "sight",
  "activity",
  "beach",
  "viewpoint",
  "neighborhood",
  "other",
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  restaurant: "Restaurant",
  bar: "Bar",
  cafe: "Café",
  shop: "Shop",
  market: "Market",
  museum: "Museum",
  sight: "Sight",
  activity: "Activity",
  beach: "Beach",
  viewpoint: "Viewpoint",
  neighborhood: "Neighbourhood",
  other: "Other",
};

export type PlacePriority = "must" | "considering" | "if_time" | "ruled_out";

export const PLACE_PRIORITY_LABELS: Record<PlacePriority, string> = {
  must: "Must do",
  considering: "Considering",
  if_time: "If there's time",
  ruled_out: "Ruled out",
};

/** Where a fact came from. Every time-sensitive field traces back to one of these. */
export interface Source {
  id: number;
  label: string;
  url: string;
  kind: "web" | "person" | "guidebook" | "provider" | "personal";
  retrievedOn: string;
}

/**
 * A saved place.
 *
 * Fields fall into three groups and the grouping is load-bearing (ADR 0014): re-verifying
 * refreshes the fetched group and must never touch the personal one.
 */
export interface Place {
  id: number;
  destinationId: string;
  /** Null for a standing note about the destination, reusable across trips. */
  tripId: number | null;
  category: PlaceCategory;

  // --- fetched / externally sourced: decays, carries a verification date ---
  name: string;
  address: string;
  neighborhood: string;
  lat: number | null;
  lon: number | null;
  hours: string;
  priceLevel: number | null;
  url: string;
  providerPlaceId: string | null;

  // --- personal: never overwritten by anything automated ---
  whyItMatters: string;
  notes: string;
  priority: PlacePriority;
  reservationRequired: boolean;

  sourceId: number | null;
  /** Null means never verified — a worse state than stale, and a distinct one. */
  verifiedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Freshness = "fresh" | "aging" | "stale" | "unverified";

// ---------------------------------------------------------------------------
// Origins, airlines and routes (Release 4 groundwork)
// ---------------------------------------------------------------------------

/**
 * The New York airports, in the traveller's order of preference.
 *
 * Order is meaningful: when two origins offer an equally good route, the earlier one wins.
 * Derived from src/lib/config/home.ts which is the authoritative source.
 */
export const ORIGINS = ["JFK", "LGA", "EWR"] as const;
export type Origin = (typeof ORIGINS)[number];

export const ORIGIN_LABELS: Record<Origin, string> = {
  JFK: "JFK — Kennedy",
  LGA: "LGA — LaGuardia",
  EWR: "EWR — Newark",
};

export type Alliance = "star" | "skyteam" | "oneworld" | "unaligned";

export const ALLIANCES = ["star", "skyteam", "oneworld", "unaligned"] as const;

export const ALLIANCE_LABELS: Record<Alliance, string> = {
  star: "Star Alliance",
  skyteam: "SkyTeam",
  oneworld: "Oneworld",
  unaligned: "No alliance",
};

export interface Airline {
  /** IATA two-character code. */
  code: string;
  name: string;
  alliance: Alliance;
  /** New York airports this carrier operates from. */
  origins: Origin[];
}

/**
 * How you actually get somewhere from one specific airport.
 *
 * This replaces the single JFK-shaped `TravelProfile` figure for scoring purposes. The
 * profile keeps arrival ease and prose; the numbers live here, per origin.
 */
export interface OriginRoute {
  origin: Origin;
  nonstop: boolean;
  /** Door-to-gate-to-door total including connections, in hours. */
  typicalTotalHours: number;
  typicalConnections: number;
  /** IATA codes of carriers realistically offering this routing. */
  airlines: string[];
  /** Seasonal or otherwise limited service — true means do not count on it year-round. */
  seasonal: boolean;
}

export interface DestinationRoutes {
  destinationId: string;
  /** Primary arrival airport, for reference. */
  arrivalAirport: string;
  byOrigin: Record<Origin, OriginRoute>;
  /**
   * Route data is the most volatile curated data in the app — networks change every
   * season. This date is not decorative.
   */
  verifiedOn: string;
}

/** The route actually chosen for a comparison, and why. */
export interface SelectedRoute {
  route: OriginRoute;
  /** Alliances represented among the airlines on this route. */
  alliances: Alliance[];
  /** True when the traveller's airline filter removed every other option. */
  constrainedByFilter: boolean;
  /** True when no route survives the filter at all. */
  noRouteMatches: boolean;
}
