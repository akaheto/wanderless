'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getQueuedChanges, updateQueueItem, removeQueuedChange } from './db';
import type { SyncQueueItem } from './db';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  queuedItems: SyncQueueItem[];
  syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queuedItems, setQueuedItems] = useState<SyncQueueItem[]>([]);

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queued items on mount
  useEffect(() => {
    const loadQueue = async () => {
      const items = await getQueuedChanges();
      setQueuedItems(items);
    };
    loadQueue();
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queuedItems.length > 0) {
      // Small delay to ensure network is stable
      const timer = setTimeout(() => {
        // Will be called via syncNow
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, queuedItems.length]);

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    const items = await getQueuedChanges();

    for (const item of items) {
      const backoff = Math.min(Math.pow(2, item.attemptCount) * 1000, 8000);
      const timeSinceLastAttempt = item.lastAttempt
        ? Date.now() - new Date(item.lastAttempt).getTime()
        : backoff;

      if (timeSinceLastAttempt < backoff) {
        continue;
      }

      try {
        // Execute sync based on action type
        await executeSyncAction(item);
        // Remove from queue on success
        await removeQueuedChange(item.tripId, item.action, item.resourceId);
        setQueuedItems((prev) =>
          prev.filter(
            (i) => !(i.tripId === item.tripId && i.action === item.action && i.resourceId === item.resourceId),
          ),
        );
      } catch (error) {
        const statusCode = (error as any)?.status;
        if (statusCode === 403 || statusCode === 409) {
          // Conflict or permission denied — remove from queue
          await removeQueuedChange(item.tripId, item.action, item.resourceId);
          setQueuedItems((prev) =>
            prev.filter(
              (i) => !(i.tripId === item.tripId && i.action === item.action && i.resourceId === item.resourceId),
            ),
          );
          // Show toast notification
          if (typeof window !== 'undefined' && (window as any).__notifyConflict) {
            (window as any).__notifyConflict();
          }
        } else {
          // Transient error — retry
          await updateQueueItem(item.tripId, item.action, item.resourceId, {
            attemptCount: item.attemptCount + 1,
            lastAttempt: new Date().toISOString(),
            error: (error as Error).message,
          });
        }
      }
    }

    setIsSyncing(false);
  }, [isOnline, isSyncing]);

  return (
    <OfflineContext.Provider value={{ isOnline, isSyncing, queuedItems, syncNow }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}

async function executeSyncAction(item: SyncQueueItem) {
  const { action, tripId, resourceId, payload } = item;

  if (action === 'event:update') {
    const response = await fetch(`/api/trips/${tripId}/events/${resourceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  } else if (action === 'event:delete') {
    const response = await fetch(`/api/trips/${tripId}/events/${resourceId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  } else if (action === 'budgetItem:create') {
    const response = await fetch(`/api/trips/${tripId}/budget-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  } else if (action === 'budgetItem:update') {
    const response = await fetch(`/api/trips/${tripId}/budget-items/${resourceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  } else if (action === 'budgetItem:delete') {
    const response = await fetch(`/api/trips/${tripId}/budget-items/${resourceId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  }
}
