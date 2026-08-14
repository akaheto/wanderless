'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { OfflineProvider } from '@/lib/offline/context';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ServiceWorkerRegistry } from '@/components/ServiceWorkerRegistry';

interface RootLayoutClientProps {
  children: React.ReactNode;
  navLinks: React.ReactNode;
  themeToggle: React.ReactNode;
}

export function RootLayoutClient({ children, navLinks, themeToggle }: RootLayoutClientProps) {
  return (
    <OfflineProvider>
      <ServiceWorkerRegistry />
      <OfflineBanner />
      <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="border-b border-line bg-surface-1 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block">
            <Link href="/" className="block hover:opacity-80 transition-opacity">
              <Logo size="sm" />
            </Link>
            <div className="lg:hidden">
              {themeToggle}
            </div>
          </div>

          {navLinks}

          <div className="hidden px-4 py-4 lg:block">
            {themeToggle}
          </div>
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>
      </div>
    </OfflineProvider>
  );
}
