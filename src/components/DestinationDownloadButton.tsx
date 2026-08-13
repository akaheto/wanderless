'use client';

import { useState, useEffect } from 'react';
import { getCachedDestination, deleteCachedDestination } from '@/lib/offline/db';
import { downloadDestination, formatBytes } from '@/lib/offline/downloads';
import type { CachedDestination } from '@/lib/offline/db';

interface DestinationDownloadButtonProps {
  destinationId: string;
  destinationName: string;
}

export function DestinationDownloadButton({ destinationId, destinationName }: DestinationDownloadButtonProps) {
  const [cached, setCached] = useState<CachedDestination | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Check if destination is cached on mount
  useEffect(() => {
    const checkCache = async () => {
      try {
        const cachedDest = await getCachedDestination(destinationId);
        setCached(cachedDest || null);
      } catch (err) {
        console.warn('Failed to check cache:', err);
      }
    };

    checkCache();
  }, [destinationId]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    setProgress(0);

    try {
      await downloadDestination(destinationId, (p) => {
        setProgress(p.percentage);
      });
      const cachedDest = await getCachedDestination(destinationId);
      setCached(cachedDest || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download destination');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRefresh = async () => {
    setIsDownloading(true);
    setError(null);
    setProgress(0);

    try {
      await deleteCachedDestination(destinationId);
      await downloadDestination(destinationId, (p) => {
        setProgress(p.percentage);
      });
      const cachedDest = await getCachedDestination(destinationId);
      setCached(cachedDest || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh destination');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove cached data for this destination?')) return;

    try {
      await deleteCachedDestination(destinationId);
      setCached(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cache');
    }
  };

  const isStale = cached && new Date(cached.cachedAt).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000;

  if (isDownloading) {
    return (
      <button disabled className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm cursor-not-allowed">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <span>Downloading... {progress}%</span>
        </div>
      </button>
    );
  }

  if (cached && !isStale) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium">
          ✓ Downloaded • {formatBytes(cached.sizeBytes)}
        </div>
        <button
          onClick={handleDelete}
          className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium transition-colors"
          title="Remove cached data"
        >
          🗑️
        </button>
      </div>
    );
  }

  if (isStale) {
    return (
      <button
        onClick={handleRefresh}
        disabled={isDownloading}
        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
      >
        🔄 Refresh
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
      >
        📥 Download for offline
      </button>
      {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
    </div>
  );
}
