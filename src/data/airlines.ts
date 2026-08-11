import type { Airline, Alliance, Origin } from "@/lib/domain/types";

/*
 * Airlines serving the New York airports.
 *
 * CURATED DATA, and the most volatile in the app. Route networks change every season —
 * carriers add and drop New York, alliances gain and lose members. Everything here carries
 * a review date, and the UI says so rather than presenting it as measured fact.
 *
 * Scope is deliberate: carriers with a scheduled New York presence. A comprehensive world
 * airline list would be longer and less useful, since the question being asked is always
 * "what can I fly from here".
 */

export const AIRLINES_CURATED_ON = "2026-08-11";

const airline = (
  code: string,
  name: string,
  alliance: Alliance,
  origins: Origin[],
): Airline => ({ code, name, alliance, origins });

export const AIRLINES: Airline[] = [
  // --- Star Alliance -------------------------------------------------------
  airline("UA", "United", "star", ["EWR", "JFK", "LGA"]),
  airline("AC", "Air Canada", "star", ["JFK", "LGA", "EWR"]),
  airline("LH", "Lufthansa", "star", ["JFK", "EWR"]),
  airline("LX", "Swiss", "star", ["JFK", "EWR"]),
  airline("OS", "Austrian", "star", ["EWR"]),
  airline("SN", "Brussels Airlines", "star", ["JFK", "EWR"]),
  airline("TP", "TAP Air Portugal", "star", ["JFK", "EWR"]),
  airline("SK", "SAS", "star", ["EWR", "JFK"]),
  airline("TK", "Turkish Airlines", "star", ["JFK", "EWR"]),
  airline("NH", "ANA", "star", ["JFK"]),
  airline("SQ", "Singapore Airlines", "star", ["JFK", "EWR"]),
  airline("AI", "Air India", "star", ["JFK", "EWR"]),
  airline("ET", "Ethiopian Airlines", "star", ["EWR"]),
  airline("MS", "EgyptAir", "star", ["JFK"]),
  airline("LO", "LOT Polish Airlines", "star", ["JFK", "EWR"]),
  airline("AV", "Avianca", "star", ["JFK", "EWR"]),
  airline("CM", "Copa Airlines", "star", ["JFK"]),
  airline("OZ", "Asiana", "star", ["JFK"]),
  airline("BR", "EVA Air", "star", ["JFK"]),
  airline("A3", "Aegean", "star", ["JFK"]),

  // --- SkyTeam -------------------------------------------------------------
  airline("DL", "Delta", "skyteam", ["JFK", "LGA", "EWR"]),
  airline("AF", "Air France", "skyteam", ["JFK"]),
  airline("KL", "KLM", "skyteam", ["JFK"]),
  airline("VS", "Virgin Atlantic", "skyteam", ["JFK", "EWR"]),
  airline("KE", "Korean Air", "skyteam", ["JFK"]),
  airline("AM", "Aeroméxico", "skyteam", ["JFK"]),
  airline("AZ", "ITA Airways", "skyteam", ["JFK"]),
  airline("MU", "China Eastern", "skyteam", ["JFK"]),
  airline("CI", "China Airlines", "skyteam", ["JFK"]),
  airline("KQ", "Kenya Airways", "skyteam", ["JFK"]),
  airline("SV", "Saudia", "skyteam", ["JFK"]),
  airline("ME", "Middle East Airlines", "skyteam", ["JFK"]),
  airline("UX", "Air Europa", "skyteam", ["JFK"]),
  airline("AR", "Aerolíneas Argentinas", "skyteam", ["JFK"]),

  // --- Oneworld ------------------------------------------------------------
  airline("AA", "American", "oneworld", ["JFK", "LGA", "EWR"]),
  airline("BA", "British Airways", "oneworld", ["JFK", "EWR"]),
  airline("IB", "Iberia", "oneworld", ["JFK", "EWR"]),
  airline("AY", "Finnair", "oneworld", ["JFK"]),
  airline("QR", "Qatar Airways", "oneworld", ["JFK", "EWR"]),
  airline("CX", "Cathay Pacific", "oneworld", ["JFK"]),
  airline("JL", "Japan Airlines", "oneworld", ["JFK"]),
  airline("QF", "Qantas", "oneworld", ["JFK"]),
  airline("AT", "Royal Air Maroc", "oneworld", ["JFK"]),
  airline("AS", "Alaska Airlines", "oneworld", ["JFK", "EWR"]),

  // --- No alliance ---------------------------------------------------------
  // Included deliberately: several of these are the best or only way to reach a
  // destination in the catalog, and an alliance-only view would hide them.
  airline("B6", "JetBlue", "unaligned", ["JFK", "LGA", "EWR"]),
  airline("EK", "Emirates", "unaligned", ["JFK", "EWR"]),
  airline("EY", "Etihad", "unaligned", ["JFK"]),
  airline("LY", "El Al", "unaligned", ["JFK", "EWR"]),
  airline("FI", "Icelandair", "unaligned", ["JFK", "EWR"]),
  airline("EI", "Aer Lingus", "unaligned", ["JFK", "EWR"]),
  airline("N0", "Norse Atlantic", "unaligned", ["JFK"]),
  airline("LA", "LATAM", "unaligned", ["JFK", "EWR"]),
  airline("AD", "Azul", "unaligned", ["JFK"]),
  airline("BW", "Caribbean Airlines", "unaligned", ["JFK"]),
  airline("JU", "Air Serbia", "unaligned", ["JFK"]),
  airline("WS", "WestJet", "unaligned", ["JFK", "LGA", "EWR"]),
  airline("BF", "French Bee", "unaligned", ["EWR"]),
  airline("B0", "La Compagnie", "unaligned", ["EWR"]),
  airline("WN", "Southwest", "unaligned", ["LGA", "EWR"]),
  airline("NK", "Spirit", "unaligned", ["LGA", "EWR"]),
  airline("F9", "Frontier", "unaligned", ["LGA", "EWR"]),
];

const BY_CODE = new Map(AIRLINES.map((a) => [a.code, a]));

export function getAirline(code: string): Airline | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function airlineName(code: string): string {
  return getAirline(code)?.name ?? code;
}

export function allianceOf(code: string): Alliance {
  return getAirline(code)?.alliance ?? "unaligned";
}

/** Distinct alliances represented by a set of airline codes, in a stable order. */
export function alliancesFor(codes: string[]): Alliance[] {
  const order: Alliance[] = ["star", "skyteam", "oneworld", "unaligned"];
  const present = new Set(codes.map(allianceOf));
  return order.filter((a) => present.has(a));
}

export function airlinesByAlliance(alliance: Alliance): Airline[] {
  return AIRLINES.filter((a) => a.alliance === alliance);
}

export function airlinesAtOrigin(origin: Origin): Airline[] {
  return AIRLINES.filter((a) => a.origins.includes(origin));
}
