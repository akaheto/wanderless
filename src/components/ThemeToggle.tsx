"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

/**
 * The theme lives in localStorage and on <html data-theme>, both of which are outside
 * React. useSyncExternalStore is the right shape for that: it reads the real value on
 * the client and returns "system" during server render, so there is nothing to correct
 * in an effect afterwards.
 */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changing the theme should update this one too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): Theme {
  const stored = localStorage.getItem("tih-theme");
  return stored === "light" || stored === "dark" ? stored : "system";
}

const getServerSnapshot = (): Theme => "system";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function apply(next: Theme) {
    if (next === "system") {
      localStorage.removeItem("tih-theme");
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem("tih-theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }
    notify();
  }

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="inline-flex rounded-md border border-line bg-surface-2 p-0.5 text-[12px]"
    >
      {(["light", "system", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => apply(option)}
          aria-pressed={theme === option}
          className={`rounded px-2 py-1 capitalize transition-colors ${
            theme === option ? "bg-accent-soft font-medium text-accent" : "text-ink-3 hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
