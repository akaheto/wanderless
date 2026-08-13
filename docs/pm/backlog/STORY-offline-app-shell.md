# STORY: Offline App Shell & Trip Data Cache

**Epic**: Release 10 (Offline Travel Companion)  
**Phase**: 1 — Foundation  
**Effort**: M (medium)  
**Priority**: P1 (blocks all offline features)

## Acceptance Criteria

- [x] Service Worker installed and caches app shell (layout, UI, theme)
- [x] IndexedDB wrapper (`src/lib/offline/db.ts`) with functions: `getCachedTrip`, `putCachedTrip`, `listCachedTrips`, `clearCache`
- [x] Trip page reads from IndexedDB first (instant load), fetches fresh in background
- [x] Offline users see "Cached Trips" page if no network (`/trips/offline`)
- [x] Sync queue table in IndexedDB for queued changes (not yet processed)
- [x] Stored data includes: trip metadata, stops, events, bookings, budget items (full trip shape)
- [x] Cache persists across browser restarts
- [x] Type-check and tests pass
- [x] No new npm dependencies

## Implementation Details

**Service Worker Setup**:
- Use Next.js offline plugin (Workbox) or manual fetch handler
- Cache strategy: cache-first for app shell, network-first for API calls
- Cache invalidation: on app update, stale service worker removed

**IndexedDB Schema**:
```
Database: "tih-offline"
Stores:
  - trips: { keyPath: "id", indexes: ["ownerId", "updatedAt"] }
  - syncQueue: { keyPath: ["tripId", "action"], autoIncrement: false }
```

**Trip Cache Shape**:
```typescript
interface CachedTrip {
  id: number;
  trip: Trip;
  stops: TripStop[];
  events: TripEvent[];
  flightBookings: FlightBooking[];
  hotelBookings: HotelBooking[];
  budgetItems: BudgetItem[];
  places: Place[];
  cachedAt: string; // ISO timestamp
}
```

**Offline Page (`/trips/offline`)**:
- List cached trips with "Last updated X hours ago"
- Click to open (loads from IndexedDB)
- "Sync Now" button (manual trigger, if online)
- "Clear All" with confirmation

**Fetch Timing**:
- After trip renders from cache, fetch fresh data (background)
- If fresh data differs, update IndexedDB silently
- No toast unless user edits offline (then they know state is stale)

## Testing

- [ ] Service Worker installed and active in DevTools
- [ ] Trip loads instantly from cache on repeat visits
- [ ] Offline users can access cached trip data
- [ ] IndexedDB queries verified with DevTools
- [ ] Background fetch updates cache without UI flicker
- [ ] Cached trip list accurate

## Notes

- Service Worker debugging in DevTools: Application > Service Workers
- IndexedDB debugging in DevTools: Application > Storage > IndexedDB
- Test offline mode: DevTools Network tab, throttle to "Offline"
