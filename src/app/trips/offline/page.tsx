'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listCachedTrips, clearAllCache } from '@/lib/offline/db';
import type { CachedTrip } from '@/lib/offline/db';
import { formatDistanceToNow } from 'date-fns';

export default function OfflineTripsPage() {
  const [trips, setTrips] = useState<CachedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCachedTrips = async () => {
      try {
        const cachedTrips = await listCachedTrips();
        setTrips(
          cachedTrips.sort(
            (a, b) =>
              new Date(b.cachedAt || 0).getTime() - new Date(a.cachedAt || 0).getTime(),
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cached trips');
      } finally {
        setLoading(false);
      }
    };

    loadCachedTrips();
  }, []);

  const handleClearAll = async () => {
    if (!window.confirm('Clear all cached trips? This cannot be undone.')) return;

    try {
      await clearAllCache();
      setTrips([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading cached trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cached Trips</h1>
          <p className="text-gray-600 dark:text-gray-400">
            You're offline. These are your recently cached trips.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {trips.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No cached trips yet. Visit a trip online to cache it for offline access.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-8">
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-md dark:hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{trip.trip.name}</h2>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      Cached
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {trip.trip.startDate && new Date(trip.trip.startDate).toLocaleDateString()} -{' '}
                    {trip.trip.endDate && new Date(trip.trip.endDate).toLocaleDateString()}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{trip.stops.length} stops</span>
                    <span>{trip.events.length} events</span>
                    <span className="ml-auto">
                      Updated {trip.cachedAt && formatDistanceToNow(new Date(trip.cachedAt), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <button
                onClick={handleClearAll}
                className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 font-medium transition-colors"
              >
                Clear All Cached Data
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
