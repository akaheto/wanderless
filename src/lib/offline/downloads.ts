/**
 * Destination download and cache management for offline access.
 * Fetches destination metadata, climate, places, and transit routes.
 */

import { putCachedDestination, getTotalCachedSize } from './db';
import type { CachedDestination } from './db';
import { DESTINATIONS } from '@/data/destinations';

interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
}

export async function downloadDestination(
  destinationId: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<CachedDestination> {
  const destination = DESTINATIONS.find((d) => d.id === destinationId);
  if (!destination) {
    throw new Error(`Destination ${destinationId} not found`);
  }

  let current = 0;
  const total = 4;

  const updateProgress = () => {
    current++;
    onProgress?.({
      current,
      total,
      percentage: Math.round((current / total) * 100),
    });
  };

  // 1. Fetch destination metadata
  const destData = destination;
  updateProgress();

  // 2. Fetch climate data
  let climateData: any = null;
  try {
    const climateResponse = await fetch(`/api/climate/${destinationId}`);
    if (climateResponse.ok) {
      climateData = await climateResponse.json();
    }
  } catch (error) {
    console.warn(`Failed to fetch climate for ${destinationId}:`, error);
  }
  updateProgress();

  // 3. Fetch places
  let places: any[] = [];
  try {
    const placesResponse = await fetch(`/api/destinations/${destinationId}/places`);
    if (placesResponse.ok) {
      places = await placesResponse.json();
    }
  } catch (error) {
    console.warn(`Failed to fetch places for ${destinationId}:`, error);
  }
  updateProgress();

  // 4. Fetch transit routes
  let transitRoutes: any[] = [];
  try {
    const transitResponse = await fetch(`/api/destinations/${destinationId}/transit`);
    if (transitResponse.ok) {
      transitRoutes = await transitResponse.json();
    }
  } catch (error) {
    console.warn(`Failed to fetch transit for ${destinationId}:`, error);
  }
  updateProgress();

  // Calculate size (rough estimate)
  const sizeBytes = JSON.stringify({
    destination: destData,
    climate: climateData,
    places,
    transit: transitRoutes,
  }).length;

  const cached: CachedDestination = {
    id: destinationId,
    name: destination.name,
    destination: destData,
    climate: climateData,
    places,
    cachedAt: new Date().toISOString(),
    sizeBytes,
  };

  await putCachedDestination(cached);
  return cached;
}

export async function deleteDestinationCache(destinationId: string): Promise<void> {
  const { deleteCachedDestination } = await import('./db');
  await deleteCachedDestination(destinationId);
}

export async function refreshDestinationCache(
  destinationId: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<CachedDestination> {
  await deleteDestinationCache(destinationId);
  return downloadDestination(destinationId, onProgress);
}

export async function getStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;

  return {
    usage,
    quota,
    percentage: quota > 0 ? Math.round((usage / quota) * 100) : 0,
  };
}

export async function getStorageUsage(): Promise<number> {
  return getTotalCachedSize();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}
