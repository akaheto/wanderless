"use client";

import { useState, useMemo } from "react";
import { DESTINATIONS } from "@/data/destinations";
import type { Destination } from "@/lib/domain/types";
import Link from "next/link";

const REGIONS = [
  "Southeast Asia",
  "East Asia",
  "South America",
  "Australia & Oceania",
  "Caribbean & Mexico",
  "Middle East",
  "North Africa",
  "Southern Africa",
  "Indian Ocean",
  "Western Europe",
  "Eastern Europe",
  "Northern Europe",
  "Southern Europe",
];

type SortBy = "name" | "cost-low" | "cost-high" | "temp-warm" | "travel-easy";

export default function DestinationsPage() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");

  const filtered = useMemo(() => {
    let results = DESTINATIONS;

    if (selectedRegion) {
      results = results.filter((d) => d.region === selectedRegion);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.country.toLowerCase().includes(term) ||
          d.area.toLowerCase().includes(term)
      );
    }

    return results.sort((a, b) => {
      switch (sortBy) {
        case "cost-low":
          return a.lodging.fourStarUSD - b.lodging.fourStarUSD;
        case "cost-high":
          return b.lodging.fiveStarUSD - a.lodging.fiveStarUSD;
        case "travel-easy":
          return b.travel.arrivalEase - a.travel.arrivalEase;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [selectedRegion, searchTerm, sortBy]);

  return (
    <div className="space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold">Destination Catalog</h1>
        <p className="mt-2 text-ink-3">{filtered.length} destinations in real-time</p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 rounded-lg border border-line bg-surface-1 p-6">
        <div>
          <label className="block text-sm font-medium">Search</label>
          <input
            type="text"
            placeholder="City, country, or region..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1 w-full rounded border border-line bg-surface-0 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Region</label>
            <select
              value={selectedRegion || ""}
              onChange={(e) => setSelectedRegion(e.target.value || null)}
              className="mt-1 w-full rounded border border-line bg-surface-0 px-3 py-2 text-sm"
            >
              <option value="">All regions</option>
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="mt-1 w-full rounded border border-line bg-surface-0 px-3 py-2 text-sm"
            >
              <option value="name">Name (A–Z)</option>
              <option value="cost-low">Budget 4-star</option>
              <option value="cost-high">Luxury 5-star</option>
              <option value="travel-easy">Easiest arrival</option>
            </select>
          </div>
        </div>
      </div>

      {/* Destinations Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((dest) => (
          <DestinationCard key={dest.id} destination={dest} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-line bg-surface-1 px-6 py-8 text-center">
          <p className="text-ink-3">No destinations match your filters.</p>
        </div>
      )}

      {/* Submit New City CTA */}
      <div className="mt-12 rounded-lg border border-accent bg-accent/5 px-6 py-8">
        <h3 className="font-semibold">Can't find what you're looking for?</h3>
        <p className="mt-1 text-sm text-ink-3">Request a new city — we'll research it with real data.</p>
        <Link
          href="/destinations/suggest"
          className="mt-4 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Suggest a city
        </Link>
      </div>
    </div>
  );
}

function DestinationCard({ destination }: { destination: Destination }) {
  const avgCost = Math.round((destination.lodging.fourStarUSD + destination.lodging.fiveStarUSD) / 2);

  return (
    <Link href={`/destinations/${destination.id}`}>
      <div className="group rounded-lg border border-line bg-surface-1 p-4 transition hover:border-accent hover:shadow-md">
        <div className="space-y-2">
          <div>
            <h3 className="font-semibold group-hover:text-accent">{destination.name}</h3>
            <p className="text-xs text-ink-4">
              {destination.area}, {destination.country}
            </p>
          </div>

          <p className="text-xs leading-relaxed text-ink-3">{destination.summary}</p>

          <div className="flex flex-wrap gap-1 pt-2">
            {destination.travel.nonstop && (
              <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                Nonstop
              </span>
            )}
            <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              ${avgCost}/night
            </span>
            <span className="inline-block rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
              {destination.archetype}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
