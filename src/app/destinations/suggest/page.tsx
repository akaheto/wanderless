"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuggestDestinationPage() {
  const router = useRouter();
  const [cityName, setCityName] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!cityName.trim()) {
      setError("City name is required");
      return;
    }

    if (!country.trim()) {
      setError("Country is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/cities/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: cityName.trim(),
          country: country.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit suggestion");
      }

      setSuccess(true);
      setCityName("");
      setCountry("");

      setTimeout(() => {
        router.push("/destinations");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 px-6 py-8">
          <div className="text-3xl">✓</div>
          <h1 className="text-2xl font-bold">Thanks for the suggestion!</h1>
          <p className="text-ink-3">
            We'll research {cityName}, {country} with real data from travel sites and add it to the catalog if it's a strong leisure destination.
          </p>
          <p className="text-sm text-ink-4">Redirecting you to the catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold">Suggest a Destination</h1>
        <p className="mt-2 text-ink-3">
          Know a place we should cover? We research with real data — no guesses or outdated information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-line bg-surface-1 p-6">
        {error && (
          <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium">City or town</span>
          <input
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="e.g. Barcelona, Tokyo, Auckland"
            disabled={isLoading}
            className="mt-1 w-full rounded border border-line bg-surface-0 px-3 py-2 text-sm disabled:opacity-50"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Country</span>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. Spain, Japan, New Zealand"
            disabled={isLoading}
            className="mt-1 w-full rounded border border-line bg-surface-0 px-3 py-2 text-sm disabled:opacity-50"
          />
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded bg-accent px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "Submitting..." : "Submit suggestion"}
        </button>
      </form>

      <div className="space-y-2 rounded-lg border border-line bg-surface-1 px-4 py-3 text-sm">
        <p className="font-medium">What happens next?</p>
        <ul className="mt-2 space-y-1 text-ink-3">
          <li>• We verify the city is a real leisure destination</li>
          <li>• Research real hotel pricing from Booking.com, Trip.com, Expedia</li>
          <li>• Verify flight options and visa requirements</li>
          <li>• Add it to the catalog with curated climate and season data</li>
        </ul>
      </div>
    </div>
  );
}
