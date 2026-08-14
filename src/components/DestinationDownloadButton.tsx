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
      <button disabled className="px-4 py-2 bg-surface-0 text-ink-2 rounded-lg font-medium text-sm cursor-not-allowed">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-line border-t-accent rounded-full animate-spin" />
          <span>Downloading... {progress}%</span>
        </div>
      </button>
    );
  }

  if (cached && !isStale) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 bg-good/10 text-good rounded-lg text-sm font-medium">
          ✓ Downloaded • {formatBytes(cached.sizeBytes)}
        </div>
        <button
          onClick={handleDelete}
          className="px-3 py-2 bg-critical/10 text-critical hover:bg-critical/20 rounded-lg text-sm font-medium transition-colors"
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
        className="px-4 py-2 bg-accent/10 text-accent hover:bg-accent/20 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
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
        className="px-4 py-2 bg-accent text-white hover:brightness-110 rounded-lg font-medium text-sm transition-all disabled:opacity-50"
      >
        📥 Download for offline
      </button>
      {error && <div className="text-critical text-sm">{error}</div>}
    </div>
  );
}
