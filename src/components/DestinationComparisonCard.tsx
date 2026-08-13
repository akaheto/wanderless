"use client";

import { useState } from "react";
import Link from "next/link";
import type { Destination } from "@/lib/domain/types";
import { FactorCard } from "./FactorCard";
import { SeasonalGateBanner } from "./SeasonalGateBanner";
import { Badge, Button } from "./ui";

export interface DestinationWithScore {
  destination: Destination;
  score: number;
  scoreBreakdown: Record<string, { score: number; weight: number }>;
  seasonalGate: number;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    explanation: string;
    category: string;
  }>;
  selectedMonth?: number;
}

interface DestinationComparisonCardProps extends DestinationWithScore {
  isSelected?: boolean;
  onSelect?: (destinationId: string) => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 90) return "bg-green-700";
  if (score >= 75) return "bg-green-600";
  if (score >= 50) return "bg-amber-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-600";
};

export function DestinationComparisonCard({
  destination,
  score,
  seasonalGate,
  factors,
  isSelected,
  onSelect,
  selectedMonth,
}: DestinationComparisonCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const gradientBg =
    destination.archetype === "city"
      ? "from-blue-400 to-blue-500"
      : destination.archetype === "beach"
        ? "from-cyan-400 to-blue-400"
        : destination.archetype === "resort"
          ? "from-amber-300 to-orange-400"
          : "from-green-400 to-emerald-500";

  return (
    <div
      className={`rounded-xl overflow-hidden border-2 transition-all ${
        isSelected ? "border-teal-500 shadow-lg" : "border-transparent shadow-md"
      }`}
    >
      {/* Hero Image */}
      <div className={`h-32 bg-gradient-to-br ${gradientBg} relative`}>
        <div className="absolute inset-0 bg-black/20" />

        {/* Score Badge */}
        <div
          className={`absolute top-3 right-3 w-14 h-14 ${getScoreColor(score)} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}
        >
          {Math.round(score)}
        </div>

        {/* Selection Checkbox */}
        {onSelect && (
          <button
            onClick={() => onSelect(destination.id)}
            className="absolute top-3 left-3 w-6 h-6 rounded border-2 border-white bg-white/20 flex items-center justify-center cursor-pointer"
          >
            {isSelected && <span className="text-teal-600 font-bold">✓</span>}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Name */}
        <div>
          <h3 className="text-lg font-bold text-ink-1">{destination.name}</h3>
          <p className="text-sm text-ink-3">{destination.area}</p>
        </div>

        {/* Seasonal Gate Warning */}
        {selectedMonth && seasonalGate < 0.85 && (
          <SeasonalGateBanner
            destinationName={destination.name}
            month={selectedMonth}
            currentRating={destination.suitability[selectedMonth - 1] ?? 3}
            gate={seasonalGate}
          />
        )}

        {/* Factors Grid */}
        <div className="grid grid-cols-2 gap-2">
          {factors.slice(0, 6).map((factor) => (
            <FactorCard key={factor.category} {...factor} />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-line">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-teal-600 hover:underline flex-1 text-left"
          >
            {showDetails ? "Hide details" : "Show details"}
          </button>
          <Link
            href={`/destinations/${destination.id}`}
            className="text-sm text-teal-600 hover:underline"
          >
            Explore →
          </Link>
        </div>

        {/* Details */}
        {showDetails && (
          <div className="pt-3 space-y-2 border-t border-line">
            {factors.map((factor) => (
              <div key={factor.category} className="text-sm">
                <div className="font-medium text-ink-2">{factor.name}</div>
                <div className="text-ink-3">{factor.explanation}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
