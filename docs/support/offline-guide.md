# Offline Travel Companion User Guide

**Release 10 Feature Guide**

## What is Offline Mode?

Wanderless can now work without internet! When you're traveling and connectivity is unreliable or expensive, you can use cached trip data, browse destination guides, and even make edits offline. Everything syncs automatically when you reconnect.

## Getting Started

### Automatic: App Shell Caching

Your app is automatically cached when you visit it online. Next time you open it offline, you'll see:
- The app shell (layout, navigation, theme) loads instantly
- You can access your cached trips at `/trips/offline`

**No action needed.** This happens automatically.

### Manual: Download Destinations

To browse a destination offline:

1. Visit a destination page (e.g., `/destinations/paris`)
2. Click **"📥 Download for offline"** button
3. Wait for the download to complete (shows progress % and file size)
4. You'll see **"✓ Downloaded • X MB"** when done

Now you can browse:
- **Things to Do**: Attractions with ratings, distance, hours, admission
- **Food & Drink**: Restaurants by cuisine and price range
- **Getting Around**: Airport transfers, transit options, costs
- **Day Plans**: Curated itineraries with timing

### Caching Your Trip

When you visit a trip page online, it's automatically cached. Later visits load instantly from cache, even offline.

To see your cached trips while offline:
1. Turn off internet (or go to `/trips/offline`)
2. You'll see a list of all cached trips
3. Click any trip to open it
4. All trip data loads instantly from cache

## Using Offline Mode

### Viewing Your Trip

- **Offline**: Trip loads instantly from cache, shows "Cached Trips" badge
- **Online**: Trip loads from cache first, then fetches fresh data in background (no interruption)

### Making Edits Offline

You can edit your trip while offline:
- Edit or delete events
- Add, edit, or delete budget items
- Changes are saved locally immediately

You'll see a **yellow banner at the top** showing:
- "You are offline" with pulsing indicator
- Number of pending changes (e.g., "2 pending")
- "🔄 Sync Now" button

### Syncing Your Changes

When you come back online:
1. If you edited offline, pending changes appear in the banner
2. Click **"🔄 Sync Now"** to upload changes to the server
3. Changes sync one at a time with retry logic
4. Success: Changes disappear from pending count
5. Conflict: If someone else edited the same item, their version wins (you'll see a toast notification)

**Note:** Sync can be slow on poor connections. Don't close the app while syncing.

## Managing Cache

### Check Storage

See how much cache you're using:
- Look at destination download buttons: "✓ Downloaded • 8.3 MB"
- Total storage is browser-dependent (typically 50MB–50GB)

### Refresh a Download

If you downloaded a destination >30 days ago, the button changes to **"🔄 Refresh"**:
- Click to re-download fresh data
- Old cache is deleted automatically
- New data replaces it

### Delete a Download

To free up space:
1. On destination page, click **"🗑️"** button next to download status
2. Cached data is deleted immediately
3. Next time you visit, you can download again

### Clear Everything

To delete all cached trips and destinations:
1. Go to `/trips/offline`
2. Scroll to bottom
3. Click **"Clear All Cached Data"** button
4. Confirm in dialog
5. All offline cache is wiped (can't be undone)

## Troubleshooting

### "Download destination to browse offline"

**Problem**: City Guides tab shows this message.

**Solution**: You need to download the destination first.
1. Click the link or go back
2. Click "📥 Download for offline" on destination page
3. Wait for download to complete
4. Come back to City Guides

### "Sync Now button not appearing"

**Problem**: You made offline edits but no sync button appears.

**Reasons**:
- You're already online (auto-sync may have already completed)
- Changes were already synced automatically
- Page hasn't detected the change yet (refresh page)

**Solution**: Refresh the page or turn internet off/on to force detection.

### "My changes disappeared!"

**Problem**: You edited offline, but the changes are gone.

**Possible reasons**:
1. **Conflict**: Someone else edited the same item online. Remote version won (you'll see a toast). This is intentional to prevent data corruption.
2. **Sync failed**: Check the "You are offline" banner for error messages
3. **Browser crashed**: Cached data should be recovered on page reload

**What to do**:
- If conflict: Manually re-edit the item online
- If sync failed: Click "🔄 Sync Now" to retry
- If data lost: Contact support (offline sync is durable in this release)

### "Storage quota exceeded"

**Problem**: Download fails or says "Not enough space. Remove other destinations?"

**Solution**:
1. Delete some cached destinations: Click "🗑️" on destination pages
2. Or clear everything: `/trips/offline` → "Clear All"
3. Try downloading again

**Note**: Storage limits vary by browser and device.

### Service Worker Not Registering

**Problem**: Service Worker icon in DevTools shows "unregistered" or red X.

**Solution**:
1. Make sure you're on HTTPS (required for Service Workers)
2. Check browser console for errors
3. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
4. Wait 30 seconds for Service Worker to activate

**Check if it worked**:
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Service Workers" on left
4. You should see "tih-offline active and running"

## Best Practices

### Before Traveling

1. **Download your destinations**: Visit each destination page and download for offline
2. **Visit your trips**: Open each trip online so the entire trip is cached
3. **Check storage**: Make sure you have enough space (check Settings > Storage)

### While Traveling (Offline)

1. **Make quick edits**: Add notes to events, adjust budget, etc.
2. **Browse guides**: Use City Guides (Things to Do, Food, Transit, Day Plans)
3. **Don't create trips**: Trip creation requires the database (only works online)

### After Traveling (Online)

1. **Sync your changes**: Click "🔄 Sync Now" if banner appears
2. **Clear cache**: Delete downloaded destinations you won't need again
3. **Check for conflicts**: Review any conflict toasts that appeared

## Technical Details

### How App Shell Caching Works

The app uses a Service Worker to cache your app's interface:
- When you load the app, the Service Worker intercepts requests
- Your layout, components, and styling are cached
- Offline, these are loaded from cache instead of the network
- Updates happen automatically when you reconnect

### How Trip Caching Works

Trip data is stored in your browser's IndexedDB (local database):
- When you visit a trip online, all data (stops, events, bookings, budget) is saved locally
- Next visit, data loads from IndexedDB first (instant), then fetches fresh in background
- Offline, data loads from IndexedDB only

### How Destination Caching Works

Destination caches are stored separately in IndexedDB:
- You must explicitly download a destination
- Download includes climate data, attractions, restaurants, transit routes
- Timestamp tracks when it was cached
- >30 days old? Click "🔄 Refresh" to re-download

### How Sync Works

Offline edits are queued and played back when online:
1. Edit offline → change written to local queue
2. Come online → sync starts automatically (or click "🔄 Sync Now")
3. Queue items sent to server one at a time
4. On transient network error → automatic retry with delay (1s, 2s, 4s, 8s)
5. On conflict (409/403) → remote version wins, you see a toast
6. On success → removed from queue

## Limitations

**What works offline:**
- ✓ View cached trips
- ✓ Browse destination guides
- ✓ Edit events, budget items
- ✓ Make offline changes (synced when online)

**What doesn't work offline:**
- ✗ Create new trips (requires database)
- ✗ Change trip dates (requires database sync)
- ✗ Share trips or invite collaborators
- ✗ Search for flights/hotels (API-only)

**Browser support:**
- Chrome, Firefox, Safari, Edge (all recent versions)
- iOS Safari: 50MB limit, app-level quota
- Private/Incognito: IndexedDB not available

## FAQs

**Q: Is my offline data secure?**
A: Offline data is stored in your browser's local cache. It's not encrypted. If someone accesses your device, they can see cached trip data.

**Q: How much data can I cache?**
A: Typically 50MB–50GB depending on your browser and device. Each destination is ~8MB, each trip ~500KB.

**Q: Can I share offline data?**
A: Not yet. Sharing works online only. This is a future enhancement.

**Q: Does offline mode use my data plan?**
A: No. When truly offline, no data is sent or received. Service Worker transparently serves cached content.

**Q: What if I never delete my cache?**
A: It stays there forever (until you clear browser data). No automatic cleanup yet. Future release will add automatic cleanup.

**Q: Can I access offline data on multiple devices?**
A: No. Each device's browser has its own cache. Data syncs to the server (online), but each device maintains separate offline storage.

## Getting Help

- **Service Worker issues**: Check DevTools > Application > Service Workers
- **Storage issues**: DevTools > Application > Storage > IndexedDB > tih-offline
- **Sync issues**: Check "You are offline" banner for error messages
- **Still stuck?**: Contact support with:
  - Browser and OS version
  - Steps to reproduce
  - Screenshot of error messages
