"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/trips", label: "Trips" },
  { href: "/compare", label: "Compare destinations" },
  { href: "/destinations", label: "Destination catalog" },
  { href: "/sources", label: "Data & sources" },
];

export function ClientNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-1.5 text-[13.5px] whitespace-nowrap transition-colors ${
              active
                ? "bg-accent-soft font-medium text-accent"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
