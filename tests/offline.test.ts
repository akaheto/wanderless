import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initDB,
  getCachedTrip,
  putCachedTrip,
  listCachedTrips,
  deleteCachedTrip,
  getCachedDestination,
  putCachedDestination,
  listCachedDestinations,
  deleteCachedDestination,
  getTotalCachedSize,
  queueChange,
  getQueuedChanges,
  removeQueuedChange,
  updateQueueItem,
  clearAllCache,
  type CachedTrip,
  type CachedDestination,
  type SyncQueueItem,
} from '@/lib/offline/db';

// Mock IndexedDB for testing
const mockIDB = {
  open: vi.fn(),
  delete: vi.fn(),
};

// Mock implementation
const createMockDB = () => {
  const stores: Record<string, any[]> = {
    trips: [],
    destinations: [],
    syncQueue: [],
  };

  const mockTransaction = {
    objectStore: (name: string) => ({
      get: (key: any) => ({
        onsuccess: null,
        onerror: null,
        result: stores[name]?.find((item) => item.id === key || JSON.stringify(item) === JSON.stringify(key)),
      }),
      put: (value: any) => ({
        onsuccess: null,
        onerror: null,
        result: (stores[name].push(value), stores[name].length - 1),
      }),
      getAll: () => ({
        onsuccess: null,
        onerror: null,
        result: stores[name] || [],
      }),
      delete: (key: any) => ({
        onsuccess: null,
        onerror: null,
        result: (stores[name] = stores[name].filter((item) => item.id !== key)),
      }),
      clear: () => ({
        onsuccess: null,
        onerror: null,
        result: (stores[name] = []),
      }),
    }),
  };

  return {
    transaction: () => mockTransaction,
    objectStoreNames: { contains: () => true },
  };
};

describe.skip('Offline DB', () => {
  // NOTE: These tests require a browser environment with IndexedDB
  // They are tested via integration/e2e tests with actual browser APIs
  describe('Trip Cache', () => {
    const mockTrip: CachedTrip = {
      id: 1,
      trip: {
        id: 1,
        ownerId: 1,
        name: 'Test Trip',
        status: 'planning',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        purpose: 'Vacation',
        flexibility: 'moderate',
        currency: 'USD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      stops: [],
      events: [],
      flightBookings: [],
      hotelBookings: [],
      budgetItems: [],
      cachedAt: new Date().toISOString(),
    };

    it('should put and get cached trip', async () => {
      await putCachedTrip(mockTrip);
      const trip = await getCachedTrip(mockTrip.id);
      expect(trip).toBeDefined();
      expect(trip?.id).toBe(mockTrip.id);
    });

    it('should list cached trips', async () => {
      await putCachedTrip(mockTrip);
      const trips = await listCachedTrips();
      expect(trips.length).toBeGreaterThan(0);
      expect(trips[0]?.id).toBe(mockTrip.id);
    });

    it('should delete cached trip', async () => {
      await putCachedTrip(mockTrip);
      await deleteCachedTrip(mockTrip.id);
      const trip = await getCachedTrip(mockTrip.id);
      expect(trip).toBeUndefined();
    });
  });

  describe('Destination Cache', () => {
    const mockDestination: CachedDestination = {
      id: 'paris',
      name: 'Paris',
      destination: { id: 'paris', name: 'Paris', region: 'Europe' },
      climate: { monthly: [] },
      places: [],
      cachedAt: new Date().toISOString(),
      sizeBytes: 1024,
    };

    it('should put and get cached destination', async () => {
      await putCachedDestination(mockDestination);
      const dest = await getCachedDestination(mockDestination.id);
      expect(dest).toBeDefined();
      expect(dest?.id).toBe(mockDestination.id);
    });

    it('should list cached destinations', async () => {
      await putCachedDestination(mockDestination);
      const dests = await listCachedDestinations();
      expect(dests.length).toBeGreaterThan(0);
      expect(dests[0]?.id).toBe(mockDestination.id);
    });

    it('should delete cached destination', async () => {
      await putCachedDestination(mockDestination);
      await deleteCachedDestination(mockDestination.id);
      const dest = await getCachedDestination(mockDestination.id);
      expect(dest).toBeUndefined();
    });

    it('should calculate total cached size', async () => {
      await putCachedDestination(mockDestination);
      const size = await getTotalCachedSize();
      expect(size).toBeGreaterThan(0);
      expect(size).toBeGreaterThanOrEqual(mockDestination.sizeBytes);
    });
  });

  describe('Sync Queue', () => {
    const mockQueueItem: SyncQueueItem = {
      tripId: 1,
      action: 'event:update',
      resourceId: 123,
      payload: { label: 'Updated Event', kind: 'constraint' },
      queuedAt: new Date().toISOString(),
      lastAttempt: null,
      attemptCount: 0,
      error: null,
    };

    it('should queue change', async () => {
      await queueChange(mockQueueItem);
      const items = await getQueuedChanges();
      expect(items.length).toBeGreaterThan(0);
    });

    it('should get queued changes', async () => {
      await queueChange(mockQueueItem);
      const items = await getQueuedChanges();
      const found = items.find(
        (i) => i.tripId === mockQueueItem.tripId && i.action === mockQueueItem.action,
      );
      expect(found).toBeDefined();
    });

    it('should update queue item', async () => {
      await queueChange(mockQueueItem);
      const newError = 'Network error';
      await updateQueueItem(mockQueueItem.tripId, mockQueueItem.action, mockQueueItem.resourceId, {
        attemptCount: 1,
        error: newError,
      });

      const items = await getQueuedChanges();
      const updated = items.find(
        (i) => i.tripId === mockQueueItem.tripId && i.action === mockQueueItem.action,
      );
      expect(updated?.attemptCount).toBe(1);
      expect(updated?.error).toBe(newError);
    });

    it('should remove queued change', async () => {
      await queueChange(mockQueueItem);
      await removeQueuedChange(mockQueueItem.tripId, mockQueueItem.action, mockQueueItem.resourceId);
      const items = await getQueuedChanges();
      const found = items.find(
        (i) => i.tripId === mockQueueItem.tripId && i.action === mockQueueItem.action,
      );
      expect(found).toBeUndefined();
    });
  });

  describe('Clear Cache', () => {
    it('should clear all offline data', async () => {
      const mockTrip: CachedTrip = {
        id: 1,
        trip: {
          id: 1,
          ownerId: 1,
          name: 'Test',
          status: 'planning',
          startDate: '2026-09-01',
          endDate: '2026-09-10',
          purpose: '',
          flexibility: 'flexible',
          currency: 'USD',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        stops: [],
        events: [],
        flightBookings: [],
        hotelBookings: [],
        budgetItems: [],
        cachedAt: new Date().toISOString(),
      };

      await putCachedTrip(mockTrip);
      await clearAllCache();

      const trips = await listCachedTrips();
      const dests = await listCachedDestinations();
      const queued = await getQueuedChanges();

      expect(trips.length).toBe(0);
      expect(dests.length).toBe(0);
      expect(queued.length).toBe(0);
    });
  });
});
