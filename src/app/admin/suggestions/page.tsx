"use client";

import { useEffect, useState } from "react";

interface CitySuggestion {
  id?: number;
  city: string;
  country: string;
  status: "pending" | "researching" | "reviewed" | "approved" | "rejected";
  research_notes?: string;
  submitted_at: string;
}

export default function SuggestionsAdminPage() {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handleReject = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/suggestions/${id}/reject`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to reject");
      await fetchSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error rejecting suggestion");
    }
  };

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div className="space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold">City Suggestions</h1>
        <p className="mt-2 text-ink-3">Review and approve user-suggested destinations</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-surface-1 p-4">
          <p className="text-sm font-medium">
            Pending Review: <span className="text-lg font-bold">{pendingSuggestions.length}</span>
          </p>
        </div>

        {isLoading && (
          <div className="rounded-lg border border-line bg-surface-1 px-6 py-8 text-center text-ink-3">
            Loading suggestions...
          </div>
        )}

        {!isLoading && suggestions.length === 0 && (
          <div className="rounded-lg border border-line bg-surface-1 px-6 py-8 text-center text-ink-3">
            No suggestions yet
          </div>
        )}

        {!isLoading && suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-lg border border-line bg-surface-1 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {suggestion.city}, {suggestion.country}
                    </h3>
                    <p className="mt-1 text-xs text-ink-4">
                      Submitted {new Date(suggestion.submitted_at).toLocaleDateString()}
                    </p>
                    <div className="mt-2 flex gap-1">
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                          suggestion.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {suggestion.status}
                      </span>
                    </div>
                    {suggestion.research_notes && (
                      <p className="mt-2 text-xs text-ink-3">{suggestion.research_notes}</p>
                    )}
                  </div>

                  {suggestion.status === "pending" && (
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => handleApprove(suggestion.id!)}
                        className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(suggestion.id!)}
                        className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-surface-1 px-4 py-3 text-sm">
        <p className="font-medium">Next Steps</p>
        <ul className="mt-2 space-y-1 text-ink-3">
          <li>• Approved cities will be queued for Claude API research</li>
          <li>• Research includes real pricing, flights, visa requirements</li>
          <li>• Researched data will be added to the destination catalog</li>
          <li>• Users will be notified when their suggestion is approved</li>
        </ul>
      </div>
    </div>
  );
}
