"use client";

import { useState, useMemo } from "react";
import { DestinationComparisonCard, type DestinationWithScore } from "./DestinationComparisonCard";
import { Button, Card, CardHeader } from "./ui";

type SortBy = "score" | "cost" | "vibe";

interface ComparisonGridProps {
  destinations: DestinationWithScore[];
  selectedMonth?: number;
  onSelect?: (destinationId: string) => void;
}

export function ComparisonGrid({
  destinations,
  selectedMonth,
  onSelect,
}: ComparisonGridProps) {
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sortedDestinations = useMemo(() => {
    const sorted = [...destinations];
    if (sortBy === "score") {
      sorted.sort((a, b) => b.score - a.score);
    } else if (sortBy === "cost") {
      sorted.sort((a, b) => {
        const costA = a.factors.find((f) => f.category === "cost")?.score ?? 50;
        const costB = b.factors.find((f) => f.category === "cost")?.score ?? 50;
        return costA - costB; // Lower cost = better
      });
    } else if (sortBy === "vibe") {
      sorted.sort((a, b) => {
        const vibeA = a.factors.find((f) => f.category === "experience")?.score ?? 50;
        const vibeB = b.factors.find((f) => f.category === "experience")?.score ?? 50;
        return vibeB - vibeA;
      });
    }
    return sorted;
  }, [destinations, sortBy]);

  const handleSelect = (destinationId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(destinationId)) {
      newSelected.delete(destinationId);
    } else {
      newSelected.add(destinationId);
    }
    setSelectedIds(newSelected);
    onSelect?.(destinationId);
  };

  if (destinations.length === 0) {
    return (
      <Card>
        <CardHeader title="Comparison" />
        <div className="px-4 py-8 text-center text-ink-3">
          <p>Add destinations to compare them side by side.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm text-ink-3 flex items-center">Sort by:</span>
        <Button
          variant={sortBy === "score" ? "primary" : "secondary"}
          onClick={() => setSortBy("score")}
          className="text-sm"
        >
          Score ⬇️
        </Button>
        <Button
          variant={sortBy === "cost" ? "primary" : "secondary"}
          onClick={() => setSortBy("cost")}
          className="text-sm"
        >
          Cost ⬆️
        </Button>
        <Button
          variant={sortBy === "vibe" ? "primary" : "secondary"}
          onClick={() => setSortBy("vibe")}
          className="text-sm"
        >
          Vibe ⬇️
        </Button>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedDestinations.map((dest) => (
          <DestinationComparisonCard
            key={dest.destination.id}
            {...dest}
            isSelected={selectedIds.has(dest.destination.id)}
            onSelect={handleSelect}
            selectedMonth={selectedMonth}
          />
        ))}
      </div>

      {/* Selected Count */}
      {selectedIds.size > 0 && (
        <div className="text-sm text-ink-3 text-center py-2 border-t border-line">
          {selectedIds.size} destination{selectedIds.size !== 1 ? "s" : ""} selected
        </div>
      )}
    </div>
  );
}
