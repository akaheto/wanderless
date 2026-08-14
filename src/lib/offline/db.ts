/**
 * IndexedDB wrapper for offline trip data, destination cache, and sync queue.
 * Single database instance with three stores: trips, destinations, syncQueue.
 */

import type { Trip, TripStop } from '@/lib/domain/types';
import type { TripEvent } from '@/lib/db/events';
import type { FlightBooking, HotelBooking } from '@/lib/db/bookings';
import type { BudgetItem } from '@/lib/db/budget';

const DB_NAME = 'wanderless-offline';
const DB_VERSION = 1;

export const STORES = {
  TRIPS: 'trips',
  DESTINATIONS: 'destinations',
  SYNC_QUEUE: 'syncQueue',
} as const;

export interface CachedTrip {
  id: number;
  trip: Trip;
  stops: TripStop[];
  events: TripEvent[];
  flightBookings: FlightBooking[];
  hotelBookings: HotelBooking[];
  budgetItems: BudgetItem[];
  cachedAt: string;
}

export interface CachedDestination {
  id: string;
  name: string;
  destination: any;
  climate: any;
  places: any[];
  cachedAt: string;
  sizeBytes: number;
}

export interface SyncQueueItem {
  tripId: number;
  action: 'event:update' | 'event:delete' | 'budgetItem:create' | 'budgetItem:update' | 'budgetItem:delete';
  resourceId: number;
  payload: any;
  queuedAt: string;
  lastAttempt: string | null;
  attemptCount: number;
  error: string | null;
}

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create trips store
      if (!database.objectStoreNames.contains(STORES.TRIPS)) {
        const tripsStore = database.createObjectStore(STORES.TRIPS, { keyPath: 'id' });
        tripsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      // Create destinations store
      if (!database.objectStoreNames.contains(STORES.DESTINATIONS)) {
        const destStore = database.createObjectStore(STORES.DESTINATIONS, { keyPath: 'id' });
        destStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        destStore.createIndex('sizeBytes', 'sizeBytes', { unique: false });
      }

      // Create sync queue store
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: ['tripId', 'action', 'resourceId'] });
      }
    };
  });
}

async function getStore(
  storeName: string,
  mode: 'readonly' | 'readwrite' = 'readonly',
): Promise<IDBObjectStore> {
  const database = await initDB();
  const tx = database.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

// Trip Cache Operations

export async function getCachedTrip(tripId: number): Promise<CachedTrip | undefined> {
  const store = await getStore(STORES.TRIPS, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.get(tripId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function putCachedTrip(trip: CachedTrip): Promise<void> {
  const store = await getStore(STORES.TRIPS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(trip);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function listCachedTrips(): Promise<CachedTrip[]> {
  const store = await getStore(STORES.TRIPS, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function deleteCachedTrip(tripId: number): Promise<void> {
  const store = await getStore(STORES.TRIPS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(tripId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Destination Cache Operations

export async function getCachedDestination(id: string): Promise<CachedDestination | undefined> {
  const store = await getStore(STORES.DESTINATIONS, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function putCachedDestination(destination: CachedDestination): Promise<void> {
  const store = await getStore(STORES.DESTINATIONS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(destination);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function listCachedDestinations(): Promise<CachedDestination[]> {
  const store = await getStore(STORES.DESTINATIONS, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function deleteCachedDestination(id: string): Promise<void> {
  const store = await getStore(STORES.DESTINATIONS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getTotalCachedSize(): Promise<number> {
  const destinations = await listCachedDestinations();
  return destinations.reduce((sum, d) => sum + d.sizeBytes, 0);
}

// Sync Queue Operations

export async function queueChange(item: SyncQueueItem): Promise<void> {
  const store = await getStore(STORES.SYNC_QUEUE, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getQueuedChanges(): Promise<SyncQueueItem[]> {
  const store = await getStore(STORES.SYNC_QUEUE, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function updateQueueItem(
  tripId: number,
  action: SyncQueueItem['action'],
  resourceId: number,
  updates: Partial<SyncQueueItem>,
): Promise<void> {
  const store = await getStore(STORES.SYNC_QUEUE, 'readwrite');
  const key: [number, string, number] = [tripId, action, resourceId];

  return new Promise((resolve, reject) => {
    const getRequest = store.get(key);
    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (!item) {
        reject(new Error('Queue item not found'));
        return;
      }

      const updated = { ...item, ...updates };
      const putRequest = store.put(updated);
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };
  });
}

export async function removeQueuedChange(
  tripId: number,
  action: SyncQueueItem['action'],
  resourceId: number,
): Promise<void> {
  const store = await getStore(STORES.SYNC_QUEUE, 'readwrite');
  const key: [number, string, number] = [tripId, action, resourceId];

  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Clear all offline data

export async function clearAllCache(): Promise<void> {
  const database = await initDB();
  const stores = [STORES.TRIPS, STORES.DESTINATIONS, STORES.SYNC_QUEUE];

  for (const storeName of stores) {
    const store = await getStore(storeName, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
