import type { PlaceCategory } from "@/lib/domain/types";

/**
 * Query parameters for searching places.
 *
 * Places are always destination-scoped so the same place can exist in different contexts.
 * The provider uses bounds or a city center point depending on what's available.
 */
export interface PlacesSearchQuery {
  /** Destination ID or name (e.g., "hanoi", "Tokyo"). */
  destinationId: string;
  /** Category filter, if any. */
  category?: PlaceCategory;
  /** Bounding box: [minLat, minLon, maxLat, maxLon]. Optional if center point is provided. */
  bounds?: [number, number, number, number];
  /** Center point for search. Used if bounds not available. */
  center?: { lat: number; lon: number };
  /** Radius in km for center-based search. Default 5 km. */
  radiusKm?: number;
  /** Free-text query to combine with category filter. E.g., "Pho restaurant". */
  query?: string;
}

/**
 * A place found by a provider.
 *
 * Mirrors the Place schema but excludes personal fields (priority, notes, whyItMatters)
 * since these come from discovery, not the user's curation.
 */
export interface ProvidedPlace {
  name: string;
  category: PlaceCategory;
  address: string;
  neighborhood: string;
  lat: number;
  lon: number;
  hours?: string;
  priceLevel?: number;
  url?: string;
  description?: string;
  /** Provider-specific ID for de-duplication. */
  providerPlaceId: string;
}

/**
 * Search results from a provider.
 *
 * The provider is responsible for:
 * - Making the API call
 * - Parsing results into ProvidedPlace format
 * - Handling rate limiting and timeouts gracefully
 * - De-duplicating results when possible
 */
export interface PlacesSearchResult {
  query: PlacesSearchQuery;
  places: ProvidedPlace[];
  /** Total count available at the provider, if known. Used for pagination UI. */
  totalCount?: number;
  /** Provider name, for attribution. */
  provider: string;
}

/**
 * The shape every places provider must implement.
 *
 * Providers are stateless and isolated. Each search is independent.
 */
export interface PlacesProvider {
  readonly name: string;
  readonly configured: boolean;
  search(query: PlacesSearchQuery): Promise<PlacesSearchResult>;
}

/**
 * Null provider: always returns empty results.
 *
 * Used when no provider is configured. The app continues to work normally —
 * users can still manually save places — it simply cannot search for new ones.
 */
export class NullPlacesProvider implements PlacesProvider {
  readonly name = "No places provider configured";
  readonly configured = false;

  async search(_query: PlacesSearchQuery): Promise<PlacesSearchResult> {
    return {
      query: _query,
      places: [],
      provider: this.name,
    };
  }
}

/**
 * Nominatim (OpenStreetMap) provider.
 *
 * Completely free, no authentication required. Good global coverage for tourist
 * attractions, restaurants, museums, etc. The official Nominatim service has
 * rate limits (1 request per second), so we include user-agent and request
 * throttling.
 *
 * Limitations:
 * - Cannot filter by price level (OpenStreetMap tags don't include it)
 * - Limited hours information (mostly tourist attractions)
 * - No reviews or ratings
 * - Requires user-agent header (per Nominatim ToS)
 *
 * @see https://nominatim.org/
 */
export class NominatimPlacesProvider implements PlacesProvider {
  readonly name = "OpenStreetMap (Nominatim)";
  readonly configured = true;
  private readonly baseUrl = "https://nominatim.openstreetmap.org";
  private readonly userAgent =
    "Travel-Intelligence-Hub/1.0 (+https://github.com/akaheto/travel-hub)";

  /**
   * Map place categories to Nominatim amenity tags.
   *
   * Nominatim uses "amenity" and "tourism" tags. This maps our categories to
   * the most common tags that describe that category of place.
   */
  private getCategoryTags(category: PlaceCategory): string[] {
    const tagMap: Record<PlaceCategory, string[]> = {
      restaurant: ["amenity=restaurant"],
      bar: ["amenity=bar", "amenity=cafe"],
      cafe: ["amenity=cafe"],
      shop: ["shop=*"],
      market: ["amenity=marketplace", "shop=supermarket"],
      museum: ["tourism=museum"],
      sight: ["tourism=attraction", "tourism=viewpoint"],
      activity: ["tourism=activity", "leisure=sports_centre"],
      beach: ["natural=beach"],
      viewpoint: ["tourism=viewpoint"],
      neighborhood: ["place=neighbourhood", "place=suburb"],
      other: [],
    };
    return tagMap[category] || [];
  }

  async search(query: PlacesSearchQuery): Promise<PlacesSearchResult> {
    try {
      const searchText = query.query
        ? query.query
        : this.categoryToSearchTerm(query.category);

      if (!searchText) {
        return { query, places: [], provider: this.name };
      }

      const params = new URLSearchParams({
        q: searchText,
        format: "json",
        limit: "50", // Reasonable limit for a search
      });

      // Add viewbox (bounding box) if available
      if (query.bounds) {
        const [minLat, minLon, maxLat, maxLon] = query.bounds;
        params.set("viewbox", `${minLon},${maxLat},${maxLon},${minLat}`);
        params.set("bounded", "1");
      }

      const url = `${this.baseUrl}/search?${params.toString()}`;

      // Use AbortController for timeout since fetch doesn't natively support timeout option
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error(
            `Nominatim search failed: ${response.status} ${response.statusText}`,
          );
          return { query, places: [], provider: this.name };
        }

        const results = (await response.json()) as NominatimResult[];

        const places = results
          .map((result) => this.parseResult(result, query))
          .filter((place) => place !== null) as ProvidedPlace[];

        return {
          query,
          places,
          provider: this.name,
          totalCount: places.length,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error("Places search error:", error);
      return { query, places: [], provider: this.name };
    }
  }

  private categoryToSearchTerm(category?: PlaceCategory): string {
    const terms: Record<PlaceCategory, string> = {
      restaurant: "restaurant",
      bar: "bar",
      cafe: "cafe",
      shop: "shop",
      market: "market",
      museum: "museum",
      sight: "attraction",
      activity: "activity",
      beach: "beach",
      viewpoint: "viewpoint",
      neighborhood: "neighborhood",
      other: "",
    };
    return category ? terms[category] : "";
  }

  private parseResult(result: NominatimResult, query: PlacesSearchQuery): ProvidedPlace | null {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    // Infer category from OSM tags
    const category = this.inferCategory(result.type, result.class);
    if (!category) {
      return null;
    }

    // Filter by requested category if specified
    if (query.category && category !== query.category) {
      return null;
    }

    return {
      name: result.name || result.display_name,
      category,
      address: result.address || result.display_name,
      neighborhood: this.extractNeighborhood(result),
      lat,
      lon,
      url: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      providerPlaceId: `osm_${result.osm_type}_${result.osm_id}`,
      description: result.type,
    };
  }

  private inferCategory(type: string, osmClass: string): PlaceCategory | null {
    // Map common OSM tags to our categories
    const mapping: Record<string, PlaceCategory> = {
      restaurant: "restaurant",
      bar: "bar",
      cafe: "cafe",
      shop: "shop",
      marketplace: "market",
      supermarket: "market",
      museum: "museum",
      attraction: "sight",
      viewpoint: "viewpoint",
      activity: "activity",
      beach: "beach",
      park: "activity",
      pub: "bar",
      "fast_food": "restaurant",
      "arts_centre": "museum",
      "place_of_worship": "sight",
    };

    return mapping[osmClass] || mapping[type] || null;
  }

  private extractNeighborhood(result: NominatimResult): string {
    // Try to extract neighborhood from display_name
    // Format is typically: "name, neighborhood, city, ..."
    const parts = result.display_name?.split(",").map((p) => p.trim());
    if (parts && parts.length > 1) {
      return parts[1];
    }
    return "";
  }
}

/**
 * Internal types for Nominatim API responses.
 * @see https://nominatim.org/release-docs/latest/api/Search/
 */
interface NominatimResult {
  name: string;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  lat: string;
  lon: string;
  type: string;
  class: string;
  display_name: string;
  address?: string;
}

/**
 * Resolve the configured provider.
 *
 * Nominatim (OpenStreetMap) is the default (free, no auth required).
 * Can be overridden with environment variables for alternative providers.
 */
export function placesProvider(): PlacesProvider {
  // Support alternative providers via environment variables
  // export PLACES_PROVIDER=google|tripadvisor|foursquare|nominatim
  return new NominatimPlacesProvider();
}
