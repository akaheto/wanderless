"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const LINKS = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/trips", label: "Trips" },
  { href: "/compare", label: "Compare destinations" },
  { href: "/destinations", label: "Destination catalog" },
  { href: "/sources", label: "Data & sources" },
  { href: "/help", label: "Help & guides" },
];

const ADMIN_LINKS = [
  { href: "/admin/suggestions", label: "City suggestions", exact: false },
  { href: "/admin/users", label: "Users", exact: false },
  { href: "/admin/audit", label: "Audit log", exact: false },
];

interface ClientNavLinksProps {
  showAdminLinks?: boolean;
}

export function ClientNavLinks({ showAdminLinks = false }: ClientNavLinksProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close menu when pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div ref={menuRef} className="relative">
      {/* Hamburger button - visible only on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-md text-ink-2 hover:bg-surface-2 transition-colors"
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        {/* Hamburger icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Mobile dropdown menu - visible only when open on mobile */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 md:hidden bg-surface-1 border border-line rounded-md shadow-lg z-50">
          <nav className="flex flex-col">
            {LINKS.map((link) => {
              const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-4 py-3 text-[13.5px] transition-colors border-b border-line ${
                    active
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {showAdminLinks && (
              <>
                <div className="border-t border-line px-4 py-2">
                  <div className="text-[11px] font-semibold text-ink-3 uppercase tracking-wide">Admin</div>
                </div>
                {ADMIN_LINKS.map((link) => {
                  const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`px-4 py-3 text-[13.5px] transition-colors border-b border-line last:border-b-0 ${
                        active
                          ? "bg-accent-soft font-medium text-accent"
                          : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>
      )}

      {/* Desktop horizontal nav - hidden on mobile */}
      <nav className="hidden md:flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
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
        {showAdminLinks && (
          <>
            <div className="hidden lg:block border-t border-line my-2" />
            <div className="hidden lg:block px-3 py-1.5">
              <div className="text-[11px] font-semibold text-ink-3 uppercase tracking-wide">Admin</div>
            </div>
            {ADMIN_LINKS.map((link) => {
              const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 hidden lg:block rounded-md px-3 py-1.5 text-[13.5px] whitespace-nowrap transition-colors ${
                    active
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );
}
