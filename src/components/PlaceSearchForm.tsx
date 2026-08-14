"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlaceCategory } from "@/lib/domain/types";
import { PLACE_CATEGORIES, PLACE_CATEGORY_LABELS } from "@/lib/domain/types";
import { searchPlacesAction, importPlaceAction } from "@/app/actions";
import { Button, Card, CardHeader, Empty } from "./ui";

/**
 * A result from a place search API provider.
 *
 * Mirrors the ProvidedPlace interface from the provider, but with a flag
 * for whether it's been imported to the trip.
 */
interface SearchResult {
  name: string;
  category: PlaceCategory;
  address: string;
  lat: number;
  lon: number;
  url?: string;
  providerPlaceId: string;
  neighborhood: string;
  description?: string;
  imported?: boolean;
}

export function PlaceSearchForm({
  destinationId,
  tripId,
}: {
  destinationId: string;
  tripId?: number;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<PlaceCategory | "">("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const places = await searchPlacesAction(destinationId, category || undefined, query);
      setResults(
        places.map((p) => ({
          ...p,
          category: p.category as PlaceCategory,
          imported: false,
        })),
      );
      setSearched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Search places"
        note="Find restaurants, attractions, and activities from local databases."
      />

      <div className="divide-y divide-line">
        <form onSubmit={handleSearch} className="space-y-4 px-4 py-5">
          <div>
            <label htmlFor="search-query" className="block text-sm font-medium text-text-primary">
              Search
            </label>
            <input
              id="search-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., 'Pho restaurant', 'Beach', 'Museum'"
              className="mt-1 block w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="search-category" className="block text-sm font-medium text-text-primary">
              Category (optional)
            </label>
            <select
              id="search-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PlaceCategory)}
              className="mt-1 block w-full rounded border border-line px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {PLACE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {PLACE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            disabled={loading || (!query && !category)}
            variant="primary"
            className="w-full"
          >
            {loading ? "Searching..." : "Search"}
          </Button>
        </form>

        {error && (
          <div className="bg-critical/10 px-4 py-3 text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {searched && results.length === 0 && !error && (
          <div className="px-4 py-5">
            <Empty
              title="No places found"
              body="Try a different search query or category."
            />
          </div>
        )}

        {results.length > 0 && (
          <div className="px-4 py-5">
            <div className="mb-3 text-sm text-text-secondary">
              Found {results.length} place{results.length === 1 ? "" : "s"}
            </div>
            <div className="space-y-3">
              {results.map((place) => (
                <PlaceSearchResult
                  key={place.providerPlaceId}
                  place={place}
                  tripId={tripId}
                  destinationId={destinationId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function PlaceSearchResult({
  place,
  tripId,
  destinationId,
}: {
  place: SearchResult;
  tripId?: number;
  destinationId: string;
}) {
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    if (!tripId) {
      alert("No trip selected");
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("tripId", String(tripId));
      formData.set("destinationId", destinationId);
      formData.set("category", place.category);
      formData.set("name", place.name);
      formData.set("address", place.address);
      formData.set("neighborhood", place.neighborhood);
      formData.set("lat", String(place.lat));
      formData.set("lon", String(place.lon));
      formData.set("url", place.url || "");
      formData.set("providerPlaceId", place.providerPlaceId);

      await importPlaceAction(formData);
      place.imported = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      alert(`Error: ${message}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex items-start justify-between rounded border border-line p-3">
      <div className="flex-1">
        <div className="font-medium text-text-primary">{place.name}</div>
        <div className="mt-1 text-xs text-text-secondary">
          {place.address}
          {place.neighborhood && <> • {place.neighborhood}</>}
        </div>
        {place.description && (
          <div className="mt-1 text-xs text-text-tertiary">{place.description}</div>
        )}
        {place.url && (
          <div className="mt-2">
            <a
              href={place.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              View on map →
            </a>
          </div>
        )}
      </div>
      <Button
        type="button"
        onClick={handleImport}
        disabled={importing || place.imported}
        variant="secondary"
        className="ml-2 whitespace-nowrap text-xs disabled:opacity-50"
      >
        {importing ? "..." : place.imported ? "Added" : "Add"}
      </Button>
    </div>
  );
}
