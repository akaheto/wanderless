# STORY: Destination Downloads & Cache Management

**Epic**: Release 10 (Offline Travel Companion)  
**Phase**: 2 — Destination Caching  
**Effort**: M (medium)  
**Priority**: P2 (follows App Shell)

## Acceptance Criteria

- [x] "📥 Download" button on destination detail page (`/destinations/[id]`)
- [x] Download fetches: destination metadata, climate data, places, curated notes, transit routes
- [x] Stores at `/destination-cache/{id}/` in IndexedDB with timestamp
- [x] Shows progress: "Downloading... 45%" with file size estimate (e.g., "~8 MB")
- [x] Success state: "Downloaded • Last updated 2 hours ago"
- [x] "🔄 Refresh" button (visible if cache >30 days old)
- [x] Storage usage display: "Cached destinations: 234 MB / 500 MB available"
- [x] Manual clear: per-destination "🗑️ Remove" button
- [x] Type-check and tests pass
- [x] No new npm dependencies

## Implementation Details

**Download Button Location**:
- On destination hero card (near trip-add button)
- Label: "📥 Download" or "🔄 Refresh" (conditional)
- Disabled while downloading

**Destination Cache Shape**:
```typescript
interface CachedDestination {
  id: string;
  destination: Destination;
  climate: ClimateRecord;
  places: Place[];
  cachedAt: string; // ISO timestamp
  sizeBytes: number;
}
```

**Download Handler** (`src/lib/offline/downloads.ts`):
- Fetch destination, climate (from CLIMATE_RECORDS), places (from DB)
- Calculate total size
- Write to IndexedDB under `destinations` store
- Track progress for UI

**IndexedDB Schema Addition**:
```
Store: destinations
  keyPath: "id"
  indexes: ["cachedAt", "sizeBytes"]
```

**Storage Info Component**:
- Calculate total cached: `sum(destinations[*].sizeBytes)`
- Query navigator.storage.estimate() for available quota
- Show warning if >80% used

**Refresh Logic**:
- If cached >30 days old, show "🔄 Refresh" instead of "📥 Download"
- Clicking refresh: delete old, download fresh

## Edge Cases

- Download interrupted (user closes tab): state saved, can resume
- Storage quota exceeded: show "Not enough space. Remove other destinations?" with clear option
- Network fails mid-download: retry with exponential backoff
- User offline: disable download button, show "Connect to download"

## Testing

- [ ] Download from full (online) state
- [ ] Cache persists after close/reopen
- [ ] Refresh updates cached data
- [ ] Storage calculation accurate
- [ ] Offline mode disables download button
- [ ] Large destination (>50 MB) downloads without timeout

## Notes

- Use navigator.storage.estimate() for quota info
- Destination size estimate: ~8 MB for major cities (300+ places)
- Keep progress UI simple: just a percentage bar, no ETA
