'use client';

import { useOffline } from '@/lib/offline/context';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const { isOnline, isSyncing, queuedItems, syncNow } = useOffline();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(!isOnline);
  }, [isOnline]);

  if (showBanner && !isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-100 border-b border-yellow-300 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-yellow-900">
              {isSyncing ? 'Syncing changes...' : 'You are offline'}
              {queuedItems.length > 0 && ` (${queuedItems.length} pending)`}
            </span>
          </div>
          {!isSyncing && queuedItems.length > 0 && (
            <button
              onClick={syncNow}
              className="text-sm font-medium text-yellow-900 hover:text-yellow-800 underline"
            >
              Sync Now
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
