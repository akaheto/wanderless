import type { PlaceCategory } from "@/lib/domain/types";

/*
 * Place enrichment.
 *
 * The whole point of this file is that it is optional (ADR 0014). The default
 * implementation does nothing, reports itself as unconfigured, and the app is completely
 * usable with it — every field on a place is manually enterable.
 *
 * A provider, if one is ever configured, only ever runs from an explicit user action. No
 * page render calls anything here.
 */

/** What a provider can offer to pre-fill. Everything is optional except the name. */
export interface PlaceCandidate {
  name: string;
  address?: string;
  neighborhood?: string;
  lat?: number;
  lon?: number;
  hours?: string;
  /** 1-4, matching the convention most providers use. */
  priceLevel?: number;
  url?: string;
  category?: PlaceCategory;
  /** Provider's own identifier, kept for de-duplication. */
  providerPlaceId?: string;
}

export interface PlaceLookup {
  /** Shown in the UI and recorded as the source label when a candidate is accepted. */
  readonly name: string;
  /** False means the UI offers manual entry only, and says why. */
  readonly configured: boolean;
  search(query: string, near?: { lat: number; lon: number }): Promise<PlaceCandidate[]>;
}

/**
 * The default. Returns nothing and says so.
 *
 * This is not a stub awaiting replacement — it is the supported configuration. Manual entry
 * is the primary path, because the best recommendations come from people, and no places API
 * knows what a friend told you.
 */
export class NullPlaceLookup implements PlaceLookup {
  readonly name = "Manual entry";
  readonly configured = false;

  // Parameters are declared but unused: the signature has to match the interface so
  // callers can be written against `PlaceLookup` without knowing which one they hold.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async search(query: string, near?: { lat: number; lon: number }): Promise<PlaceCandidate[]> {
    return [];
  }
}

/**
 * Resolve the configured lookup.
 *
 * Deliberately reads configuration rather than taking a key: a provider is wired in by
 * adding an implementation here, and until one is, this returns the null lookup. There is
 * no code path that requires a credential to exist.
 */
export function placeLookup(): PlaceLookup {
  // When a provider is added, construct it here from its own env var and return it only
  // if that var is present. The null lookup stays the fallback, never an error.
  return new NullPlaceLookup();
}

/** Why manual entry is the only option, phrased for the UI rather than for a log. */
export function lookupUnavailableReason(lookup: PlaceLookup): string | null {
  if (lookup.configured) return null;
  return "No place provider is configured, so details are entered by hand. That is the normal path — the best recommendations usually come from people rather than an API.";
}
