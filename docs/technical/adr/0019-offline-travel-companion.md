# ADR 0019: Offline Travel Companion — Storage Strategy and Sync Model

**Date**: 2026-08-12  
**Status**: Proposed  
**Context**: Release 10 will add an offline-first travel companion to reduce data dependency while traveling. This requires defining where offline data lives, when it syncs, and how conflicts are resolved.

## Problem

The app currently requires live network access to load trip details, bookings, places, and events. While traveling—especially internationally—connectivity is unreliable or expensive. Users need access to:
- Their trip itinerary and bookings (confirmation numbers, timing)
- City guides (attractions, restaurants, transit info)
- Offline maps and walking directions
- Historical weather normals and current forecast (if cached)
- Curated destination notes and tips

The current architecture has no offline fallback. Flights load on demand; if the network fails, the page is empty.

## Decision

**Three-tier offline model:**

1. **App Shell** (Service Worker + IndexedDB)
   - Cache the app shell (Next.js layout, UI components, theme) indefinitely
   - Offline users land on a "Reconnect" splash or a "Cached Trips" page, not an error

2. **Trip Data** (IndexedDB, keyed by trip ID)
   - When a trip loads, after render, write to IndexedDB: metadata (dates, name), all related stops, events, bookings, budget items
   - On subsequent visits, read from IndexedDB first (instant); fetch fresh in background
   - Stale-while-revalidate pattern: serve cache; network update happens invisible to the user

3. **Destination & City Data** (IndexedDB, explicit download)
   - User can "download" a destination (triggers a full-page load of all data for that city)
   - Download includes: climate normals, curated suitability ratings, month notes, places, transit routes, restaurant/attraction list
   - Stored at path `/destination-cache/{id}/` in IndexedDB with a timestamp
   - Download happens once; syncs on next online visit (if data is >30 days old)
   - User can manually trigger "refresh" to re-download

**Sync and Conflict Resolution:**
- Offline changes (event edits, notes) are written to IndexedDB *and* queued in an "unsynced changes" table
- When online, sync plays back the queue: PATCH /trips/{id}/events/{eventId}, etc.
- If a remote change conflicts (user edited event, then offline, then someone else edited it), the remote version wins but a toast alerts the user
- Queued changes are never lost; sync retries on network recovery

**Not handled offline:**
- Creating new trips (requires DB)
- Changing trip dates (requires DB + re-syncing all related data)
- Sharing/permissions (requires DB)

## Rationale

1. **Stale-while-revalidate is the standard for low-latency offline apps.** Users don't wait for a network round-trip on repeat visits; the local cache is fast. Background sync keeps it fresh without blocking.

2. **IndexedDB is the standard for offline data on the web.** It survives browser restarts, can hold 50MB+ (dependent on user's storage allowance), and works on iOS Safari (though with iOS quirks).

3. **Explicit downloads for city data acknowledges the tradeoff:** bundling everything in the app shell would bloat it. Letting users choose which destinations to cache is the right UX.

4. **Read-your-writes for offline edits.** Users expect changes they make offline to be visible immediately, not after sync. Writing to IndexedDB first achieves that.

5. **Conflict resolution (remote wins) is simple and defensible.** If two people edit the same event on different devices, the most recent server version is authoritative. A toast keeps the user aware.

6. **Not handling trip creation offline keeps the schema simple.** Creating a trip requires assigning an ID, updating the user's trip list, and initializing N related records. Deferring that to online-only prevents out-of-sync state.

## Implementation

**Phase 1: App Shell & Trip Data Cache**
- Add Service Worker (NextJS offline plugin or manual fetch handler)
- Add `src/lib/offline/db.ts` — IndexedDB wrapper functions (get/put trip data, list cached trips)
- Update `src/app/trips/[id]/page.tsx` to read from IndexedDB first, then fetch/update in background
- Add "Cached Trips" page (`/trips/offline`) for users with no network connection
- Add sync queue table in IndexedDB for queued changes

**Phase 2: Destination Downloads**
- Add "Download" button to destination detail page
- Implement download action: fetch destination, climate, places, curated notes; write to IndexedDB under `/destination-cache/{id}/`
- Implement "Refresh" action: re-download if >30 days old
- Show download progress and storage usage

**Phase 3: Offline City Guides**
- Build "City Guide" tab (Things to Do, Food & Drink, Getting Around, Day Plans)
- Populate from cached destination data if offline
- Fall back to API if online

**Phase 4: Sync & Conflict Resolution**
- Implement sync queue processor: on online, play back queued changes
- Add conflict-resolution toast when remote version wins
- Retry on network errors with exponential backoff

## Tech Stack

**Service Worker**: Next.js built-in offline plugin (Workbox) or manual fetch handler (lighter)  
**Storage**: IndexedDB (built-in, no deps)  
**Sync**: Polling (check every 5s when online), not WebSocket (too heavy for offline-first)  
**State**: Single `isOnline` boolean in React context, updated via `online`/`offline` events

## Consequences

**Positive:**
- App works offline (major UX win for travelers)
- No new external dependencies
- Sync is transparent; conflicts are rare and resolved automatically
- Users have agency (choose what to cache)

**Negative:**
- Adds complexity to data-loading paths (IndexedDB first, then network)
- Conflict resolution is lossy (remote wins, user sees a toast)
- Service Worker debugging is slow and finicky
- Storage quota varies by browser (50MB–50GB); big destinations may not fit on iOS

**Neutral:**
- IndexedDB is available in all modern browsers; Turso still the source of truth
- Adds dev burden of testing offline scenarios

## Related

- ADR 0001: Three-Tier Data Model (offline cache is a fourth tier, but separate)
- ADR 0007: No HTTP API (offline queue syncs via Server Actions, not API routes)

## Examples

**Scenario 1: User visits same trip offline (cache hit)**
1. User is on `/trips/1` with network on desktop
2. App fetches trip from Turso, caches in IndexedDB
3. User goes to airport, still on `/trips/1`, network goes down
4. React hydrates from IndexedDB cache (instant)
5. User sees their itinerary, can read event notes, view places they saved
6. User edits event (adds note), writes to IndexedDB + sync queue
7. Network comes back online at hotel
8. Sync queue plays back the event edit (PATCH request)
9. Server version confirms, no conflict

**Scenario 2: Explicit destination download (Things to Do)**
1. User visits `/destinations/paris`
2. Clicks "📥 Download for offline"
3. App fetches destination metadata, all places, curated notes, transit routes
4. Writes to IndexedDB at `/destination-cache/paris/`
5. Shows "Downloaded • 12.3 MB"
6. User arrives in Paris, network fails
7. User opens "Things to Do" tab on `/trips/[id]`
8. If selected destination is Paris, app reads from `/destination-cache/paris/`, renders offline guide
9. If selected destination is not cached, shows "Not downloaded. Reconnect to browse."

**Scenario 3: Conflict during offline edit**
1. User offline edits event: "Dinner at L'Astrance - 8 PM"
2. Change queued in IndexedDB
3. Meanwhile, online partner changes same event to "Dinner at L'Astrance - 8:30 PM"
4. Remote version persists to Turso
5. User comes online
6. Sync queue tries PATCH, gets 409 Conflict (or just re-reads trip after each PATCH)
7. App reloads event from server, sees 8:30 PM
8. Toast shows: "Event updated online. Your offline change was overridden."
9. User can click to view the new time, or manually re-edit

## Questions for the Team

1. **How much storage should we allocate per destination?** Paris has 300+ places; at ~500 bytes per place JSON, that's 150KB per destination, leaving ~100MB for ~600 cached destinations. Reasonable, but iOS Safari caps at 50MB per origin—is that acceptable?

2. **Should we offer automatic destination caching based on trip dates?** E.g., user creates trip to Paris in September, we auto-download Paris. Pro: less user friction. Con: unexpected storage usage. Recommend opt-in for now.

3. **Do we cache forecast data, or only normals?** Forecasts are only valuable for trips <14 days out. Caching 16-day forecasts offline (updated every 6h) is wasteful. Recommend: normals only, forecasts on-demand.

4. **Sync queue retry strategy?** Exponential backoff (1s → 2s → 4s → 8s)? Or simpler linear (every 5s)? Recommend linear for simplicity.

5. **Do we need to sync queue for *reads* that the user caches?** E.g., user downloads "Things to Do" for Paris while offline (using cached destination data). When online, do we verify the list is fresh? Recommend: no; date-stamp the cache and refresh if >30 days old on next visit.
