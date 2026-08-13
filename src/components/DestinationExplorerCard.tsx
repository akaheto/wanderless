"use client";

import { useState } from "react";
import Link from "next/link";
import type { Destination } from "@/lib/domain/types";
import { DESTINATIONS } from "@/data/destinations";
import { climateFor } from "@/lib/climate";
import { Badge, Card } from "./ui";

export interface DestinationExplorerCardProps {
  destination?: Destination;
  selectedMonth?: number;
  onSearch?: (destinationId: string) => void;
}

const ARCHETYPE_EMOJI: Record<string, string> = {
  city: "🏙️",
  beach: "🏖️",
  resort: "🏨",
  nature: "🏔️",
  mixed: "🌍",
};

const VIBE_TAGS = (archetype: string): string[] => {
  const map: Record<string, string[]> = {
    city: ["✨ Urban", "🍽️ Foodie", "🎭 Cultural"],
    beach: ["🏖️ Coastal", "🌊 Tropical", "☀️ Relaxed"],
    resort: ["🏨 Luxury", "🌴 All-inclusive", "☀️ Relaxing"],
    nature: ["🏔️ Alpine", "🥾 Adventure", "🌲 Wilderness"],
    mixed: ["🌍 Diverse", "✨ Mixed vibes", "🎯 Flexible"],
  };
  return map[archetype] || ["🌟 Explore"];
};

export function DestinationExplorerCard({
  destination,
  selectedMonth,
  onSearch,
}: DestinationExplorerCardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const filteredDestinations = searchQuery
    ? DESTINATIONS.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.area.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const climate = destination ? climateFor(destination.id) : null;
  const monthClimate = climate && selectedMonth ? climate.monthly[selectedMonth - 1] : null;

  const handleSelect = (destId: string) => {
    onSearch?.(destId);
    setSearchQuery("");
    setShowResults(false);
  };

  return (
    <Card className="col-span-full md:col-span-2 overflow-hidden">
      {destination && climate ? (
        <>
          {/* Hero Image */}
          <div className="relative h-80 bg-gradient-to-br from-teal-400 to-cyan-500 overflow-hidden">
            <div className="absolute inset-0 bg-black/20" />

            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              {/* Top Right: Climate Sparkline */}
              <div className="flex justify-end">
                <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-white text-sm">
                  <div className="font-medium mb-1">
                    {monthClimate?.highF}°–{monthClimate?.lowF}°F
                  </div>
                  <div className="flex gap-1 text-xs">
                    {climate.monthly.map((day, i) => (
                      <div
                        key={i}
                        className="w-2 h-6 rounded-full"
                        style={{
                          backgroundColor: day.rainDays > 15 ? "#3b82f6" : "#fbbf24",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Left: Destination Info */}
              <div>
                <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                  {destination.name}
                </h2>
                <p className="text-gray-200 drop-shadow-lg mb-3">{destination.area}</p>

                {/* Vibe Tags */}
                <div className="flex flex-wrap gap-2">
                  {VIBE_TAGS(destination.archetype).map((tag) => (
                    <div
                      key={tag}
                      className="px-3 py-1 rounded-full text-sm text-white bg-white/20 backdrop-blur"
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar & Info */}
          <div className="p-6 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              {showResults && filteredDestinations.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-line rounded-lg shadow-lg z-10">
                  {filteredDestinations.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleSelect(d.id)}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg text-sm"
                    >
                      <div className="font-medium text-ink-1">{d.name}</div>
                      <div className="text-xs text-ink-3">{d.area}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href={`/destinations/${destination.id}`}
              className="inline-block text-sm font-medium text-teal-600 hover:underline"
            >
              View full profile →
            </Link>
          </div>
        </>
      ) : (
        <div className="h-80 bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 mb-2 text-4xl">🌍</div>
            <p className="text-gray-500">Select a destination to explore</p>
          </div>
        </div>
      )}
    </Card>
  );
}
