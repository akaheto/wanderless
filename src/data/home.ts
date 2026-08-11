/**
 * Re-export home base configuration from the centralized location.
 *
 * This file maintains backward compatibility with existing imports while
 * pointing to src/lib/config/home.ts as the authoritative source.
 */

export { HOME, BASELINE_ORIGIN, airportInfo, airportNote, type AirportInfo, type HomeBase } from "@/lib/config/home";
