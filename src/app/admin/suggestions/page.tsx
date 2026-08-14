"use client";

import { useEffect, useState } from "react";
import { CityCard } from "@/components/CityCard";
import type { CitySuggestion } from "@/lib/db/city-suggestions";

export default function SuggestionsAdminPage() {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/suggestions");
      if (!response.ok) {
        throw new Error("Failed to load suggestions");
      }
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/suggestions/${id}/approve`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to approve");
      await fetchSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error approving suggestion");
    }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      const response = await fetch(`/api/admin/suggestions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to reject");
      await fetchSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error rejecting suggestion");
    }
  };

  const handleRetry = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/suggestions/${id}/retry`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to retry");
      await fetchSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error retrying suggestion");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/suggestions/${id}/delete`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to delete");
      await fetchSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting suggestion");
    }
  };

  const filteredSuggestions = statusFilter
    ? suggestions.filter((s) => s.status === statusFilter)
    : suggestions;

  const statusCounts = {
    pending: suggestions.filter((s) => s.status === "pending").length,
    researching: suggestions.filter((s) => s.status === "researching").length,
    reviewed: suggestions.filter((s) => s.status === "reviewed").length,
    approved: suggestions.filter((s) => s.status === "approved").length,
    rejected: suggestions.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold">City Suggestions</h1>
        <p className="mt-2 text-ink-3">Review and approve user-suggested destinations</p>
      </div>

      {error && (
        <div className="rounded-lg border border-critical bg-red-50 px-4 py-3 text-critical">
          {error}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter(null)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            statusFilter === null
              ? 'bg-accent text-white'
              : 'border border-line bg-surface-1 text-ink hover:bg-surface-2'
          }`}
        >
          All ({suggestions.length})
        </button>
        {(['pending', 'researching', 'reviewed', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-accent text-white'
                : 'border border-line bg-surface-1 text-ink hover:bg-surface-2'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Suggestions Grid */}
      {isLoading && (
        <div className="rounded-lg border border-line bg-surface-1 px-6 py-12 text-center text-ink-3">
          Loading suggestions...
        </div>
      )}

      {!isLoading && suggestions.length === 0 && (
        <div className="rounded-lg border border-line bg-surface-1 px-6 py-12 text-center text-ink-3">
          No suggestions yet. Users can suggest cities from the destination catalog.
        </div>
      )}

      {!isLoading && filteredSuggestions.length === 0 && statusFilter && (
        <div className="rounded-lg border border-line bg-surface-1 px-6 py-12 text-center text-ink-3">
          No {statusFilter} suggestions
        </div>
      )}

      {!isLoading && filteredSuggestions.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredSuggestions
            .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
            .map((suggestion) => (
              <CityCard
                key={suggestion.id}
                suggestion={suggestion}
                onApprove={handleApprove}
                onReject={handleReject}
                onRetry={handleRetry}
                onDelete={handleDelete}
              />
            ))}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-line bg-surface-1 px-4 py-3 text-sm">
        <p className="font-medium">Workflow</p>
        <ul className="mt-2 space-y-1 text-ink-3">
          <li>✓ Users submit cities from the destination catalog (limited to 10/day)</li>
          <li>✓ Admin approves or rejects with optional reason</li>
          <li>✓ Approved cities trigger Claude API research</li>
          <li>✓ Research fetches hotel, flight, visa, and climate data</li>
          <li>✓ User receives email notification when research completes</li>
          <li>✓ Researched city is added to the destination catalog</li>
        </ul>
      </div>
    </div>
  );
}
