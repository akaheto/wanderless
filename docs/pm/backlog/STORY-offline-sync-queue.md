# STORY: Sync Queue & Conflict Resolution

**Epic**: Release 10 (Offline Travel Companion)  
**Phase**: 4 — Sync & Data Integrity  
**Effort**: M (medium)  
**Priority**: P2 (follows city guides)

## Acceptance Criteria

- [x] Offline changes (event edits, budget item CRUD) write to IndexedDB + sync queue
- [x] On reconnect, sync queue plays back changes in order
- [x] Successful sync removes item from queue
- [x] Failed sync with 403/409 shows conflict toast: "Event was updated online. Your offline change was overridden."
- [x] Failed sync with network error retries with exponential backoff (1s → 2s → 4s → 8s)
- [x] After 3 failed retries, item remains queued (user can manually retry via "Sync Now" button)
- [x] Type-check and tests pass
- [x] No new npm dependencies

## Sync Queue Schema

**IndexedDB Store: `syncQueue`**
```
{
  tripId: number,
  action: "event:update" | "event:delete" | "budgetItem:create" | "budgetItem:update" | "budgetItem:delete",
  resourceId: number, // event ID or budget item ID
  payload: any, // full update object
  queuedAt: string, // ISO timestamp
  lastAttempt: string | null, // ISO timestamp
  attemptCount: number,
  error: string | null // last error message
}
```

**Compound key: `[tripId, action, resourceId]`** (ensures only one pending change per action per resource)

## Retry Logic

```typescript
interface SyncQueueItem {
  tripId: number;
  action: string;
  resourceId: number;
  payload: any;
  queuedAt: string;
  lastAttempt: string | null;
  attemptCount: number;
  error: string | null;
}

async function syncQueue() {
  const items = await db.syncQueue.getAll();
  for (const item of items) {
    const backoffMs = [1000, 2000, 4000, 8000][Math.min(item.attemptCount, 3)];
    const timeSinceLastAttempt = item.lastAttempt 
      ? Date.now() - new Date(item.lastAttempt).getTime()
      : backoffMs;
    
    if (timeSinceLastAttempt < backoffMs) continue; // not time yet
    
    try {
      await executeSync(item);
      await db.syncQueue.delete([item.tripId, item.action, item.resourceId]);
    } catch (error) {
      const statusCode = error.status;
      if (statusCode === 403 || statusCode === 409) {
        // Conflict or permission — reload remote version, remove from queue
        await db.syncQueue.delete([item.tripId, item.action, item.resourceId]);
        showToast("Event was updated online. Your offline change was overridden.");
      } else if (item.attemptCount >= 3) {
        // Retry limit exceeded
        await db.syncQueue.update([item.tripId, item.action, item.resourceId], {
          attemptCount: item.attemptCount + 1,
          lastAttempt: new Date().toISOString(),
          error: error.message,
        });
      } else {
        // Transient error, update for retry
        await db.syncQueue.update([item.tripId, item.action, item.resourceId], {
          attemptCount: item.attemptCount + 1,
          lastAttempt: new Date().toISOString(),
          error: error.message,
        });
      }
    }
  }
}
```

## Component Changes

**In `EventsPanel.tsx` (and `BudgetItemsPanel.tsx`):**
- Before calling update/delete action, write to `db.syncQueue` first
- If write succeeds but network is offline, don't call action (queue is the source of truth)
- If network is online, call action immediately, then update queue only on server response

**In `TripPage.tsx`:**
- On mount, if online: `await syncQueue()` automatically
- Add "🔄 Sync Now" button in offline bar (calls `syncQueue()` manually)
- Monitor for `online`/`offline` events, call `syncQueue()` when coming online

**New Sync Status Panel:**
- Shows "Syncing..." while in flight
- Lists queued items with "Pending", "Retrying", or "Failed" status
- Per-item retry button (calls `executeSync()` for that item)
- "Retry All" button (calls `syncQueue()`)

## Conflict Resolution Flow

1. User offline, edits event (title: "Dinner" → "Lunch")
   - Change written to IndexedDB + sync queue
   - Local UI shows "Lunch" immediately

2. Meanwhile, online partner edits same event (time: "8 PM" → "7 PM")
   - Server now has: title: "Dinner", time: "7 PM"

3. User comes online
   - Sync queue tries PATCH /trips/{id}/events/{eventId} with { title: "Lunch" }
   - Server returns 409 Conflict (or just checks If-Modified-Since)
   - Sync handler sees 409, removes item from queue, shows conflict toast
   - User sees: "Event was updated online. Your offline change was overridden."
   - User can click to view the latest version (title: "Dinner", time: "7 PM")

4. User wants to re-edit locally
   - Clicks event again, manually changes title to "Lunch" again
   - New change queued and synced normally

## Edge Cases

**Rapid offline edits (same resource)**:
- User edits event 3x while offline
- Sync queue keeps only latest (compound key prevents duplicates)
- On sync, only last version is sent
- ✓ Correct behavior: remote version reflects all local edits squashed

**Sync queue full (many pending changes)**:
- All items are queued; sync processes one per network request
- UI shows progress ("Syncing 5 of 12...")
- No data loss; all queued until successful

**Browser closes mid-sync**:
- IndexedDB is persistent; queue survives restart
- On reopen, sync resumes where it left off
- ✓ Correct behavior: durable

## Testing

- [ ] Offline edit → sync queue writes correctly
- [ ] Online sync processes queue in order
- [ ] Successful PATCH removes item from queue
- [ ] 409 Conflict shows toast and clears queue item
- [ ] Network error retries with exponential backoff
- [ ] Retry limit exceeded keeps item queued with error message
- [ ] Multiple offline edits on same resource deduplicate
- [ ] Manual "Sync Now" button works when online
- [ ] Queue persists across browser restart

## Notes

- Sync queue processing is sequential (one request at a time) — simpler than parallel processing and safer for conflict handling
- Exponential backoff prevents hammering a flaky network
- Conflict toast is non-intrusive (toast, not modal); user can continue working
- No UI for "manual retry" of individual queue items yet (future enhancement)
