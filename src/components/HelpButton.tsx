'use client';

import Link from 'next/link';

/**
 * Help button (?) that links to the user guide.
 * Positioned in the header for quick access to documentation.
 */
export function HelpButton() {
  return (
    <Link
      href="/help"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-2 transition-colors"
      title="View user guide (opens in new tab)"
      aria-label="Help: user guide"
    >
      <span className="text-sm font-semibold text-ink-2">?</span>
    </Link>
  );
}
