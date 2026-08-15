import Link from "next/link";
import type { Confidence, DataWarning, PlanningStatus, Season, Tier } from "@/lib/domain/types";
import { PLANNING_STATUS_LABELS } from "@/lib/domain/types";

export function PageHeader({
  title,
  lede,
  actions,
  breadcrumb,
}: {
  title: string;
  lede?: string;
  actions?: React.ReactNode;
  breadcrumb?: { href: string; label: string };
}) {
  return (
    <header className="mb-7">
      {breadcrumb && (
        <Link
          href={breadcrumb.href}
          className="mb-2 inline-block text-[13px] text-ink-3 hover:text-accent"
        >
          ← {breadcrumb.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {lede && <p className="mt-1.5 max-w-[62ch] text-[14px] text-ink-2">{lede}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`rounded-lg border border-line bg-surface-1 ${className}`}>{children}</Tag>
  );
}

export function CardHeader({
  title,
  note,
  right,
}: {
  title: string;
  note?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
      <div>
        <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
        {note && <p className="mt-0.5 text-[12.5px] text-ink-3">{note}</p>}
      </div>
      {right}
    </div>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors disabled:opacity-50";

const BUTTON_VARIANTS = {
  primary: "bg-accent text-white hover:opacity-90",
  secondary: "border border-line-strong bg-surface-2 hover:bg-surface-0",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "border border-line-strong bg-surface-2 text-critical hover:bg-surface-0",
} as const;

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  className = "",
  href,
  children,
}: {
  variant?: keyof typeof BUTTON_VARIANTS;
  className?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[12.5px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="text-[14px] font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-[13px] text-ink-2">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "good" | "warning" | "serious" | "critical";
}) {
  const tones = {
    neutral: "border-line-strong text-ink-2",
    accent: "border-transparent bg-accent-soft text-accent",
    good: "border-transparent text-white",
    warning: "border-transparent text-black",
    serious: "border-transparent text-white",
    critical: "border-transparent text-white",
  } as const;
  const backgrounds: Partial<Record<typeof tone, string>> = {
    good: "var(--good)",
    warning: "var(--warning)",
    serious: "var(--serious)",
    critical: "var(--critical)",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${tones[tone]}`}
      style={backgrounds[tone] ? { background: backgrounds[tone] } : undefined}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<PlanningStatus, Parameters<typeof Badge>[0]["tone"]> = {
  idea: "neutral",
  comparing: "accent",
  destination_selected: "accent",
  flights_booked: "good",
  hotels_booked: "good",
  itinerary: "good",
  ready: "good",
  completed: "neutral",
};

export function StatusBadge({ status }: { status: PlanningStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{PLANNING_STATUS_LABELS[status]}</Badge>;
}

export function SeasonBadge({ season }: { season: Season }) {
  const map = { peak: "serious", shoulder: "accent", low: "neutral" } as const;
  return <Badge tone={map[season]}>{season} season</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const map = { high: "good", medium: "warning", low: "critical" } as const;
  return <Badge tone={map[confidence]}>{confidence} confidence</Badge>;
}

/**
 * Marks which epistemic tier a number came from. Present wherever objective, curated
 * and personal figures sit next to each other, so it is always clear whether you are
 * reading a measurement or a judgement.
 */
export function TierMark({ tier }: { tier: Tier }) {
  const label = { objective: "measured", curated: "curated", personal: "yours" }[tier];
  const title = {
    objective: "Measured — from a named external source with a fetch date",
    curated: "Curated — an editorial judgement shipped with the app",
    personal: "Yours — something you entered",
  }[tier];

  return (
    <span
      title={title}
      className="rounded border border-line px-1 py-px text-[10px] tracking-wide text-ink-3 uppercase"
    >
      {label}
    </span>
  );
}

/**
 * How old a fact is *at its source*, next to the source's name.
 *
 * The date shown is always the source's own — when the publisher last revised the
 * fact — never when we fetched it. Those differ, and conflating them is how stale data
 * comes to look fresh: a State Department advisory last revised in 2024 would otherwise
 * render as "verified today" simply because the feed was read this morning.
 *
 * An old date is not automatically a problem. Climate normals are drawn from a decade
 * of observations, and an advisory untouched for two years describes a stable country.
 * `staleAfterDays` is therefore per-source, and only past it does the age draw attention.
 */
export function DataAge({
  source,
  sourceDate,
  asOf,
  staleAfterDays,
  label = "revised",
}: {
  source: string;
  /** ISO date (YYYY-MM-DD) the source last revised this fact. */
  sourceDate: string;
  /**
   * The clock this age is measured against, supplied by the caller.
   *
   * Passed in rather than read from `Date.now()` here: reading the clock during render
   * is impure, and it would make the component untestable for exactly the reason
   * `checkStaleness` takes its own `asOf` — every assertion would change meaning as the
   * calendar advanced.
   */
  asOf: string;
  /** Age past which this particular source should be re-read. Omit for none. */
  staleAfterDays?: number;
  /** Verb describing what the date represents, e.g. "revised", "measured". */
  label?: string;
}) {
  const parsed = Date.parse(sourceDate);
  const now = Date.parse(asOf);

  if (Number.isNaN(parsed) || Number.isNaN(now)) {
    return (
      <span className="text-[11px] text-ink-3">
        {source} · <span className="text-warning">undated</span>
      </span>
    );
  }

  const days = Math.max(0, Math.floor((now - parsed) / 86_400_000));
  const age =
    days < 1
      ? "today"
      : days < 30
        ? `${days}d ago`
        : days < 365
          ? `${Math.floor(days / 30)}mo ago`
          : `${(days / 365).toFixed(days < 730 ? 1 : 0)}y ago`;

  const stale = staleAfterDays !== undefined && days > staleAfterDays;

  return (
    <span className="text-[11px] text-ink-3">
      {source} · {label} {sourceDate} ·{" "}
      <span className={stale ? "font-medium text-warning" : ""}>
        {/* Staleness is carried by colour, so it is also stated for screen readers. */}
        {stale && <span className="sr-only">Stale: </span>}
        {age}
      </span>
    </span>
  );
}

/**
 * Where a section's data came from — a build-time overlay, not a permanent surface.
 *
 * The catalog mixes measured data with editorial judgement and renders both identically.
 * A destination card shows climate normals drawn from ERA5 next to a nightlife score
 * somebody typed, and nothing distinguishes them. That is how a fabricated hotel price
 * survives review: it looks exactly like a measured one.
 *
 *   sourced     a named external source, with the date it published
 *   derived     computed from sourced data by a deterministic rule
 *   unverified  editorial judgement nobody has confirmed — marked, and meant to be
 *   missing     the section has no data at all
 *
 * `sourced` renders quietly and `derived` almost as quietly, so a mark means something.
 * A card with no amber on it is the goal state, and should be visibly reachable.
 *
 * Controlled by NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY so it can be switched off in one
 * place once the catalog no longer needs it.
 */
export type FieldStatus = "sourced" | "derived" | "unverified" | "missing";

export function overlayEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY === "1";
}

export function Provenance({
  status,
  source,
  sourceDate,
  asOf,
  note,
}: {
  status: FieldStatus;
  /** Who published it. Required for `sourced`, meaningless for `unverified`. */
  source?: string;
  /** ISO date the source last revised it — never our fetch date. */
  sourceDate?: string;
  /** Clock to measure age against, so nothing impure is read during render. */
  asOf?: string;
  note?: string;
}) {
  if (!overlayEnabled()) return null;

  if (status === "sourced" && source && sourceDate && asOf) {
    return <DataAge source={source} sourceDate={sourceDate} asOf={asOf} label="measured" />;
  }

  if (status === "sourced" || status === "derived") {
    return (
      <span className="text-[11px] text-ink-3">
        {status === "derived" ? "derived" : "measured"}
        {source ? ` · ${source}` : ""}
        {note ? ` · ${note}` : ""}
      </span>
    );
  }

  // Unverified and missing are the ones worth looking at, so they carry weight — and
  // say so in words, never by colour alone.
  const label = status === "missing" ? "no data" : "unverified";
  const detail =
    note ?? (status === "missing" ? "nothing recorded" : "editorial judgement, unconfirmed");

  return (
    <span
      title={detail}
      className="inline-flex items-center gap-1 rounded border border-warning/50 px-1.5 py-px text-[10.5px] font-medium tracking-wide text-warning uppercase"
    >
      <span aria-hidden>△</span>
      {label}
      <span className="sr-only"> — {detail}</span>
    </span>
  );
}

const WARNING_DOT: Record<DataWarning["severity"], string> = {
  serious: "var(--serious)",
  warning: "var(--warning)",
  info: "var(--border-strong)",
};

const WARNING_PREFIX: Record<DataWarning["severity"], string> = {
  serious: "Problem: ",
  warning: "Warning: ",
  info: "Note: ",
};

export function Warnings({ warnings }: { warnings: DataWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {warnings.map((w, i) => (
        <li key={i} className="flex gap-2 text-[12.5px] text-ink-2">
          <span
            aria-hidden
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: WARNING_DOT[w.severity] }}
          />
          <span>
            {/* Severity is carried by colour, so it is also stated for screen readers. */}
            <span className="sr-only">{WARNING_PREFIX[w.severity]}</span>
            <span className={w.severity === "info" ? "" : "font-medium text-ink"}>{w.label}</span>
            {w.detail && <span className="block text-ink-3">{w.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------

/** A 0-100 score as a bar. Always paired with its number — colour never carries the value alone. */
export function ScoreBar({
  score,
  label,
  width = 90,
  showValue = true,
}: {
  score: number;
  label?: string;
  width?: number;
  showValue?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="relative inline-block h-1.5 shrink-0 overflow-hidden rounded-full"
        style={{ width, background: "var(--surface-sunken)" }}
        role="img"
        aria-label={`${label ? `${label}: ` : ""}${score} out of 100`}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.max(2, score)}%`, background: scoreColor(score) }}
        />
      </span>
      {showValue && <span className="tnum text-[12.5px] text-ink-2">{score}</span>}
    </span>
  );
}

/**
 * Score colour is a *status* encoding, not a series colour: it says how good a number
 * is, and always appears beside the number itself.
 */
export function scoreColor(score: number): string {
  if (score >= 78) return "var(--good)";
  if (score >= 62) return "var(--seq-3)";
  if (score >= 48) return "var(--warning)";
  if (score >= 35) return "var(--serious)";
  return "var(--critical)";
}

export function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 px-2.5 py-2 sm:px-3.5 sm:py-3">
      <div className="text-[10px] sm:text-[11.5px] tracking-wide text-ink-3 uppercase">{label}</div>
      <div
        className="tnum mt-1 text-[18px] sm:text-[21px] leading-tight font-semibold tracking-tight"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] sm:text-[12.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function money(usd: number): string {
  return `$${Math.round(usd).toLocaleString("en-US")}`;
}
